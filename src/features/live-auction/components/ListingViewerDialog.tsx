"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useMeasure } from "react-use";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  ImageOff,
  Pencil,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LiveListing } from "../api";
import { formatGradeLabel, toGradeSeriesKey } from "../lib/grade";
import {
  isSpecEmpty,
  JUDGED_SPECS,
  type JudgedSpecValues,
} from "../lib/judgedSpecs";
import { isTypingInto } from "../lib/keyboard";
import { toPartGroupName } from "../lib/partGrouping";
import { useListingCerts } from "../hooks/useListingCerts";
import type { StageSlot } from "../hooks/useRoomLayout";
import { useStagePlacement } from "../hooks/useStagePlacement";
import { ListingViewerRail } from "./ListingViewerRail";
import type { SheetBidding } from "./SheetParts";
import { useSideDock } from "../hooks/useSideDock";

/** 뷰어 안에서 넘겨 보는 한 장 · 사진이거나 증명서 스캔본 */
export type ViewerMedia =
  | { kind: "photo"; src: string; label: string }
  | { kind: "doc"; src: string | null; label: string };

/**
 * 하단 썸네일 한 칸.
 * `mediaIdx: null` 은 미등록 · 자리는 지키되 누를 수 없게 둔다.
 * 없는 항목을 아예 지우면 "이 개체는 증명서가 없는 건가, 기능이 없는 건가" 를 구분 못 한다.
 */
export interface MediaTab {
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
  stamp = false,
  note = null,
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
  /**
   * 사진 왼쪽 아래에 등급 각인을 찍는다 · 상세 페이지처럼 사진만 덩그러니 있는 곳용.
   * 전체화면 뷰어는 옆에 스펙 레일이 통째로 붙어 있어 필요 없다.
   */
  stamp?: boolean;
  /**
   * 사진 위 메모 쪽지 · 지금 고른 부위에 붙는다.
   *
   * 읽고 쓰는 일은 바깥(상세 방)이 맡는다. 이 판은 사진을 그리는 곳이지 딜러의 메모가
   * 어디에 어떻게 저장되는지 알아야 할 곳이 아니다.
   */
  note?: {
    partId: string;
    /** 제목줄에 적는 이름 · 어느 부위에 쓰는 메모인지 */
    partLabel: string;
    body: string | null;
    onSave: (body: string) => void;
  } | null;
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
  const [stageRef, stage] = useMeasure<HTMLDivElement>();

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

      {/*
       * 각인을 끌어다 놓는 판 · 자리를 비율로 담으니 무대 크기를 알아야 px 로 편다.
       *
       * `overflow-hidden` 은 안전장치다. 각인은 무대 안에 들어오도록 가두지만, 셈이
       * 반 픽셀이라도 어긋나면 그 삐져나간 폭이 바깥 스크롤 영역으로 올라가 엉뚱한
       * 조상에 스크롤바를 만든다. 여기서 끊으면 위로 번지지 않는다. 화살표도 안쪽에
       * 붙어 있어(left-2 / right-2) 잘릴 것이 없다.
       */}
      <div
        ref={stageRef}
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"
      >
        {hasMany && onPrev ? (
          <ViewerArrow side="left" disabled={!canPrev} onClick={onPrev} />
        ) : null}
        <ViewerStage listingNo={listing.listingNo} item={current} />
        {hasMany && onNext ? (
          <ViewerArrow side="right" disabled={!canNext} onClick={onNext} />
        ) : null}
        {/* 증명서 스캔본에는 찍지 않는다 · 흰 종이라 가릴 것이 있고, 등급은 그 안에 이미 적혀 있다 */}
        {stamp && current?.kind === "photo" ? (
          <GradeStamp
            heading={{
              grade: listing.grade,
              marblingScore: listing.marblingScore,
              listingNo: listing.listingNo,
              companyName: listing.companyName,
            }}
            values={listing}
            stageWidth={stage.width}
            stageHeight={stage.height}
          />
        ) : null}
        {note && current?.kind === "photo" ? (
          <StageNote
            partId={note.partId}
            partLabel={note.partLabel}
            body={note.body}
            onSave={note.onSave}
            stageWidth={stage.width}
            stageHeight={stage.height}
          />
        ) : null}
      </div>
    </div>
  );
}

/** 메모 길이 상한 · API 와 같은 값을 쓴다 (서버도 500 에서 자른다) */
const NOTE_MAX_LENGTH = 500;

