"use client";

import {
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";
import { useMeasure } from "react-use";
import { cn } from "@/lib/utils";
import {
  GradeStamp,
  MediaTabs,
  ViewerStage,
  type MediaTab,
  type ViewerMedia,
} from "@/features/live-auction/components/ListingViewerDialog";
import {
  StagePlacementScope,
  type StagePlacementStore,
} from "@/features/live-auction/hooks/useStagePlacement";
import { STAGE_PLACEMENT_DEFAULT } from "@/features/live-auction/hooks/useRoomLayout";
import { SURFACE_SHELL_CLASS } from "@/features/live-auction/constants/surface";
import { useHistoryPrefs } from "../hooks/useHistoryPrefs";
import type { DailyListing } from "../hooks/useDailyListings";

/**
 * 그림판 바탕 · 경매장 상세 방·배송지시와 같은 먹색.
 *
 * 흰 판 위에서는 단면 사진이 바탕과 붙어 경계가 사라지고, 주변 밝기가 고기 색을
 * 실제와 다르게 보이게 한다. 테마와 상관없이 늘 어둡다.
 */
const PHOTO_STAGE_CLASS = "bg-[#1a1a1f]";

export interface HistoryPhotoPaneProps {
  /** 표에서 고른 줄의 개체 · 못 찾았으면 null */
  listing: DailyListing | null;
  /** 고른 줄이 무엇인지 · `등심 · 260720-101-01` 꼴 */
  rowLabel: string | null;
  /** 상장내역을 아직 받는 중 */
  isLoading: boolean;
  /** 머리글 오른쪽 · 판을 옮기는 손잡이가 들어온다 */
  headerAction?: ReactNode;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLElement>;
}

/**
 * 캘린더 아래 왼쪽 판 · 표에서 고른 줄의 등심 단면을 비춘다.
 *
 * 예전엔 이 자리에 이 달 성적표(총 낙찰금액 · 낙찰/미낙찰 비율)가 있었다. 뺀 까닭은
 * 같은 값이 세 군데에 있었기 때문이다 — 캘린더 셀이 날마다의 낙찰금액을 칠하고 있고,
 * 표 바닥에 그날 합계가 서 있고, 달 전체 분석은 `/insight` 가 따로 맡는다. 셋 중
 * 어느 것도 아닌 「무엇을 샀나」 만 그림이 없었다.
 *
 * 사진이 줄을 따라오는 건 배송지시 그림판과 같은 짜임이다. 경매내역은 하루 수십 줄을
 * 훑는 화면이라 개체마다 상세로 들어갔다 나오면 넘기는 데만 손이 다 간다. 표는 한
 * 줄기로 두고 사진이 커서를 따라오게 했다.
 *
 * 판정 일곱은 사진 **위**에 겹으로 얹는다 (`GradeStamp`). 끌어서 옮기고 모서리를 잡아
 * 키울 수 있고, 두 번 누르면 처음 자리로 돌아간다. 자리는 경매장·배송지시와 따로
 * 담는다 — 세 무대가 크기부터 다르다.
 *
 * 증명서 탭은 없다. 경매내역은 「무엇을 얼마에 샀나」 를 되짚는 화면이고, 등급판정
 * 확인서가 필요한 건 그걸 송장에 옮겨 적을 때라 배송지시 쪽 일이다.
 */
export function HistoryPhotoPane({
  listing,
  rowLabel,
  isLoading,
  headerAction,
  className,
  style,
  ref,
}: HistoryPhotoPaneProps) {
  const stagePlacement = useHistoryPrefs((s) => s.stage);
  const setStagePlacement = useHistoryPrefs((s) => s.setStagePlacement);
  const resetStagePlacement = useHistoryPrefs((s) => s.resetStagePlacement);
  const placementStore = useMemo<StagePlacementStore>(
    () => ({
      get: (slot) => stagePlacement[slot] ?? STAGE_PLACEMENT_DEFAULT[slot],
      set: setStagePlacement,
      reset: resetStagePlacement,
    }),
    [stagePlacement, setStagePlacement, resetStagePlacement],
  );

  const [mediaIdx, setMediaIdx] = useState(0);
  const [prevListing, setPrevListing] = useState<string | null>(null);
  const listingId = listing?.id ?? null;
  if (prevListing !== listingId) {
    /* 개체가 바뀌면 첫 장부터 · 3번째 사진을 보던 채로 넘어가면 없는 칸을 가리킨다 */
    setPrevListing(listingId);
    setMediaIdx(0);
  }

  /* 겹 자리를 비율로 담으니 무대 크기를 알아야 px 로 편다 */
  const [stageRef, stage] = useMeasure<HTMLDivElement>();

  const { media, tabs } = useMemo(() => {
    const images = listing?.images ?? [];
    const items: ViewerMedia[] = images.map((src, i) => ({
      kind: "photo",
      src,
      label: images.length > 1 ? `사진 ${i + 1}` : "사진",
    }));
    const tabList: MediaTab[] = items.map((item, i) => ({
      label: item.label,
      kind: "photo",
      src: item.kind === "photo" ? item.src : null,
      mediaIdx: i,
    }));
    return { media: items, tabs: tabList };
  }, [listing]);

  const safeIdx = Math.min(mediaIdx, Math.max(0, media.length - 1));
  const current = media[safeIdx] ?? null;

  return (
    /* 좁은 화면에서는 제 바닥(320)을 쥐고, 높이를 가둔 화면에서는 남는 세로를 받는다 */
    <section
      ref={ref}
      style={style}
      className={cn(
        "flex min-h-[320px] flex-col lg:min-h-0",
        SURFACE_SHELL_CLASS,
        className,
      )}
    >
      <header className="flex h-8 shrink-0 items-center gap-2 border-b border-line-soft pl-3 pr-1">
        {rowLabel ? (
          <span className="truncate text-[12px] font-bold tabular-nums text-content">
            {rowLabel}
          </span>
        ) : (
          <span className="text-[12px] font-bold text-content-mid">개체</span>
        )}
        <div className="ml-auto flex shrink-0 items-center">{headerAction}</div>
      </header>

      {!listing ? (
        <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center text-[12.5px] text-content-faint">
          {isLoading
            ? "상장내역 불러오는 중"
            : rowLabel
              ? "이 개체의 상장내역을 찾지 못했습니다"
              : "표에서 줄을 고르면 그 개체 사진이 여기 뜹니다"}
        </div>
      ) : (
        <div className={cn("flex min-h-0 flex-1 gap-3 p-3", PHOTO_STAGE_CLASS)}>
          {/*
           * 썸네일은 사진이 둘 이상일 때만 세운다 · 400px 열에서 64px 레일은 사진이
           * 한 장뿐이면 아무 일도 안 하면서 폭의 6분의 1을 가져간다.
           */}
          {tabs.length > 1 ? (
            <MediaTabs tabs={tabs} activeIdx={safeIdx} onSelect={setMediaIdx} />
          ) : null}

          {/*
           * `overflow-hidden` 은 안전장치다. 각인은 무대 안에 들어오도록 가두지만
           * 셈이 반 픽셀이라도 어긋나면 그 폭이 바깥 스크롤 영역으로 올라가 엉뚱한
           * 조상에 스크롤바를 만든다. 여기서 끊으면 위로 번지지 않는다.
           */}
          <div
            ref={stageRef}
            className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"
          >
            <ViewerStage listingNo={listing.listingNo} item={current} />
            {current?.kind === "photo" ? (
              <StagePlacementScope store={placementStore}>
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
              </StagePlacementScope>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
