"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChevronLeft, ChevronRight, FileText, ImageOff, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LiveListing } from "../api";
import { toGradeSeriesKey } from "../lib/grade";
import { toPartGroupName } from "../lib/partGrouping";
import { useListingCerts } from "../hooks/useListingCerts";
import { ListingViewerRail } from "./ListingViewerRail";
import type { SheetBidding } from "./SheetParts";
import { useSideDock } from "../hooks/useSideDock";

/** 뷰어 안에서 넘겨 보는 한 장 · 사진이거나 증명서 스캔본 */
type ViewerMedia =
  | { kind: "photo"; src: string; label: string }
  | { kind: "doc"; src: string | null; label: string };

/**
 * 하단 썸네일 한 칸.
 * `mediaIdx: null` 은 미등록 · 자리는 지키되 누를 수 없게 둔다.
 * 없는 항목을 아예 지우면 "이 개체는 증명서가 없는 건가, 기능이 없는 건가" 를 구분 못 한다.
 */
interface MediaTab {
  label: string;
  /** 칸 안에 들어갈 짧은 이름 · 문서 칸에만 쓴다 (64px 에 「등급판정확인서」는 안 들어간다) */
  short?: string;
  kind: "photo" | "doc";
  /** 사진 칸은 이 그림을 줄여 그린다 · 문서 칸은 아이콘이라 쓰지 않는다 */
  src: string | null;
  mediaIdx: number | null;
}

export interface ListingViewerDialogProps {
  /**
   * 좌우로 넘겨 볼 개체 목록 · 표에 보이는 순서 그대로 (필터·정렬 반영).
   * 부위별 표처럼 한 개체가 여러 행일 때는 부르는 쪽에서 중복을 없앤다.
   */
  listings: LiveListing[];
  activeListingId: string;
  onActiveListingIdChange: (listingId: string) => void;
  /**
   * 눌러 들어온 부위 · 레일 시세 차트의 축이 된다.
   * 부위별 표는 행이 곧 부위라 그 값을 넘기고, 개체별 표는 비워 두면 첫 부위로 잡는다.
   * 개체를 넘겨도 부위는 그대로라 `101 등심 → 102 등심` 으로 같은 부위를 비교할 수 있다.
   */
  partName?: string | null;
  /** 레일 하단 입찰 독 · 상장표가 쓰던 `useSheetBidding` 핸들을 그대로 내려받는다 */
  bidding?: SheetBidding;
  canBid?: boolean;
  /** 회차 마감 등 개체 단위 차단 사유 · 독이 입력 대신 사유를 띄운다 */
  getBlockReason?: (listing: LiveListing) => string | undefined;
  onClose: () => void;
}

/**
 * 개체 뷰어 · 전체화면 다이얼로그.
 *
 * NOTE: 지금은 어디서도 열지 않는다. 입찰은 개체·부위 상세 한 곳으로 모았고, 상장표 사진은
 *       표 기본 라이트박스로 크게 보는 것으로 족하다. 되살릴 때를 위해 남겨 둔 코드이므로
 *       같은 파일의 `ViewerMediaPane`(상세 페이지가 쓰는 부분)만 건드리지 말 것.
 *
 *  - 표의 사진 썸네일을 누르면 열린다 · 좌우(←/→)는 **개체**를 넘긴다
 *    사진은 673건 중 433건이 0장이라 장 단위 이동은 누를 게 없는 경우가 대부분이다
 *  - 왼쪽은 미디어(사진 · 등급판정확인서 · 도축검사증명서), 오른쪽은 스펙 레일
 *  - 증명서 파일은 리스트 API 에 없으므로(유무 플래그만) 개체가 바뀔 때 지연 로드
 *  - 사진이 없어도 오른쪽 레일은 그대로 채워진다 · 사진 없는 개체에서도 여는 값어치가 있다
 *  - `createPortal(document.body)` 로 stacking context 이탈 · ESC · backdrop 클릭으로 닫기
 */