/**
 * 겹 공통 껍데기 · 끌기·배율·크기 손잡이는 각인이든 메모든 똑같다.
 *
 * 손잡이를 뿌리에 박지 않고 자식에게 넘긴다. 각인은 글자뿐이라 상자 전체를 잡아도
 * 되지만 메모는 안에 입력칸이 있어서, 전체가 손잡이면 글을 쓰려고 누르는 순간
 * 쪽지가 끌려간다. 메모는 제목줄만 손잡이로 쓴다.
 */
function StageOverlay({
  slot,
  stageWidth,
  stageHeight,
  label,
  className,
  children,
}: {
  slot: StageSlot;
  stageWidth: number;
  stageHeight: number;
  label: string;
  className?: string;
  children: (handle: StageDragHandle) => ReactNode;
}) {
  const place = useStagePlacement<HTMLDivElement>({
    slot,
    stageWidth,
    stageHeight,
  });

  const handle: StageDragHandle = {
    ...place.moveProps,
    onDoubleClick: place.reset,
    title: "끌어서 자리 옮기기 · 두 번 눌러 처음으로",
    className: place.active ? "cursor-grabbing" : "cursor-grab",
  };

  return (
    <div
      ref={place.ref}
      role="group"
      aria-label={label}
      style={place.style}
      className={cn(
        "group/overlay absolute left-0 top-0 z-10 w-max touch-none rounded-[0.3em] backdrop-blur-sm",
        place.active && "ring-1 ring-white/30",
        className,
      )}
    >
      {children(handle)}
      {/*
       * 크기 손잡이 · 평소엔 숨고 겹에 손이 올라오면 나온다.
       * 늘 보이면 사진 위 작은 상자에 군더더기가 하나 더 붙고, 숨겨 두면 끌 일이
       * 있을 때 — 곧 겹에 손이 가 있을 때 — 만 나타난다.
       */}
      <span
        role="presentation"
        {...place.sizeProps}
        title="끌어서 크기 조절"
        className="absolute bottom-0 right-0 flex h-[1.4em] w-[1.4em] cursor-nwse-resize items-end justify-end rounded-br-[0.3em] p-[0.3em] opacity-0 transition-opacity group-hover/overlay:opacity-100"
      >
        <span className="h-[0.5em] w-[0.5em] border-b-2 border-r-2 border-white/60" />
      </span>
    </div>
  );
}

/**
 * 각인이 배율 1 일 때 먹는 폭 · Pretendard 실측(266.6)을 올린 값.
 *
 * 각인은 접지 않는다(`whitespace-nowrap`). 무대가 이보다 좁으면 넘치는 만큼 잘려
 * 나가고, 잘리는 쪽은 늘 마지막 칸인 **등심면적**이다. 그래서 무대를 품은 판은 제
 * 최소 폭을 이 값에서 거꾸로 셈해야 한다 (`DELIVERY_PANE_MIN_WIDTH` 참고).
 *
 * 칸 폭은 라벨과 값 중 큰 쪽이고 일곱 중 여섯은 라벨이 이긴다 — 바꾸면 여기도 바뀐다.
 *
 * 위아래 두 줄 중 **넓은 쪽이 상자 폭**인데, 머리줄은 자료에 따라 늘었다 줄었다 한다.
 * 그래도 일곱 칸 줄을 못 넘기게 되어 있다 — 접수번호는 `YYMMDD-RNN` 열 자 꼴이고
 * 상장업체는 `max-w-[10em]` 에서 말줄임으로 끊기므로, 머리줄이 가장 길어 봐야
 * 여백 20 + 등급 58.8 + 틈 8 + 번호 71.4 + 틈 8 + 업체 100 = 266.2 다.
 * 접수번호 자릿수가 늘면 이 셈이 깨지니 그때는 이 값도 같이 올려야 한다.
 */
export const GRADE_STAMP_WIDTH = 268;

