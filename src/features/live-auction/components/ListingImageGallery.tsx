"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageOff, Maximize2, X } from "lucide-react";
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
 * - 우하단 "전체보기" 버튼 → 풀스크린 lightbox (portal · stacking context 이탈)
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
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    setActiveIdx(0);
  }, [listingNo]);

  const activeSrc =
    displayImages[Math.min(activeIdx, displayImages.length - 1)] ??
    displayImages[0];

  const openLightbox = useCallback(() => {
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
  }, []);

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

        {/* 좌하단 · 카운터 */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
          <span className="tabular-nums">
            {Math.min(activeIdx + 1, displayImages.length)}
          </span>
          <span className="text-white/60">/</span>
          <span className="tabular-nums">{displayImages.length}</span>
        </div>

        {/* 우하단 · 전체보기 버튼 (항상 노출) */}
        {activeSrc ? (
          <button
            type="button"
            onClick={openLightbox}
            aria-label="이미지 전체보기"
            className={cn(
              "absolute bottom-2 right-2 inline-flex items-center gap-1 bg-black/60 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm transition-colors",
              "hover:bg-black/80",
            )}
          >
            <Maximize2 className="h-3 w-3" strokeWidth={2.5} />
            전체보기
          </button>
        ) : null}
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

      {lightboxOpen ? (
        <ImageLightbox
          images={displayImages}
          activeIdx={activeIdx}
          onActiveIdxChange={setActiveIdx}
          listingNo={listingNo}
          isSample={!hasImages}
          onClose={closeLightbox}
        />
      ) : null}
    </div>
  );
}

/**
 * 이미지 전체보기 lightbox.
 *
 * 렌더링 전략:
 * - `createPortal(document.body)` 로 stacking context 이탈 · 헤더/사이드바 fixed 위에 확실히 오버레이
 * - `z-[9999]` · body scroll lock
 *
 * 상호작용:
 * - Backdrop 클릭 · ESC · X 버튼 → 닫기
 * - ArrowLeft/Right · 좌/우 화살표 버튼 · 하단 썸네일 → 이미지 전환
 * - 이미지 여러 장 없으면 화살표/썸네일 미표시
 */
function ImageLightbox({
  images,
  activeIdx,
  onActiveIdxChange,
  listingNo,
  isSample,
  onClose,
}: {
  images: string[];
  activeIdx: number;
  onActiveIdxChange: (idx: number) => void;
  listingNo: string;
  isSample: boolean;
  onClose: () => void;
}) {
  const total = images.length;
  const hasMany = total > 1;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const goPrev = useCallback(() => {
    onActiveIdxChange((activeIdx - 1 + total) % total);
  }, [activeIdx, total, onActiveIdxChange]);

  const goNext = useCallback(() => {
    onActiveIdxChange((activeIdx + 1) % total);
  }, [activeIdx, total, onActiveIdxChange]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (hasMany && e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (hasMany && e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [hasMany, goPrev, goNext, onClose]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  if (!mounted) return null;

  const currentSrc = images[activeIdx] ?? images[0];

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${listingNo} 이미지 전체보기`}
      className="fixed inset-0 z-[9999] flex flex-col bg-slate-950/95 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* 상단바 · 상장번호 + 카운터 + 닫기 */}
      <header
        className="flex shrink-0 items-center justify-between px-6 py-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className="text-[15px] font-bold tabular-nums text-white">
            {listingNo}
          </span>
          {isSample ? (
            <span className="bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/70">
              Sample
            </span>
          ) : null}
          {hasMany ? (
            <span className="text-[13px] tabular-nums text-white/60">
              {activeIdx + 1} / {total}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="inline-flex h-10 w-10 items-center justify-center bg-white/5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
        >
          <X className="h-5 w-5" strokeWidth={2} />
        </button>
      </header>

      {/* 중앙 · 이미지 + 화살표 */}
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden px-6"
        onClick={onClose}
      >
        {hasMany ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            aria-label="이전 이미지"
            className="absolute left-6 top-1/2 z-10 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center bg-white/10 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-white/20"
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2} />
          </button>
        ) : null}

        <div
          className="relative flex h-full w-full max-w-[min(1400px,90vw)] items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {currentSrc ? (
            <Image
              src={currentSrc}
              alt={`${listingNo} 상장 이미지 ${activeIdx + 1}`}
              fill
              sizes="90vw"
              className="object-contain"
              unoptimized
              priority
            />
          ) : (
            <div className="flex items-center justify-center text-white/30">
              <ImageOff className="h-16 w-16" />
            </div>
          )}
        </div>

        {hasMany ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            aria-label="다음 이미지"
            className="absolute right-6 top-1/2 z-10 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center bg-white/10 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-white/20"
          >
            <ChevronRight className="h-6 w-6" strokeWidth={2} />
          </button>
        ) : null}
      </div>

      {/* 하단 · 썸네일 스트립 */}
      {hasMany ? (
        <footer
          className="flex shrink-0 justify-center gap-2 px-6 pb-6 pt-4"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((src, idx) => (
            <button
              key={`lb-thumb-${src}-${idx}`}
              type="button"
              onClick={() => onActiveIdxChange(idx)}
              aria-label={`${idx + 1}번째 이미지 보기`}
              className={cn(
                "relative h-16 w-16 shrink-0 overflow-hidden ring-1 transition-all",
                idx === activeIdx
                  ? "ring-2 ring-sky-400 opacity-100"
                  : "opacity-50 ring-white/20 hover:opacity-90 hover:ring-white/50",
              )}
            >
              <Image
                src={src}
                alt={`${listingNo} 썸네일 ${idx + 1}`}
                fill
                sizes="64px"
                className="object-cover"
                unoptimized
              />
            </button>
          ))}
        </footer>
      ) : (
        <div className="h-6 shrink-0" aria-hidden />
      )}
    </div>
  );

  return createPortal(content, document.body);
}
