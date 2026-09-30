"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  ImageOff,
  Maximize2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type GalleryAspect = "square" | "video" | "photo" | "wide";

const ASPECT_CLASS: Record<GalleryAspect, string> = {
  square: "aspect-square",
  video: "aspect-video",
  photo: "aspect-[4/3]",
  wide: "aspect-[16/10]",
};

/**
 * 갤러리에 사진 뒤로 붙는 문서 스캔본 (등급판정확인서 · 도축검사증명서 등).
 * `src === null` 이면 아직 로딩 중 → 썸네일은 문서 아이콘 placeholder.
 */
export interface GalleryDocument {
  id: string;
  label: string;
  src: string | null;
}

export type GalleryItem =
  | { kind: "photo"; src: string; label: null }
  | { kind: "doc"; src: string | null; label: string };

/** 컴팩트 썸네일 스트립 최대 칸 수 · 문서가 있으면 문서 칸을 먼저 확보하고 사진 수를 줄임 */
const MAX_THUMBS = 6;

export interface ListingImageGalleryProps {
  images: string[];
  listingNo: string;
  /** 사진 뒤에 붙는 문서 스캔본 · 썸네일에 라벨 오버레이 · 메인/lightbox 에선 contain */
  documents?: GalleryDocument[];
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
   * `true` 이면 하단 썸네일을 고정 크기로 컴팩트하게 표시.
   * 좁은 컬럼(부위별 오른쪽 상세) 에서 사용.
   */
  compactThumbs?: boolean;
  /**
   * 패널 폭에 딱 붙는 edge-to-edge 밴드.
   * - 메인 이미지 ring 제거 (부모 패널 외곽선이 프레임 역할)
   * - "전체보기" 라벨 버튼 → 우상단 아이콘만
   * - 메인 이미지 클릭으로도 lightbox
   * - 썸네일 스트립은 px-3 안쪽 여백
   */
  flush?: boolean;
}

/**
 * Trading Desk 스타일 이미지 갤러리.
 * - 메인 이미지 비율은 `aspect` prop 으로 선택
 * - 사진 + 문서 스캔본을 하나의 스트립으로 · 문서는 항상 사진 뒤 · 라벨 오버레이
 * - 실 이미지가 없으면 picsum 시드 이미지 fallback + Sample 라벨
 * - 우하단 "전체보기" 버튼 → 풀스크린 lightbox (portal · stacking context 이탈)
 */