/**
 * 사진 위 판정 각인.
 *
 * 품질정보 띠는 화면 맨 위라, 마블링을 들여다보다 점수를 되짚으려면 눈이 열여덟 칸을
 * 거슬러 올라갔다 와야 한다. 등급도 일곱 값도 다름 아닌 이 사진에 대한 판정사의
 * 답이니 같은 자리에 둔다. 윗줄은 등급 · 접수번호 · 상장업체 차례이고 등급이 가장
 * 굵다 — 사진에 대고 묻는 것은 「몇 등급이냐」 가 먼저고 「어느 개체냐」 가 그다음이다.
 * 상장표 요약 사진(`SheetSummaryPanel`)도 같은 셋을 같은 차례 · 같은 굵기로 쓴다.
 *
 * **라벨을 값 옆이 아니라 위에 두는 이유.** 옆에 두면 칸 폭이 라벨＋값이라 일곱을
 * 늘어놓는 데 437px 가 든다. 1열을 최소(460)까지 좁히면 썸네일 레일과 여백을 빼고
 * 사진 무대가 360px 뿐이라 그대로 터진다. 위로 올리면 칸 폭이 둘 중 큰 쪽이라
 * 265.9px 로 줄어 좁은 쪽에서도 들어간다. 값을 가운데로 모으는 건 「근내지방 9」 처럼
 * 라벨이 값보다 세 배 긴 칸이 많아서다 — 왼쪽에 붙이면 숫자가 칸 구석에 처박힌다.
 *
 * 키보드로는 못 옮긴다. 자리와 크기는 보기 편하자는 일일 뿐이고, 여기 적힌 값은 위
 * 품질정보 띠에 그대로 다 있어 끌지 못해도 잃는 정보가 없다. 그래서 과녁을 탭 차례에
 * 끼워 ←/→ 의 개체 이동과 다투게 만들 까닭이 없다.
 */
export function GradeStamp({
  heading,
  values,
  stageWidth,
  stageHeight,
}: {
  /**
   * 윗줄에 적을 등급·접수번호·상장업체.
   *
   * 한때 배송지시에서는 뺐다 — 그 셋이 카드 머리줄에 이미 서 있으니 사진을 더 가릴
   * 까닭이 없다고 봤다. 틀린 셈이었다. 각인은 「이 사진이 무엇에 대한 판정이냐」 를
   * 통째로 담는 상자라, 값 일곱만 있고 어느 개체인지가 없으면 반쪽이다. 머리줄은
   * 사진 바깥 얇은 띠에 있어 사진을 들여다보는 동안은 눈에 들어오지도 않는다.
   *
   * 두 방이 같은 각인을 쓰는 것도 이유다. 한쪽만 머리줄을 빼면 같은 개체 사진이
   * 방마다 다르게 보여, 경매장에서 보던 것을 배송지시에서 다시 맞춰 봐야 한다.
   */
  heading: {
    grade: string | null;
    marblingScore: number | null;
    listingNo: string;
    companyName?: string | null;
  };
  /** 일곱 판정값 · 개체 자료형이 방마다 달라 값만 받는다 */
  values: JudgedSpecValues;
  stageWidth: number;
  stageHeight: number;
}) {
  return (
    <StageOverlay
      slot="stamp"
      stageWidth={stageWidth}
      stageHeight={stageHeight}
      label="등급판정 요약 · 끌어서 옮기고 모서리를 잡아 키울 수 있습니다"
      className="select-none bg-black/60 transition-colors hover:bg-black/75"
    >
      {(handle) => (
        /*
         * 여백은 안쪽에 둔다 · 바깥은 재는 자리라 비워야 한다. 까닭은
         * `useStagePlacement` 의 `ref` 주석에 적어 뒀다.
         *
         * 각인은 읽기만 하는 상자라 전체가 손잡이다.
         */
        <div
          {...handle}
          className={cn(
            "flex flex-col gap-[0.8em] px-[1em] py-[0.8em]",
            handle.className,
          )}
        >
          <span className="flex items-baseline gap-[0.8em] whitespace-nowrap">
            <span className="text-[1.5em] font-bold leading-none tabular-nums text-white">
              {formatGradeLabel(heading.grade, heading.marblingScore)}
            </span>
            <span className="text-[1.2em] font-medium leading-none tabular-nums text-white/55">
              {heading.listingNo}
            </span>
            {heading.companyName ? (
              <span className="max-w-[10em] truncate text-[1.2em] font-medium leading-none text-white/55">
                {heading.companyName}
              </span>
            ) : null}
          </span>
          {/* 접지 않는다 · 일곱이 한 줄로 서 있어야 「한 덩어리」 로 읽힌다 */}
          <span className="flex items-end gap-[0.8em] whitespace-nowrap">
            {JUDGED_SPECS.map(({ label, key, unit }) => {
              const value = values[key];
              const empty = isSpecEmpty(value);
              return (
                <span
                  key={label}
                  className="flex flex-col items-center gap-[0.4em]"
                >
                  <span className="text-[0.95em] font-medium leading-none text-white/45">
                    {label}
                  </span>
                  <span
                    className={cn(
                      "text-[1.3em] font-bold leading-none tabular-nums",
                      empty ? "text-white/30" : "text-white",
                    )}
                  >
                    {empty ? "-" : value}
                    {!empty && unit ? (
                      <span className="pl-[0.05em] text-[0.73em] font-medium text-white/45">
                        {unit}
                      </span>
                    ) : null}
                  </span>
                </span>
              );
            })}
          </span>
        </div>
      )}
    </StageOverlay>
  );
}

