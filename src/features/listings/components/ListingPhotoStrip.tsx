"use client";

import { useRef, type ChangeEvent } from "react";
import { Loader2, Star, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAX_LISTING_PHOTOS } from "../lib/listingPhotos";

export interface ListingPhotoStripProps {
  images: string[];
  uploading: boolean;
  onUpload: (files: File[]) => void;
  onRemove: (index: number) => void;
  /** 그 장을 맨 앞(대표)으로 옮긴다 */
  onSetCover: (index: number) => void;
  onView: (src: string) => void;
}

/**
 * 상장등록 폼의 개체 사진 줄 · 썸네일 + 업로드 칸.
 *
 * 첫 장이 대표(메인)다 — 상세 방·요약·선택기가 전부 `images[0]` 을 쓴다. 다른 장의 별을
 * 누르면 그 장이 맨 앞으로 와서 대표가 된다. 대표를 지우면 다음 장이 그대로 대표가 된다.
 */
export function ListingPhotoStrip({
  images,
  uploading,
  onUpload,
  onRemove,
  onSetCover,
  onView,
}: ListingPhotoStripProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const canAdd = images.length < MAX_LISTING_PHOTOS;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    /* `FileList` 는 살아 있는 객체 · 입력칸을 비우기 전에 배열로 떠서 넘긴다 */
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length > 0) onUpload(files);
  };

  return (
    <>
      <span className="text-xs font-medium text-gray-600">사진:</span>
      <span className="text-[10px] text-gray-400">
        ({images.length}/{MAX_LISTING_PHOTOS})
      </span>
      {images.map((src, index) => {
        const isCover = index === 0;
        return (
          <div
            key={`${src}-${index}`}
            className={cn(
              "group relative h-14 w-14 overflow-hidden border bg-gray-50",
              isCover
                ? "border-gray-700 ring-1 ring-gray-700"
                : "border-gray-200",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={isCover ? "대표 사진" : `사진 ${index + 1}`}
              className="h-full w-full cursor-pointer object-cover hover:opacity-80"
              onClick={() => onView(src)}
            />
            {isCover ? (
              <span className="pointer-events-none absolute bottom-0 left-0 bg-gray-700 px-1 py-[1px] text-[9px] font-semibold leading-none text-white">
                대표
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onSetCover(index)}
                title="대표 사진으로"
                aria-label={`${index + 1}번째 사진을 대표로`}
                className="absolute bottom-0 left-0 flex h-4 w-4 items-center justify-center bg-black/55 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100 focus-visible:opacity-100"
              >
                <Star className="h-2.5 w-2.5" strokeWidth={2.5} />
              </button>
            )}
            <button
              type="button"
              onClick={() => onRemove(index)}
              aria-label={`${index + 1}번째 사진 삭제`}
              className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center bg-gray-700 text-white hover:bg-gray-800"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        );
      })}
      {canAdd ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex h-14 w-14 flex-col items-center justify-center border border-dashed border-gray-300 bg-white text-gray-400 transition-colors hover:border-gray-500 hover:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" />
                <span className="mt-0.5 text-[9px]">업로드</span>
              </>
            )}
          </button>
        </>
      ) : null}
    </>
  );
}
