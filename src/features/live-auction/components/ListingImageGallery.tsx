"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

export type GalleryAspect = "square" | "video" | "photo";

const ASPECT_CLASS: Record<GalleryAspect, string> = {
  square: "aspect-square",
  video: "aspect-video",
  photo: "aspect-[4/3]",
};

export interface ListingImageGalleryProps {
  images: string[];
  listingNo: string;
  className?: string;
  /**
   * 메인 이미지 비율.
   * - `square` (기본, 개체별 뷰): 1:1 정사각
   * - `video`: 16:9 · 오른쪽 컴팩트 컬럼용 (부위별 뷰)
   * - `photo`: 4:3
   */
  aspect?: GalleryAspect;
  /**
   * 메인 이미지의 object-fit 방식.
   * - `cover` (기본): 프레임을 채움 · 크롭 발생
   * - `contain`: 이미지 온전히 표시 · letterbox 여백 발생
   */
  mainFit?: "cover" | "contain";
  /**
   * `true` 이면 하단 썸네일을 고정 크기 (56×56) 로 컴팩트하게 표시.
   * 좁은 컬럼(부위별 오른쪽 상세) 에서 사용.
   */
  compactThumbs?: boolean;
}

/**
 * Trading Desk 스타일 이미지 갤러리.
 * - 메인 이미지 비율은 `aspect` prop 으로 선택
 * - 썸네일은 하단 가로 스트립 (최대 4개)
 * - 실 이미지가 없으면 picsum 시드 이미지 fallback + Sample 라벨
 */
export function ListingImageGallery({
  images,
  listingNo,
  className,
  aspect = "square",
  mainFit = "cover",
  compactThumbs = false,
}: ListingImageGalleryProps) {
  const hasImages = images && images.length > 0;
  const displayImages = hasImages
    ? images
    : [
        `https://picsum.photos/seed/${encodeURIComponent(listingNo)}-1/720/720`,
        `https://picsum.photos/seed/${encodeURIComponent(listingNo)}-2/720/720`,
      ];

  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    setActiveIdx(0);
  }, [listingNo]);

  const activeSrc =
    displayImages[Math.min(activeIdx, displayImages.length - 1)] ??
    displayImages[0];

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        className={cn(
          "relative w-full overflow-hidden ring-1 ring-slate-200",
          ASPECT_CLASS[aspect],
          mainFit === "contain" ? "bg-slate-50" : "bg-slate-100",
        )}
      >
        {activeSrc ? (
          <Image
            src={activeSrc}
            alt={`${listingNo} 상장 이미지`}
            fill
            sizes="(max-width: 1280px) 40vw, 400px"
            className={cn(
              mainFit === "contain" ? "object-contain" : "object-cover",
            )}
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300">
            <ImageOff className="h-10 w-10" />
          </div>
        )}
        {!hasImages ? (
          <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
            Sample
          </div>
        ) : null}
        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
          <span className="tabular-nums">
            {Math.min(activeIdx + 1, displayImages.length)}
          </span>
          <span className="text-white/60">/</span>
          <span className="tabular-nums">{displayImages.length}</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {displayImages.slice(0, 4).map((src, idx) => (
          <button
            key={`${src}-${idx}`}
            type="button"
            onClick={() => setActiveIdx(idx)}
            className={cn(
              "relative aspect-square overflow-hidden ring-1 transition-all",
              compactThumbs ? "h-14 w-14 shrink-0" : "flex-1",
              idx === activeIdx
                ? "ring-2 ring-sky-500"
                : "ring-slate-200 hover:ring-slate-300 opacity-70 hover:opacity-100",
            )}
          >
            <Image
              src={src}
              alt={`${listingNo} thumbnail ${idx + 1}`}
              fill
              sizes="80px"
              className="object-cover"
              unoptimized
            />
          </button>
        ))}
        {displayImages.length < 4
          ? Array.from({ length: 4 - displayImages.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className={cn(
                  "aspect-square bg-slate-50 ring-1 ring-slate-100",
                  compactThumbs ? "h-14 w-14 shrink-0" : "flex-1",
                )}
                aria-hidden
              />
            ))
          : null}
      </div>
    </div>
  );
}