export function ListingViewerDialog({
  listings,
  activeListingId,
  onActiveListingIdChange,
  partName = null,
  bidding,
  canBid = false,
  getBlockReason,
  onClose,
}: ListingViewerDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [mediaIdx, setMediaIdx] = useState(0);
  /**
   * 시세를 볼 부위 · 개체가 아니라 다이얼로그가 들고 있다.
   * 레일은 `key={listing.id}` 로 개체마다 새로 마운트되므로 여기 두어야
   * `101 등심 → 102 등심` 으로 같은 부위를 이어서 볼 수 있다.
   */
  const [partGroup, setPartGroup] = useState(() =>
    partName ? toPartGroupName(partName) : "",
  );
  /**
   * 시세를 볼 등급 · `null` 이면 지금 보는 개체의 등급을 따라간다.
   * 한 번 고르면 개체를 넘겨도 그 등급으로 고정돼 `1++(9)` 기준으로 여러 개체를 견줄 수 있다.
   */
  const [gradeKey, setGradeKey] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeIdx = Math.max(
    0,
    listings.findIndex((l) => l.id === activeListingId),
  );
  const listing = listings[activeIdx] ?? null;
  const total = listings.length;
  const hasMany = total > 1;

  /** 넘어간 개체에 그 부위가 없으면(부위 구성이 다른 개체) 첫 부위로 내려앉는다 */
  const activePartGroup = useMemo(() => {
    const groups = (listing?.parts ?? []).map((p) =>
      toPartGroupName(p.partName),
    );
    if (partGroup && groups.includes(partGroup)) return partGroup;
    return groups[0] ?? "";
  }, [listing, partGroup]);

  const activeGradeKey =
    gradeKey ??
    toGradeSeriesKey(listing?.grade, listing?.marblingScore) ??
    "1++(9)";

  /** 개체가 바뀌면 첫 장부터 · 앞 개체에서 보던 장수를 물려받지 않는다 */
  useEffect(() => {
    setMediaIdx(0);
  }, [activeListingId]);

  const pushRecent = useSideDock((state) => state.pushRecent);
  const viewedId = listing?.id;
  const viewedNo = listing?.listingNo;
  useEffect(() => {
    if (!viewedId || !viewedNo) return;
    pushRecent({ listingId: viewedId, listingNo: viewedNo });
  }, [viewedId, viewedNo, pushRecent]);

  /**
   * 양 끝에서 멈춘다 · 되감지 않는다.
   * 상장표는 200개체까지 가는 줄이라, 끝에서 처음으로 튀면 몇 번을 돌았는지 알 수 없다.
   * 멈춘 화살표가 곧 "여기가 끝" 신호다.
   */
  const canPrev = activeIdx > 0;
  const canNext = activeIdx < total - 1;

  const goPrev = useCallback(() => {
    const prev = listings[activeIdx - 1];
    if (prev) onActiveListingIdChange(prev.id);
  }, [activeIdx, listings, onActiveListingIdChange]);

  const goNext = useCallback(() => {
    const next = listings[activeIdx + 1];
    if (next) onActiveListingIdChange(next.id);
  }, [activeIdx, listings, onActiveListingIdChange]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;

      /**
       * 입찰 입력칸 안에서는 ←/→ 가 글자 커서다. 숫자를 고치려고 누른 화살표에
       * 개체가 넘어가면 쓰던 값이 통째로 날아간다. Alt 를 쥐면 어디서든 개체가 넘어간다.
       */
      const el = document.activeElement;
      const typing =
        !e.altKey &&
        el instanceof HTMLElement &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable);
      if (typing) return;

      e.preventDefault();
      if (e.key === "ArrowLeft") goPrev();
      else goNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goPrev, goNext, onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (!mounted || !listing) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${listing.listingNo} 개체 상세`}
      className="fixed inset-0 z-[9999] flex bg-[#0f0f12]/95 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex min-w-0 flex-1 flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <ViewerHeader
          position={activeIdx + 1}
          total={total}
          onClose={onClose}
        />
        <ViewerMediaPane
          key={listing.id}
          listing={listing}
          mediaIdx={mediaIdx}
          onMediaIdxChange={setMediaIdx}
          hasMany={hasMany}
          canPrev={canPrev}
          canNext={canNext}
          onPrev={goPrev}
          onNext={goNext}
        />
      </div>

      <div onClick={(e) => e.stopPropagation()} className="flex">
        <ListingViewerRail
          key={listing.id}
          listing={listing}
          partGroup={activePartGroup}
          onPartGroupChange={setPartGroup}
          gradeKey={activeGradeKey}
          onGradeKeyChange={setGradeKey}
          bidding={bidding}
          canBid={canBid}
          blockReason={getBlockReason?.(listing)}
        />
      </div>
    </div>,
    document.body,
  );
}

function ViewerHeader({
  position,
  total,
  onClose,
}: {
  position: number;
  total: number;
  onClose: () => void;
}) {
  return (
    <header className="flex shrink-0 items-center justify-between px-6 py-4">
      {/* 접수번호·등급은 여기 두지 않는다 · 오른쪽 레일이 히어로로 들고 있다 */}
      {total > 1 ? (
        <span className="text-[13px] tabular-nums text-white/50">
          {position} / {total}
          <span className="pl-1 text-white/30">개체</span>
        </span>
      ) : (
        <span />
      )}

      <div className="flex items-center gap-4">
        {/* PC 전용 화면 · 키보드로 훑는 쪽이 훨씬 빠르다는 걸 알려 둔다 */}
        <p className="flex items-center gap-2 text-[11px] font-medium text-white/30">
          <KeyCap>←</KeyCap>
          <KeyCap>→</KeyCap>
          <span>개체 이동</span>
          <KeyCap>Alt</KeyCap>
          <span>입력 중에도</span>
          <KeyCap>ESC</KeyCap>
          <span>닫기</span>
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="inline-flex h-10 w-10 items-center justify-center bg-white/5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
        >
          <X className="h-5 w-5" strokeWidth={2} />
        </button>
      </div>
    </header>
  );
}

function KeyCap({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center bg-white/10 px-1 text-[10px] font-semibold not-italic text-white/55">
      {children}
    </kbd>
  );
}

/**
 * 미디어 영역 · 큰 그림 + 왼쪽 썸네일 레일 · 개체 뷰어와 개체 페이지 공용 (먹색 바탕 전제).
 * `key={listing.id}` 로 개체가 바뀔 때 새로 마운트해 증명서 쿼리도 함께 갈아탄다.
 *
 * 그림 위 좌우 화살표는 선택이다 — 얹으면 "다음 장" 으로 읽히므로 개체를 넘기는 데 쓰면 안 된다.
 * 사진이 2장인 개체가 693건 중 120건(17%)이라 그 오해가 실제로 일어나고, 잘못 누르면
 * 입찰하려던 개체에서 이탈한다. 상세 페이지는 개체 이동을 헤더 스테퍼로 옮기고 여기는 비웠다.
 */
export function ViewerMediaPane({
  listing,
  mediaIdx,
  onMediaIdxChange,
  hasMany = false,
  canPrev = false,
  canNext = false,
  onPrev,
  onNext,
  className,
}: {
  listing: LiveListing;
  mediaIdx: number;
  onMediaIdxChange: (idx: number) => void;
  hasMany?: boolean;
  canPrev?: boolean;
  canNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  /** 바깥 여백 · 기본은 전체화면 뷰어 기준 */
  className?: string;
}) {
  const hasAnyCert = listing.hasGradeCert || listing.hasSlaughterCert;
  const { data: certs } = useListingCerts(listing.id, hasAnyCert);

  const { media, tabs } = useMemo(() => {
    const items: ViewerMedia[] = listing.images.map((src, i) => ({
      kind: "photo",
      src,
      label: listing.images.length > 1 ? `사진 ${i + 1}` : "사진",
    }));
    const tabList: MediaTab[] = items.map((item, i) => ({
      label: item.label,
      kind: "photo",
      src: item.kind === "photo" ? item.src : null,
      mediaIdx: i,
    }));
    if (tabList.length === 0) {
      tabList.push({ label: "사진", kind: "photo", src: null, mediaIdx: null });
    }

    const addDoc = (
      label: string,
      short: string,
      has: boolean,
      src: string | null,
    ) => {
      if (!has) {
        tabList.push({ label, short, kind: "doc", src: null, mediaIdx: null });
        return;
      }
      tabList.push({ label, short, kind: "doc", src, mediaIdx: items.length });
      items.push({ kind: "doc", src, label });
    };
    addDoc(
      "등급판정확인서",
      "등급판정",
      listing.hasGradeCert,
      certs?.gradeCert?.fileData ?? null,
    );
    addDoc(
      "도축검사증명서",
      "도축검사",
      listing.hasSlaughterCert,
      certs?.slaughterCert?.fileData ?? null,
    );

    return { media: items, tabs: tabList };
  }, [listing.images, listing.hasGradeCert, listing.hasSlaughterCert, certs]);

  const safeIdx = Math.min(mediaIdx, Math.max(0, media.length - 1));
  const current = media[safeIdx] ?? null;

  return (
    <div
      className={cn("flex min-h-0 flex-1 gap-3", className ?? "pb-6 pl-6 pr-4")}
    >
      {/*
       * 썸네일은 세로로 세운다 · 단면 사진은 거의 정사각(1.19)이라 늘 높이에 먼저 갇히고
       * 가로로는 판의 절반이 남는다. 아래에 깔면 그 60px 를 높이에서 빼앗아
       * 그림이 그만큼 작아지지만, 옆에 세우면 남는 폭을 쓰는 것이라 공짜다.
       */}
      <MediaTabs
        tabs={tabs}
        activeIdx={media.length > 0 ? safeIdx : null}
        onSelect={onMediaIdxChange}
      />

      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        {hasMany && onPrev ? (
          <ViewerArrow side="left" disabled={!canPrev} onClick={onPrev} />
        ) : null}
        <ViewerStage listingNo={listing.listingNo} item={current} />
        {hasMany && onNext ? (
          <ViewerArrow side="right" disabled={!canNext} onClick={onNext} />
        ) : null}
      </div>
    </div>
  );
}

function ViewerArrow({
  side,
  disabled,
  onClick,
}: {
  side: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === "left" ? "이전 개체" : "다음 개체"}
      className={cn(
        "absolute top-1/2 z-10 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center bg-white/10 text-white shadow-lg backdrop-blur-md transition-colors",
        disabled ? "cursor-default opacity-25" : "hover:bg-white/20",
        side === "left" ? "left-2" : "right-2",
      )}
    >
      <Icon className="h-6 w-6" strokeWidth={2} />
    </button>
  );
}

/** 큰 그림 한 장 · 사진 없는 개체(673건 중 433건)를 위해 빈 상태를 분명히 말한다 */
function ViewerStage({
  listingNo,
  item,
}: {
  listingNo: string;
  item: ViewerMedia | null;
}) {
  if (!item) {
    return (
      <div className="flex flex-col items-center gap-2 text-white/25">
        <ImageOff className="h-16 w-16" strokeWidth={1.25} />
        <span className="text-[13px] font-medium">등록된 사진이 없습니다</span>
      </div>
    );
  }

  if (!item.src) {
    return (
      <div className="flex flex-col items-center gap-2 text-white/40">
        <FileText className="h-14 w-14 animate-pulse-soft" strokeWidth={1.25} />
        <span className="text-[13px]">{item.label} 불러오는 중</span>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <Image
        src={item.src}
        alt={`${listingNo} ${item.label}`}
        fill
        sizes="70vw"
        className="object-contain"
        unoptimized
        priority
      />
    </div>
  );
}

/**
 * 왼쪽 썸네일 세로줄 · 미등록 항목도 자리를 지켜 "왜 안 보이지" 를 없앤다.
 *
 * 글자 탭이던 것을 그림으로 바꿨다 — 사진은 이름이 「사진 1·2」뿐이라 눌러 보기 전에는
 * 뭐가 들었는지 알 수 없었다. 문서는 48px 로 줄이면 글씨가 안 읽혀 아이콘과 짧은 이름으로 둔다.
 */
function MediaTabs({
  tabs,
  activeIdx,
  onSelect,
}: {
  tabs: MediaTab[];
  activeIdx: number | null;
  onSelect: (idx: number) => void;
}) {
  return (
    <div className="flex w-16 shrink-0 flex-col gap-1.5 overflow-y-auto">
      {tabs.map((tab) => {
        const available = tab.mediaIdx != null;
        const active = available && tab.mediaIdx === activeIdx;
        return (
          <button
            key={tab.label}
            type="button"
            disabled={!available}
            aria-label={tab.label}
            aria-pressed={active}
            title={tab.label}
            onClick={() => available && onSelect(tab.mediaIdx as number)}
            className={cn(
              "relative h-12 w-full shrink-0 overflow-hidden rounded-[3px] bg-white/[0.06] transition-opacity",
              active
                ? "opacity-100 ring-2 ring-white"
                : available
                  ? "opacity-55 ring-1 ring-white/15 hover:opacity-90"
                  : "cursor-default ring-1 ring-dashed ring-white/15",
            )}
          >
            {tab.kind === "photo" && tab.src ? (
              <Image
                src={tab.src}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <span className="flex h-full w-full flex-col items-center justify-center gap-1">
                {/* 없는 칸에서는 아이콘을 빼고 그 자리에 「미등록」을 쓴다 ·
                    어느 증명서가 빠졌는지가 없으면 자리를 지킨 뜻이 사라진다 */}
                {available ? (
                  <FileText
                    className="h-4 w-4 text-white/70"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                ) : tab.kind === "photo" ? (
                  <ImageOff
                    className="h-4 w-4 text-white/25"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                ) : null}
                <span
                  className={cn(
                    "text-[9.5px] font-semibold leading-none",
                    available ? "text-white/70" : "text-white/35",
                  )}
                >
                  {tab.short ?? tab.label}
                </span>
                {available ? null : (
                  <span className="text-[9px] font-medium leading-none text-white/20">
                    미등록
                  </span>
                )}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
