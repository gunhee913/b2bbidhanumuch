"use client";

import { useMemo } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { useMeasure } from "react-use";
import { GradeStamp } from "./ListingViewerDialog";
import { PartMarketChart } from "./PartMarketChart";
import {
  StagePlacementScope,
  type StagePlacementStore,
} from "../hooks/useStagePlacement";
import { STAGE_PLACEMENT_DEFAULT } from "../hooks/useRoomLayout";
import { useSheetSummaryPrefs } from "../hooks/useSheetSummaryPrefs";
import type { LiveListing } from "../api";

/**
 * 차트 최소 높이 · 시세선만 (건수 막대를 뺐다 · `showVolume`) · 부위·등급·현재가는 차트 왼쪽 위에 얹힌다.
 * 사진 아래 세로가 이보다 남으면 차트가 그만큼 커진다 · 바닥을 비워 두면 선만 납작해진다.
 */
const CHART_MIN_HEIGHT = 180;
/** 카드 안 위아래 여백(p-3 · 24) + 사진·차트 사이(gap-2 · 8) + 차트 아래 여백(pb-2 · 8) */
const PANEL_CHROME_HEIGHT = 40;
/**
 * 사진 높이 상한 · 요약 카드가 한 화면 세로 안에 다 들어오게 한다.
 *
 * 297 은 사진 위(머리 48 · 여백 12 · 테두리 1 · 카드 안 12)와 사진 아래(차트 · 여백 ≈ 218 ·
 * 바닥 여백 12 · 테두리 1)의 합 — 세로가 모자라면 사진만 위아래를 조금 덜어 낸다.
 * 시세 머리는 차트 안에 얹혀 따로 세로를 쓰지 않는다. 필터 줄은 상장표 카드에만 있어
 * 여기서는 빼지 않는다.
 */
const PHOTO_MAX_HEIGHT = "calc(100vh - 297px)";
const PHOTO_MIN_HEIGHT = 180;

/**
 * 상장표 오른쪽 요약 · 커서가 머문 개체의 사진과 시세만 보여 준다.
 *
 * 표는 200행을 한눈에 견주는 자리라 열을 더 늘릴 수도, 행을 펼쳐 비교를 끊을 수도 없다.
 * 그래서 표는 그대로 두고 섹션 오른쪽 끝에 "지금 보고 있는 한 마리" 만 세워 둔다.
 *
 * 판정 일곱은 사진 **위**에 얹는다 — 개체 상세 방과 같은 각인(`GradeStamp`)이라 끌어서
 * 옮기고, 모서리를 잡아 키우고, 두 번 누르면 처음 자리로 돌아간다. 사진 아래 띠로 두면
 * 단면을 보다 점수를 되짚으려고 눈이 사진 밖으로 나갔다 와야 했다.
 *
 * 사진이 없는 개체(대부분이다)에도 각인은 빈 판 위에 그대로 선다. 사진이 없다고 판정까지
 * 숨기면 요약에서 등급 · 근내지방을 볼 길이 없어진다.
 */
export function SheetSummaryPanel({
  listing,
  availableHeight,
}: {
  listing: LiveListing | null;
  /** 요약 카드 안 높이 · 사진을 뺀 나머지를 차트가 쓴다 */
  availableHeight: number;
}) {
  const stagePlacement = useSheetSummaryPrefs((s) => s.stage);
  const setStagePlacement = useSheetSummaryPrefs((s) => s.setStagePlacement);
  const resetStagePlacement = useSheetSummaryPrefs(
    (s) => s.resetStagePlacement,
  );
  const placementStore = useMemo<StagePlacementStore>(
    () => ({
      get: (slot) => stagePlacement[slot] ?? STAGE_PLACEMENT_DEFAULT[slot],
      set: setStagePlacement,
      reset: resetStagePlacement,
    }),
    [stagePlacement, setStagePlacement, resetStagePlacement],
  );
  /* 각인 자리를 비율로 담으니 무대(사진 상자) 크기를 알아야 px 로 편다 */
  const [stageRef, stage] = useMeasure<HTMLDivElement>();

  if (!listing) {
    return (
      <div className="flex flex-col gap-2 p-3">
        <div className="flex aspect-[4/3] w-full items-center justify-center bg-surface-muted text-[12px] text-content-faint">
          개체에 커서를 올려 보세요
        </div>
      </div>
    );
  }

  const cover = listing.images[0] ?? null;
  /* 사진 높이를 재기 전에는 최소 높이 · 카드 높이로 먼저 그렸다가 줄어드는 들썩임을 막는다 */
  const chartHeight =
    stage.height > 0
      ? Math.max(
          CHART_MIN_HEIGHT,
          Math.floor(availableHeight - PANEL_CHROME_HEIGHT - stage.height),
        )
      : CHART_MIN_HEIGHT;

  return (
    <div className="flex flex-col gap-2 p-3">
      {/*
       * 미리보기 · 누를 곳은 표의 행과 썸네일이고, 여기는 커서를 따라 보여 주기만 한다.
       * 여백을 두르지 않는다 · 재는 상자에 패딩이 있으면 각인이 그만큼 밖으로 샌다.
       */}
      <div
        ref={stageRef}
        style={{ maxHeight: PHOTO_MAX_HEIGHT, minHeight: PHOTO_MIN_HEIGHT }}
        className="relative block aspect-[4/3] w-full overflow-hidden rounded-lg bg-surface-accent"
      >
        {cover ? (
          <Image
            src={cover}
            alt={`${listing.listingNo} 등심 단면`}
            fill
            sizes="760px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-content-ghost">
            <ImageOff className="h-6 w-6" strokeWidth={1.5} />
          </span>
        )}
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
      </div>

      <PartMarketChart
        compact
        minimal
        showVolume={false}
        bordered={false}
        partName={null}
        listing={listing}
        height={chartHeight}
      />
    </div>
  );
}