export function ListingImageGallery({
  images,
  listingNo,
  documents = [],
  className,
  aspect = "square",
  mainFit = "cover",
  compactThumbs = false,
  flush = false,
}: ListingImageGalleryProps) {
  const hasImages = images && images.length > 0;

  const items = useMemo<GalleryItem[]>(() => {
    const displayImages = hasImages
      ? images
      : [
          `https://picsum.photos/seed/${encodeURIComponent(listingNo)}-1/720/720`,
          `https://picsum.photos/seed/${encodeURIComponent(listingNo)}-2/720/720`,
        ];
    return [
      ...displayImages.map((src): GalleryItem => ({
        kind: "photo",
        src,
        label: null,
      })),
      ...documents.map((d): GalleryItem => ({
        kind: "doc",
        src: d.src,
        label: d.label,
      })),
    ];
  }, [hasImages, images, listingNo, documents]);

  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    setActiveIdx(0);
  }, [listingNo]);

  const safeIdx = Math.min(activeIdx, items.length - 1);
  const activeItem = items[safeIdx] ?? items[0];
  const activeSrc = activeItem?.src ?? null;
  const isDocActive = activeItem?.kind === "doc";
  // 항목 1개면 카운터(`1 / 1`)·썸네일 스트립은 정보가 없으므로 숨김
  const hasMultiple = items.length > 1;

  // 컴팩트 스트립: 문서 칸 먼저 확보 → 남는 칸에 사진
  const thumbItems = useMemo(() => {
    if (!compactThumbs) return items.slice(0, 4);
    const docCount = documents.length;
    const photoLimit = Math.max(1, MAX_THUMBS - docCount);
    const photos = items.filter((i) => i.kind === "photo").slice(0, photoLimit);
    const docs = items.filter((i) => i.kind === "doc");
    return [...photos, ...docs].slice(0, MAX_THUMBS);
  }, [items, documents.length, compactThumbs]);

  const openLightbox = useCallback(() => {
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
  }, []);

  const fitContain = mainFit === "contain" || isDocActive;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        className={cn(
          "relative w-full overflow-hidden",
          !flush && "ring-1 ring-line",
          flush && activeSrc && "cursor-zoom-in",
          ASPECT_CLASS[aspect],
          fitContain ? "bg-surface-muted" : "bg-surface-accent",
        )}
        onClick={flush && activeSrc ? openLightbox : undefined}
      >
        {activeSrc ? (
          <Image
            src={activeSrc}
            alt={
              isDocActive
                ? `${listingNo} ${activeItem.label}`
                : `${listingNo} 상장 이미지`
            }
            fill
            sizes="(max-width: 1280px) 40vw, 400px"
            className={cn(fitContain ? "object-contain" : "object-cover")}
            unoptimized
          />
        ) : isDocActive ? (
          <DocLoadingPlaceholder label={activeItem.label} />
        ) : (
          <div className="flex h-full items-center justify-center text-content-ghost">
            <ImageOff className="h-10 w-10" />
          </div>
        )}

        {/* 좌상단 · 문서 라벨 (문서 활성 시) */}
        {isDocActive ? (
          <div className="absolute left-2 top-2 inline-flex items-center gap-1 bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            <FileText className="h-3 w-3" strokeWidth={2.25} />
            {activeItem.label}
          </div>
        ) : null}

        {/* 좌하단 · 카운터 (2개 이상일 때만) */}
        {hasMultiple ? (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            <span className="tabular-nums">{safeIdx + 1}</span>
            <span className="text-white/60">/</span>
            <span className="tabular-nums">{items.length}</span>
          </div>
        ) : null}

        {/* 전체보기 · flush 는 우상단 아이콘만 · 기본은 우하단 라벨 버튼 */}
        {activeSrc && flush ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openLightbox();
            }}
            aria-label="이미지 전체보기"
            className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
          >
            <Maximize2 className="h-3.5 w-3.5" strokeWidth={2.25} />
          </button>
        ) : activeSrc ? (
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

      {hasMultiple ? (
        <div
          className={cn(
            "flex items-center",
            compactThumbs ? "gap-1" : "gap-1.5",
            flush && "px-3",
          )}
        >
          {thumbItems.map((item, idx) => (
            <button
              key={`${item.kind}-${item.label ?? item.src}-${idx}`}
              type="button"
              onClick={() => setActiveIdx(idx)}
              aria-label={
                item.kind === "doc" ? item.label : `${idx + 1}번째 사진`
              }
              className={cn(
                "relative aspect-square overflow-hidden ring-1 transition-all",
                compactThumbs ? "h-12 w-12 shrink-0" : "flex-1",
                idx === safeIdx
                  ? "ring-2 ring-ink"
                  : "ring-line hover:ring-slate-300 opacity-70 hover:opacity-100",
              )}
            >
              <ThumbContent item={item} listingNo={listingNo} idx={idx} />
            </button>
          ))}
          {/* 빈 슬롯은 flex-1 레이아웃(개체별 넓은 뷰)에서만 칸 폭 유지용 · 컴팩트(고정 폭)에선 불필요 */}
          {!compactThumbs && thumbItems.length < 4
            ? Array.from({ length: 4 - thumbItems.length }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="aspect-square flex-1 bg-surface-muted ring-1 ring-line-soft"
                  aria-hidden
                />
              ))
            : null}
        </div>
      ) : null}

      {lightboxOpen ? (
        <ImageLightbox
          items={items}
          activeIdx={safeIdx}
          onActiveIdxChange={setActiveIdx}
          listingNo={listingNo}
          isSample={!hasImages}
          onClose={closeLightbox}
        />
      ) : null}
    </div>
  );
}

