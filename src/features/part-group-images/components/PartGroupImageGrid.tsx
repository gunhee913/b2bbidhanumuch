"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ImageOff, Trash2, Upload } from "lucide-react";
import { getPartGroupOrder } from "@/features/live-auction/lib/partGrouping";
import { uploadPartGroupImageFile, type PartGroupImageScope } from "../api";
import {
  useDeletePartGroupImage,
  usePartGroupImages,
  useUpsertPartGroupImage,
} from "../hooks/usePartGroupImages";
import type { PartGroupImage } from "../types";

export const PART_IMAGE_MAX_FILE_MB = 5;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("파일을 읽을 수 없습니다."));
    reader.readAsDataURL(file);
  });
}

/** 한 대상(업체 또는 전체 기본)의 부위별 사진을 부위 순서로 · 업체면 전체 기본도 같이 */
export function usePartGroupImageSets(companyId: string | null) {
  const query = usePartGroupImages();
  const groups = getPartGroupOrder();
  const sets = useMemo(() => {
    const own = new Map<string, PartGroupImage>();
    const def = new Map<string, PartGroupImage>();
    for (const img of query.data?.images ?? []) {
      if (img.companyId === null) def.set(img.groupName, img);
      // 대상이 전체 기본(null)이면 기본 사진이 곧 「제 것」 · else if 로 묶으면 전체 기본 화면이 늘 미등록으로 보인다
      if (img.companyId === companyId) own.set(img.groupName, img);
    }
    return { ownByGroup: own, defaultByGroup: def };
  }, [query.data, companyId]);
  const registeredCount = groups.filter((g) => sets.ownByGroup.has(g)).length;
  return { ...query, ...sets, groups, registeredCount };
}

/**
 * 부위 대표이미지 카드 격자 · 관리자 설정 페이지와 업체 설정 페이지가 같이 쓴다.
 *
 * 다른 건 **누가 어느 자리를 고치느냐**뿐이다. 관리자는 업체를 골라 가며 전체 기본까지
 * 만지고, 업체는 제 것 한 벌만 본다. 카드 자체는 같아야 한다 — 관리자가 업체 화면을
 * 봐 주며 설명할 때 둘이 다르게 생겼으면 말이 어긋난다.
 */
export function PartGroupImageGrid({
  companyId,
  scope,
}: {
  /** null = 전체 기본(관리자만) */
  companyId: string | null;
  scope: PartGroupImageScope;
}) {
  const { isLoading, groups, ownByGroup, defaultByGroup } =
    usePartGroupImageSets(companyId);

  if (isLoading) {
    return (
      <div className="rounded border border-gray-200 bg-white px-4 py-12 text-center text-xs text-gray-400">
        불러오는 중...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {groups.map((group) => (
        <PartImageCard
          key={`${companyId ?? "default"}-${group}`}
          scope={scope}
          companyId={companyId}
          groupName={group}
          own={ownByGroup.get(group) ?? null}
          fallback={companyId ? (defaultByGroup.get(group) ?? null) : null}
        />
      ))}
    </div>
  );
}

function PartImageCard({
  scope,
  companyId,
  groupName,
  own,
  fallback,
}: {
  scope: PartGroupImageScope;
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
  const upsert = useUpsertPartGroupImage(scope);
  const del = useDeletePartGroupImage(scope);
  const busy = uploading || upsert.isPending || del.isPending;
  const shown = own ?? fallback;
  const usingFallback = !own && !!fallback;
  /* 업체 화면에서는 「업체 전용」 이라는 말이 군더더기다 · 거기선 제 것이 전부다 */
  const ownNoun =
    scope === "company" ? "우리 업체" : companyId ? "업체 전용" : "전체 기본";

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setErrorMsg(null);
    if (!file.type.startsWith("image/")) {
      setErrorMsg("이미지 파일만 등록할 수 있습니다.");
      return;
    }
    if (file.size > PART_IMAGE_MAX_FILE_MB * 1024 * 1024) {
      setErrorMsg(
        `${PART_IMAGE_MAX_FILE_MB}MB 이하 파일만 등록할 수 있습니다.`,
      );
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
    if (!confirm(`${groupName} ${ownNoun} 대표이미지를 삭제할까요?`)) return;
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
                  ? `${ownNoun} 등록`
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
                ? `${ownNoun} 사진 없음 · 전체 기본`
                : "등록된 이미지 없음"}
          </div>
        </div>
        {own ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-600 disabled:opacity-40"
            title={companyId ? "삭제 (전체 기본으로 돌아감)" : "삭제"}
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
