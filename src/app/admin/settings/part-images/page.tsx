'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { ImageOff, Trash2, Upload } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { getPartGroupOrder } from '@/features/live-auction/lib/partGrouping';
import { uploadPartGroupImageFile } from '@/features/part-group-images/api';
import {
  useDeletePartGroupImage,
  usePartGroupImages,
  useUpsertPartGroupImage,
} from '@/features/part-group-images/hooks/usePartGroupImages';

const MAX_FILE_MB = 5;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
    reader.readAsDataURL(file);
  });
}

/**
 * 부위 대표이미지 설정.
 * 라이브 경매 좌측 사이드바 · 부위별 탭 사진 모드에서 각 부위 카드에 쓰이는 사진을 관리한다.
 * 상장(개체) 사진은 등심 단면 1장만 올라오므로 부위 사진은 여기서 별도 등록.
 */
export default function PartImagesPage() {
  const { data, isLoading } = usePartGroupImages();
  const groups = getPartGroupOrder();
  const imageByGroup = new Map(
    (data?.images ?? []).map((img) => [img.groupName, img] as const),
  );
  const registeredCount = groups.filter((g) => imageByGroup.has(g)).length;

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">부위 대표이미지 설정</h1>
            <p className="mt-1 text-xs text-gray-500">
              실시간 경매 페이지 좌측 부위별 탭의 사진 모드에 노출되는 부위별 대표 사진입니다.
              등록되지 않은 부위는 빈 이미지로 표시됩니다. 권장 비율 4:3 · {MAX_FILE_MB}MB 이하.
            </p>
          </div>
          <span className="text-xs tabular-nums text-gray-500">
            등록 <span className="font-semibold text-gray-900">{registeredCount}</span> /{' '}
            {groups.length}
          </span>
        </div>

        {isLoading ? (
          <div className="rounded border border-gray-200 bg-white px-4 py-12 text-center text-xs text-gray-400">
            불러오는 중...
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {groups.map((group) => (
              <PartImageCard
                key={group}
                groupName={group}
                imageUrl={imageByGroup.get(group)?.imageUrl ?? null}
                updatedAt={imageByGroup.get(group)?.updatedAt ?? null}
              />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function PartImageCard({
  groupName,
  imageUrl,
  updatedAt,
}: {
  groupName: string;
  imageUrl: string | null;
  updatedAt: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const upsert = useUpsertPartGroupImage();
  const del = useDeletePartGroupImage();
  const busy = uploading || upsert.isPending || del.isPending;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setErrorMsg(null);
    if (!file.type.startsWith('image/')) {
      setErrorMsg('이미지 파일만 등록할 수 있습니다.');
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
      await upsert.mutateAsync({ groupName, imageUrl: url });
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '등록에 실패했습니다.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!confirm(`${groupName} 대표이미지를 삭제할까요?`)) return;
    setErrorMsg(null);
    try {
      await del.mutateAsync(groupName);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '삭제에 실패했습니다.');
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
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={`${groupName} 대표이미지`}
            fill
            sizes="300px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <span className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-gray-400">
            <ImageOff className="h-7 w-7" strokeWidth={1.5} />
            <span className="text-[11px]">미등록</span>
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
          <span className="inline-flex items-center gap-1 text-xs font-semibold">
            <Upload className="h-3.5 w-3.5" />
            {busy ? '처리 중...' : imageUrl ? '교체' : '등록'}
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
          <div className="truncate text-sm font-semibold text-gray-900">{groupName}</div>
          <div className="mt-0.5 text-[11px] text-gray-400">
            {updatedAt
              ? `수정 ${new Date(updatedAt).toLocaleDateString('ko-KR')}`
              : '등록된 이미지 없음'}
          </div>
        </div>
        {imageUrl ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-600 disabled:opacity-40"
            title="삭제"
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