/** 썸네일 칸 내용 · 사진은 cover · 문서는 contain + 하단 라벨 띠 · 로딩 중이면 아이콘 */
function ThumbContent({
  item,
  listingNo,
  idx,
  dark = false,
}: {
  item: GalleryItem;
  listingNo: string;
  idx: number;
  dark?: boolean;
}) {
  if (item.kind === "photo") {
    return (
      <Image
        src={item.src}
        alt={`${listingNo} thumbnail ${idx + 1}`}
        fill
        sizes="80px"
        className="object-cover"
        unoptimized
      />
    );
  }

  return (
    <>
      {item.src ? (
        <Image
          src={item.src}
          alt={`${listingNo} ${item.label}`}
          fill
          sizes="80px"
          className={cn(
            "object-cover",
            dark ? "bg-surface" : "bg-surface-muted",
          )}
          unoptimized
        />
      ) : (
        <div
          className={cn(
            "flex h-full w-full items-center justify-center",
            dark
              ? "bg-surface/10 text-white/50"
              : "bg-surface-accent text-content-faint",
          )}
        >
          <FileText className="h-4 w-4" strokeWidth={2} />
        </div>
      )}
      <span
        className={cn(
          "absolute inset-x-0 bottom-0 truncate px-1 py-[2px] text-center text-[8px] font-semibold leading-none tracking-tight text-white",
          "bg-black/65",
        )}
      >
        {shortDocLabel(item.label)}
      </span>
    </>
  );
}

/** 썸네일 폭(48px)에 맞춘 축약 라벨 · "등급판정확인서" → "등급판정" · "도축검사증명서" → "도축검사" */
function shortDocLabel(label: string): string {
  return label.replace(/확인서|증명서$/g, "");
}

function DocLoadingPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1.5 text-content-faint">
      <FileText className="h-8 w-8 animate-pulse-soft" strokeWidth={1.5} />
      <span className="text-[11px] font-medium">{label} 불러오는 중</span>
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
 * - ArrowLeft/Right · 좌/우 화살표 버튼 · 하단 썸네일 → 항목 전환
 * - 항목 여러 개 없으면 화살표/썸네일 미표시
 */
export function ImageLightbox({
  items,
  activeIdx,
  onActiveIdxChange,
  listingNo,
  isSample,
  onClose,
}: {
  items: GalleryItem[];
  activeIdx: number;
  onActiveIdxChange: (idx: number) => void;
  listingNo: string;
  isSample: boolean;
  onClose: () => void;
}) {
  const total = items.length;
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

  const current = items[activeIdx] ?? items[0];
  const currentSrc = current?.src ?? null;
  const currentLabel = current?.kind === "doc" ? current.label : null;

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${listingNo} 이미지 전체보기`}
      className="fixed inset-0 z-[9999] flex flex-col bg-[#0f0f12]/95 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* 상단바 · 상장번호 + 문서 라벨 + 카운터 + 닫기 */}
      <header
        className="flex shrink-0 items-center justify-between px-6 py-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className="text-[15px] font-bold tabular-nums text-white">
            {listingNo}
          </span>
          {currentLabel ? (
            <span className="inline-flex items-center gap-1 bg-surface/10 px-2 py-0.5 text-[11px] font-semibold text-white/80">
              <FileText className="h-3 w-3" strokeWidth={2.25} />
              {currentLabel}
            </span>
          ) : isSample ? (
            <span className="bg-surface/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/70">
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
          className="inline-flex h-10 w-10 items-center justify-center bg-surface/5 text-white/80 transition-colors hover:bg-surface/15 hover:text-white"
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
            aria-label="이전"
            className="absolute left-6 top-1/2 z-10 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center bg-surface/10 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-surface/20"
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
              alt={
                currentLabel
                  ? `${listingNo} ${currentLabel}`
                  : `${listingNo} 상장 이미지 ${activeIdx + 1}`
              }
              fill
              sizes="90vw"
              className="object-contain"
              unoptimized
              priority
            />
          ) : currentLabel ? (
            <div className="flex flex-col items-center gap-2 text-white/40">
              <FileText
                className="h-14 w-14 animate-pulse-soft"
                strokeWidth={1.25}
              />
              <span className="text-[13px]">{currentLabel} 불러오는 중</span>
            </div>
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
            aria-label="다음"
            className="absolute right-6 top-1/2 z-10 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center bg-surface/10 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-surface/20"
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
          {items.map((item, idx) => (
            <button
              key={`lb-thumb-${item.kind}-${item.label ?? item.src}-${idx}`}
              type="button"
              onClick={() => onActiveIdxChange(idx)}
              aria-label={
                item.kind === "doc" ? item.label : `${idx + 1}번째 사진 보기`
              }
              className={cn(
                "relative h-16 w-16 shrink-0 overflow-hidden ring-1 transition-all",
                idx === activeIdx
                  ? "ring-2 ring-ink opacity-100"
                  : "opacity-50 ring-white/20 hover:opacity-90 hover:ring-white/50",
              )}
            >
              <ThumbContent item={item} listingNo={listingNo} idx={idx} dark />
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