/** 손잡이로 쓸 요소에 그대로 펼친다 · 커서 클래스는 `cn` 으로 합쳐야 한다 */
type StageDragHandle = {
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
  onDoubleClick: () => void;
  title: string;
  className: string;
};

/**
 * 사진 위 메모 쪽지 · 지금 고른 **부위**에 붙는다.
 *
 * 개체가 아니라 부위인 건 상세 방이 부위 단위로 돌아가기 때문이다. 표 1열의 별도
 * 부위를 찍고 자국도 부위에 붙으니, 쪽지만 개체에 붙으면 메모를 써 놓고 표에 아무
 * 자국이 없어 다시 찾지 못한다. 쓰는 것과 읽는 것이 같은 대상이어야 한다.
 *
 * 비어 있을 때는 작은 알약 하나로 접힌다. 각인은 늘 떠 있어도 할 말이 있지만 빈 쪽지는
 * 사진을 가리기만 한다 — 그렇다고 아주 없애면 메모를 쓸 길이 사라진다.
 */
export function StageNote({
  partId,
  partLabel,
  body,
  onSave,
  stageWidth,
  stageHeight,
}: {
  partId: string;
  partLabel: string;
  body: string | null;
  onSave: (body: string) => void;
  stageWidth: number;
  stageHeight: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  /* 부위를 옮기면 쓰던 것을 접는다 · 남의 쪽지에 내 글이 남아 있으면 안 된다 */
  useEffect(() => {
    setEditing(false);
  }, [partId]);

  const open = () => {
    setDraft(body ?? "");
    setEditing(true);
  };

  /*
   * `M` 으로 연다 · 쪽지가 사진 위에 떠 있는 동안만 산다.
   *
   * 듣는 자리를 쪽지 안에 둔 건 조건이 쪽지와 정확히 같아서다 — 열 쪽지가 있을 때만
   * 키가 살아야 하고, 열 대상도 이 쪽지가 쥔 바로 그 부위다. 상세방과 배송지시가 같은
   * 쪽지를 쓰니 두 화면이 한 번에 따라온다.
   *
   * 자판 자리(`code`)를 먼저 보는 건 한글 입력기 때문이다. 입력기가 켜져 있으면 M 자리를
   * 눌러도 `key` 는 `ㅡ` 라, 글자로만 보면 영문일 때만 먹는다 (축 바꾸기 `B` 와 같은 함정).
   *
   * 「쓰는 중」 의 기준은 `/` · `B` 와 맞춘다 (`isTypingInto`). 상장표 입찰칸은 고르기
   * 동안 읽기전용이라, 거기 커서가 있어도 줄을 훑다 말고 손을 떼지 않고 적을 수 있다.
   */
  const openRef = useRef(open);
  openRef.current = open;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyM" && e.key !== "m" && e.key !== "M") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingInto(document.activeElement)) return;
      /* 전체화면 뷰어처럼 덮어 둔 판이 떠 있으면 그쪽 일이다 */
      if (document.querySelector('[aria-modal="true"]')) return;
      e.preventDefault();
      openRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const commit = () => {
    onSave(draft);
    setEditing(false);
  };

  /*
   * 커서 자리에 줄 하나를 끼운다 · 브라우저 기본값에 맡기지 않는다.
   *
   * ⇧↵ 는 칸이 알아서 줄을 바꾸지만 ⌥↵ · ⌃↵ 는 브라우저마다 다르다. 저장을 ↵ 에
   * 내준 이상 줄바꿈 쪽이 「되는 키와 안 되는 키」 로 갈리면 안 된다.
   *
   * `setRangeText` 로 끼우면 커서가 끼운 자리 뒤에 서고 되돌리기(⌘Z)도 살아 있다 —
   * 글자열을 손으로 이어 붙이면 커서가 맨 뒤로 튄다.
   */
  const insertNewline = (el: HTMLTextAreaElement) => {
    if (el.value.length >= NOTE_MAX_LENGTH) return;
    el.setRangeText("\n", el.selectionStart, el.selectionEnd, "end");
    setDraft(el.value);
  };

  if (!editing && !body) {
    return (
      <StageOverlay
        slot="note"
        stageWidth={stageWidth}
        stageHeight={stageHeight}
        label="메모 쓰기"
        className="select-none bg-black/45 transition-colors hover:bg-black/70"
      >
        {(handle) => (
          <span
            {...handle}
            className={cn(
              "flex items-center gap-[0.4em] px-[0.8em] py-[0.5em]",
              handle.className,
            )}
          >
            <Pencil
              className="h-[1.1em] w-[1.1em] text-white/50"
              strokeWidth={2.2}
              aria-hidden
            />
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={open}
              title="메모 쓰기 (M)"
              className="flex items-baseline gap-[0.4em] text-[1.15em] font-semibold leading-none text-white/70 hover:text-white"
            >
              메모
              {/* 키를 알약에 적어 둔다 · 단축키 목록을 열어야만 아는 키는 없는 키다 */}
              <kbd className="text-[0.8em] font-bold not-italic text-white/35">
                M
              </kbd>
            </button>
          </span>
        )}
      </StageOverlay>
    );
  }

  return (
    <StageOverlay
      slot="note"
      stageWidth={stageWidth}
      stageHeight={stageHeight}
      label={`${partLabel} 메모`}
      className="bg-black/70"
    >
      {(handle) => (
        <div className="flex w-[22em] flex-col">
          {/* 제목줄만 손잡이 · 아래 글 영역을 잡으면 글을 쓰려는 것이다 */}
          <span
            {...handle}
            className={cn(
              "flex select-none items-center gap-[0.4em] rounded-t-[0.3em] border-b border-white/10 px-[0.8em] py-[0.45em]",
              handle.className,
            )}
          >
            <Pencil
              className="h-[1em] w-[1em] shrink-0 text-white/40"
              strokeWidth={2.2}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-[1em] font-semibold leading-none text-white/45">
              {partLabel}
            </span>
          </span>

          {editing ? (
            <>
              <textarea
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onPointerDown={(e) => e.stopPropagation()}
                onBlur={commit}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Escape") {
                    setEditing(false);
                    return;
                  }
                  if (e.key !== "Enter") return;
                  /*
                   * 입력기가 글자를 고르는 중의 ↵ 는 그 고르기를 닫는 ↵ 다.
                   * 「메모」 를 치면 마지막 글자가 아직 조립 중이라, 이걸 안 보면
                   * 한글로 쓸 때마다 마지막 한 글자에서 저장되고 창이 닫힌다.
                   */
                  if (e.nativeEvent.isComposing) return;
                  e.preventDefault();
                  /* 무언가 함께 누르면 줄바꿈 · 그냥 누르면 저장 */
                  if (e.altKey || e.shiftKey || e.metaKey || e.ctrlKey) {
                    insertNewline(e.currentTarget);
                    return;
                  }
                  commit();
                }}
                maxLength={NOTE_MAX_LENGTH}
                placeholder="예: 등지방 두꺼움 · 다음 회차에"
                className="h-[7em] w-full resize-none bg-transparent px-[0.8em] py-[0.6em] text-[1.2em] leading-[1.45] text-white caret-white outline-none placeholder:text-white/25"
              />
              <span className="flex items-center justify-between px-[0.8em] pb-[0.6em] text-[0.95em] leading-none text-white/35">
                <span>Esc 취소 · ↵ 저장 · ⇧↵ 줄바꿈</span>
                <span className="tabular-nums">
                  {draft.length}/{NOTE_MAX_LENGTH}
                </span>
              </span>
            </>
          ) : (
            /* 눌러서 고친다 · 지우려면 글을 다 지우고 나가면 된다 */
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={open}
              title="눌러서 고치기 (M)"
              className="w-full whitespace-pre-wrap px-[0.8em] py-[0.6em] text-left text-[1.2em] leading-[1.45] text-white/90 hover:bg-white/5"
            >
              {body}
            </button>
          )}
        </div>
      )}
    </StageOverlay>
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
export function ViewerStage({
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
export function MediaTabs({
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
