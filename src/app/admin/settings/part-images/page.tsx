"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ImageOff, Trash2, Upload } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { getPartGroupOrder } from "@/features/live-auction/lib/partGrouping";
import { useCompanies } from "@/features/companies/hooks";
import { uploadPartGroupImageFile } from "@/features/part-group-images/api";
import {
  useDeletePartGroupImage,
  usePartGroupImages,
  useUpsertPartGroupImage,
} from "@/features/part-group-images/hooks/usePartGroupImages";
import type { PartGroupImage } from "@/features/part-group-images/types";

const MAX_FILE_MB = 5;
/** <select> 의 「전체 기본」 값 · 업체 id 는 UUID 라 겹치지 않는다 */
const DEFAULT_SCOPE = "";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("파일을 읽을 수 없습니다."));
    reader.readAsDataURL(file);
  });
}

/**
 * 부위 대표이미지 설정 · 전체 기본 한 벌 + 업체별 한 벌.
 *
 * 부위 사진(상장등록 때 부위마다 올리는 것)이 없는 줄에 대신 거는 사진이다. 화면은
 * 업체 것 → 전체 기본 → 없음 순으로 찾는다. 업체를 고르면 그 업체 전용 사진을 다루고,
 * 업체 전용이 없는 부위는 전체 기본을 흐리게 보여 「지금 이게 나간다」 를 알린다.
 */
export default function PartImagesPage() {
  const { data, isLoading } = usePartGroupImages();
  const { data: companies } = useCompanies();
  const [scope, setScope] = useState<string>(DEFAULT_SCOPE);
  const companyId = scope === DEFAULT_SCOPE ? null : scope;
  const groups = getPartGroupOrder();

  const { ownByGroup, defaultByGroup } = useMemo(() => {
    const own = new Map<string, PartGroupImage>();
    const def = new Map<string, PartGroupImage>();
    for (const img of data?.images ?? []) {
      if (img.companyId === null) def.set(img.groupName, img);
      else if (img.companyId === companyId) own.set(img.groupName, img);
    }
    return { ownByGroup: own, defaultByGroup: def };
  }, [data, companyId]);
  const registeredCount = groups.filter((g) => ownByGroup.has(g)).length;
  const scopeLabel = companyId
    ? (companies?.find((c) => c.id === companyId)?.name ?? "업체")
    : "전체 기본";

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              부위 대표이미지 설정
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              부위 사진을 따로 올리지 않은 부위에 대신 보여 주는 사진입니다.
              업체 것이 없으면 전체 기본이, 그것도 없으면 빈 이미지가 나갑니다.
              권장 비율 4:3 · {MAX_FILE_MB}MB 이하.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <span className="font-medium">대상</span>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="min-w-[160px] border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none"
              >
                <option value={DEFAULT_SCOPE}>전체 기본</option>
                {(companies ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <span className="text-xs tabular-nums text-gray-500">
              {scopeLabel} 등록{" "}
              <span className="font-semibold text-gray-900">
                {registeredCount}
              </span>{" "}
              / {groups.length}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded border border-gray-200 bg-white px-4 py-12 text-center text-xs text-gray-400">
            불러오는 중...
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {groups.map((group) => (
              <PartImageCard
                key={`${scope}-${group}`}
                companyId={companyId}
                groupName={group}
                own={ownByGroup.get(group) ?? null}
                fallback={
                  companyId ? (defaultByGroup.get(group) ?? null) : null
                }
              />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function PartImageCard({
  companyId,
  groupName,
  own,
  fallback,
}: {
  companyId: string | null;
  groupName: string;
  /** 이 대상(업체 또는 전체 기본)에 등록된 사진 */
  own: PartGroupImage | null;
  /** 업체를 골랐는데 업체 것이 없을 때 대신 나가는 전체 기본 */
  fallback: PartGroupImage | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const upsert = useUpsertPartGroupImage();
  const del = useDeletePartGroupImage();
  const busy = uploading || upsert.isPending || del.isPending;
  const shown = own ?? fallback;
  const usingFallback = !own && !!fallback;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setErrorMsg(null);
    if (!file.type.startsWith("image/")) {
      setErrorMsg("이미지 파일만 등록할 수 있습니다.");
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setErrorMsg(`${MAX_FILE_MB}MB 이하 파일만 등록할 수 있습니다.`);
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const url = await uploadPartGroupImageFile(dataUrl);
      await upsert.mutateAsync({ companyId, groupName, imageUrl: url });
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "등록에 실패했습니다.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    const what = companyId
      ? `${groupName} 업체 전용 대표이미지`
      : `${groupName} 전체 기본 대표이미지`;
    if (!confirm(`${what}를 삭제할까요?`)) return;
    setErrorMsg(null);
    try {
      await del.mutateAsync({ companyId, groupName });
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "삭제에 실패했습니다.");
    }
  };

  return (
    <div className="flex flex-col overflow-hidden rounded border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="group relative aspect-[4/3] w-full overflow-hidden bg-gray-100 disabled:cursor-wait"
        title="클릭해서 이미지 등록/교체"
      >
        {shown ? (
          <Image
            src={shown.imageUrl}
            alt={`${groupName} 대표이미지`}
            fill
            sizes="300px"
            className={
              usingFallback ? "object-cover opacity-45" : "object-cover"
            }
            unoptimized
          />
        ) : (
          <span className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-gray-400">
            <ImageOff className="h-7 w-7" strokeWidth={1.5} />
            <span className="text-[11px]">미등록</span>
          </span>
        )}
        {usingFallback ? (
          <span className="pointer-events-none absolute left-2 top-2 bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            전체 기본 사용 중
          </span>
        ) : null}
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
          <span className="inline-flex items-center gap-1 text-xs font-semibold">
            <Upload className="h-3.5 w-3.5" />
            {busy
              ? "처리 중..."
              : own
                ? "교체"
                : companyId
                  ? "업체 전용 등록"
                  : "등록"}
          </span>
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-gray-900">
            {groupName}
          </div>
          <div className="mt-0.5 text-[11px] text-gray-400">
            {own?.updatedAt
              ? `수정 ${new Date(own.updatedAt).toLocaleDateString("ko-KR")}`
              : usingFallback
                ? "업체 전용 없음 · 전체 기본"
                : "등록된 이미지 없음"}
          </div>
        </div>
        {own ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-600 disabled:opacity-40"
            title={companyId ? "업체 전용 삭제 (전체 기본으로 돌아감)" : "삭제"}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      {errorMsg ? (
        <div className="border-t border-red-100 bg-red-50 px-3 py-1.5 text-[11px] text-red-600">
          {errorMsg}
        </div>
      ) : null}
    </div>
  );
}
