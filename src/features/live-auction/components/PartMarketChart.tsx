"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useClickAway } from "react-use";
import { ChevronDown } from "lucide-react";
import {
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineStyle,
  LineType,
  TickMarkType,
  createChart,
  type AutoscaleInfo,
  type HistogramData,
  type IChartApi,
  type IPriceLine,
  type IPrimitivePaneRenderer,
  type IPrimitivePaneView,
  type ISeriesApi,
  type ISeriesPrimitive,
  type LineData,
  type Logical,
  type MouseEventParams,
  type PrimitivePaneViewZOrder,
  type SeriesAttachedParameter,
  type SeriesType,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import type { CanvasRenderingTarget2D } from "fancy-canvas";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useAppTheme } from "@/hooks/useAppTheme";
import { fetchPartPriceSeries, type LiveListing } from "../api";
import {
  aggregatePartPriceSeries,
  buildPartPriceSeries,
  type PriceGranularity,
  type PricePoint,
  type YieldGrade,
} from "../lib/buildPartPriceSeries";
import { toGradeSeriesKey } from "../lib/grade";
import { SURFACE_SHELL_CLASS } from "../constants/surface";

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export interface PartMarketChartProps {
  partName: string | null;
  listing: LiveListing | null;
  /**
   * 차트 캔버스 높이(px). 미지정 시 기본 320 (경매장 규범).
   * `/insight` 대시보드처럼 세로 여백이 넉넉한 화면에서만 override.
   */
  height?: number;
  /**
   * 컴포넌트 outer border/bg 를 렌더할지 여부. default true.
   * 부모가 카드 컨테이너를 직접 제공할 때 false 로 지정.
   */
  bordered?: boolean;
  /**
   * 헤더 좌측 slot · 부위명 `<h4>` 를 대체.
   * `/insight` 는 부위 selector pill 을 여기에 주입해 title/filter 중복 제거.
   */
  headerLeft?: React.ReactNode;
  /**
   * 헤더 우측 slot · 기간·집계 토글을 대체한다.
   * 축약형에서 토글이 사라진 자리를 부르는 쪽 필터로 채울 때 쓴다.
   */
  headerRight?: React.ReactNode;
  /** 헤더 맨 오른쪽 · 기간·집계 토글은 그대로 두고 그 뒤에 덧붙인다 (크게 보기 버튼 등) */
  headerAction?: React.ReactNode;
  /**
   * 그릴 등급 · `1++(9)` 형식. 미지정 시 `listing` 의 등급을 따른다.
   * 개체 등급과 다른 등급의 시세를 견주어 볼 때 부르는 쪽에서 덮어쓴다.
   */
  gradeOverride?: string | null;
  /**
   * 기준선 · 선택한 부위의 최저단가 등 "지금 이 값이 시세 대비 어디인가" 를 보여줄 1줄.
   * 먹색 점선 + 우측 축 라벨. null 이면 그리지 않음.
   */
  referencePrice?: { value: number; label: string } | null;
  /**
   * 캔버스 바탕 · 개체 뷰어의 먹색 레일처럼 **항상** 어두운 자리에서만 못 박는다.
   * 비우면 헤더 토글이 정한 앱 명암을 따라간다.
   */
  theme?: ChartTheme;
  /**
   * 곁눈질용 축약형.
   *
   * 기간·집계·등급 라인·오버레이 토글 14개와 2x2 통계를 걷어내고
   * **부위·등급 / 현재가 / 시세선 + 거래 건수** 만 남긴다. 파고드는 분석은 부위별 탭이 이미 맡고 있어
   * 사진을 보다 시세를 한 번 확인하는 자리에서는 조작부가 전부 잉여가 된다.
   */
  compact?: boolean;
}

const DEFAULT_CHART_HEIGHT = 320;
/**
 * 기준선(최저단가)이 시세 범위에서 이만큼(비율) 안에 있으면 가격축을 늘려 선을 화면에 담고,
 * 그보다 멀면 축을 늘리지 않고(시세가 눌리므로) 칩만 pane 가장자리에 화살표로 고정한다.
 */
const REFERENCE_AUTOSCALE_TOLERANCE = 0.25;
const REFERENCE_CHIP_EDGE_INSET = 10;
// 하단 pane · 상장/낙찰 누적 막대 · 옅은 막대(상장) 위에 진한 막대(낙찰) · 채워진 비율이 곧 낙찰률
/**
 * 시세 pane : 건수 pane 높이 비.
 * 건수는 "많다/적다"와 낙찰률(채워진 비율)만 읽으면 되는 보조 지표라 1/5 로도 충분하다.
 * 시세선이 주인공이니 남는 높이는 위쪽에 준다.
 */
const PRICE_PANE_STRETCH = 4;
const VOLUME_PANE_STRETCH = 1;

const NUMBER_FORMATTER = new Intl.NumberFormat("ko-KR");

const GRANULARITY_TABS: { value: PriceGranularity; label: string }[] = [
  { value: "day", label: "일별" },
  { value: "week", label: "주별" },
  { value: "month", label: "월별" },
];

const YIELDS: YieldGrade[] = ["A", "B", "C"];

// 실 데이터 sparsity 임계치 (일별 데이터 포인트가 이 미만이면 더미로 폴백)
// - 730일 창에서 최소 3개월치 (~60일) 이상 있어야 실 데이터로 판단
const REAL_DATA_MIN_POINTS = 60;

/**
 * 노출 기간 프리셋 · 마지막 데이터 시점을 우측 anchor 로 캘린더 일수만큼 보여준다.
 * `null` 은 전체(fitContent). 기본 6M · 일별 노이즈가 픽셀 단위로 압축되어 추세로 읽히는 최소 폭.
 */
type RangePreset = "1M" | "3M" | "6M" | "1Y" | "ALL";
const RANGE_PRESETS: {
  value: RangePreset;
  label: string;
  days: number | null;
}[] = [
  { value: "1M", label: "1M", days: 31 },
  { value: "3M", label: "3M", days: 92 },
  { value: "6M", label: "6M", days: 183 },
  { value: "1Y", label: "1Y", days: 365 },
  { value: "ALL", label: "전체", days: null },
];
const DEFAULT_RANGE: RangePreset = "6M";

function rangeDaysOf(range: RangePreset): number | null {
  return RANGE_PRESETS.find((r) => r.value === range)?.days ?? null;
}

/**
 * 분석 오버레이 · 모두 주인공(선택 등급) 라인 기준.
 * 부분육 시세는 추세보다 구조(공급·등급·상장가)로 설명되는 시장이라
 * 이동평균 같은 추세 지표 대신 "얼마에 써야 낙찰되나" 에 답하는 관계 지표를 둔다.
 * - band : 낙찰가 범위 · 그 시점 최저~최고 낙찰 단가를 주인공 라인 뒤에 옅은 띠로
 * (낙찰률은 별도 선 대신 하단 상장/낙찰 누적 막대의 "채워진 비율" 로 읽힌다)
 */
type OverlayKey = "band";
type OverlayState = Record<OverlayKey, boolean>;
// 기본은 꺼둔다 · 띠가 깔려 있으면 먼저 봐야 할 시세선이 그 안에 묻힌다
const DEFAULT_OVERLAYS: OverlayState = {
  band: false,
};
const OVERLAY_LABEL: Record<OverlayKey, string> = {
  band: "낙찰가 범위",
};
// 지표는 시세선보다 한 단계 뒤로 · 옅은 톤
const BAND_FILL_ALPHA = 0.08;
const BAND_EDGE_ALPHA = 0.22;
/**
 * 캔버스 팔레트.
 *
 * 부위별 탭은 흰 바탕이지만 개체 뷰어 레일은 먹색이다. 흰 차트를 어두운 레일에 얹으면
 * 사진 옆에서 차트가 먼저 눈에 띄어, 정작 봐야 할 고기와 등급이 뒤로 밀린다.
 *
 * lightweight-charts 는 init 시점에 색을 굳히므로 테마는 런타임에 바뀌지 않는 값으로 받는다.
 */
export type ChartTheme = "light" | "dark";

interface ChartPalette {
  canvasBg: string;
  axisText: string;
  /** 수평 격자 · 눈금 위치만 잡아주고 데이터 뒤로 물러나는 밝기 */
  grid: string;
  axisBorder: string;
  paneSeparator: string;
  paneSeparatorHover: string;
  crosshair: string;
  /** 축 라벨 배지 바탕 · 글자는 언제나 그 반대색 */
  badgeBg: string;
  badgeText: string;
  /** 주인공(선택 개체 등급) 라인 · 나머지 등급은 `gradeLines` */
  /**
   * 주인공 라인 · 시세색(red) 하나로 고정한다.
   *
   * 등락에 따라 red/blue 를 오가게 하면 선 하나가 날마다 다른 색이 되어, 여러 등급을
   * 겹쳐 볼 때 「빨간 게 내 등급」이라는 기준이 무너진다. 색은 등락이 아니라
   * 「이게 내가 보는 선」을 말하는 쪽이 낫다 — 등락은 위 숫자가 이미 색으로 말한다.
   * `globals.css` 의 `--rise` 와 같은 값 (캔버스는 CSS 변수를 못 읽어 하드코딩).
   */
  heroLine: string;
  /** 비교용 등급 라인 · 주인공에서 멀어질수록 옅어지는 사다리 */
  gradeLines: Record<GradeKey, string>;
  /** 크로스헤어 마커 테두리 · 바탕과 같은 색이라야 점이 떠 보인다 */
  markerBorder: string;
  referenceLine: string;
  volumeBar: string;
  listedBar: string;
  /** 기준선 좌측 HTML 칩 */
  refChipClass: string;
  /** 헤더·히어로 등 차트 바깥 텍스트 */
  titleClass: string;
  subTextClass: string;
  mutedTextClass: string;
  dividerClass: string;
}

const CHART_PALETTES: Record<ChartTheme, ChartPalette> = {
  light: {
    canvasBg: "#ffffff",
    axisText: "#3d3d46",
    grid: "#f1f1f4",
    axisBorder: "#e2e2e7",
    paneSeparator: "#e2e2e7",
    paneSeparatorHover: "#9494a0",
    crosshair: "#c8c8d1",
    badgeBg: "#17171c",
    badgeText: "#ffffff",
    heroLine: "#f04452",
    gradeLines: {
      "1++(9)": "#56565f",
      "1++(8)": "#6b6b75",
      "1++(7)": "#80808a",
      "1+": "#95959f",
      "1": "#a9a9b3",
      "2": "#b7b7c0",
      "3": "#c4c4cc",
    },
    markerBorder: "#ffffff",
    referenceLine: "#17171c",
    volumeBar: "#9494a0", // 낙찰 건수
    listedBar: "#e2e2e7", // 상장 건수
    refChipClass: "border-zinc-300 bg-white/95 text-zinc-900",
    titleClass: "text-zinc-900",
    subTextClass: "text-zinc-500",
    mutedTextClass: "text-zinc-400",
    dividerClass: "border-zinc-100",
  },
  dark: {
    canvasBg: "#17171c",
    axisText: "#9898a3",
    grid: "#26262d",
    axisBorder: "#2b2b33",
    paneSeparator: "#2b2b33",
    paneSeparatorHover: "#5a5a66",
    crosshair: "#5a5a66",
    badgeBg: "#e5e5ea",
    badgeText: "#17171c",
    heroLine: "#f55460", // 먹색 바탕에서 채도가 죽어 라이트보다 한 톤 밝게
    gradeLines: {
      "1++(9)": "#c2c2cc",
      "1++(8)": "#adadb8",
      "1++(7)": "#9898a3",
      "1+": "#84848f",
      "1": "#72727c",
      "2": "#63636c",
      "3": "#57575f",
    },
    markerBorder: "#17171c",
    referenceLine: "#9898a3",
    volumeBar: "#3c3c46",
    listedBar: "#26262d",
    refChipClass: "border-white/15 bg-[#17171c]/90 text-zinc-200",
    titleClass: "text-white",
    subTextClass: "text-white/50",
    mutedTextClass: "text-white/35",
    dividerClass: "border-white/[0.07]",
  },
};

// 등급 순서 · 레전드/차트 라인 순서
const ALL_GRADES = ["1++(9)", "1++(8)", "1++(7)", "1+", "1", "2", "3"] as const;
type GradeKey = (typeof ALL_GRADES)[number];

// 등급 메뉴가 아래로 열릴 자리가 있는지 재는 데 쓰는 어림값 (행 높이 + 테두리·패딩)
const MENU_ROW_HEIGHT = 26;
const MENU_CHROME = 10;

/**
 * 라인 색 · 선택 개체의 등급(주인공)만 또렷하고 비교용은 한 톤씩 물러난다.
 *
 * 등급마다 색상(hue)을 달리 주던 것을 명도 사다리로 바꿨다. 쓰임이 「내 등급 하나 +
 * 비교용 한둘」이라 일곱 색은 쓰이지 않고 소음만 됐고, 무엇보다 청록(cyan-700 ·
 * teal-700)과 zinc-600/700 은 라이트 기준 값이라 먹색 바탕에서 바탕에 잠겨 버렸다.
 * 명도 사다리는 등급 순서(상위 = 진함)를 색 자체가 말해 주고, 명암별로 값을 따로
 * 두면 어느 바탕에서도 같은 위계로 읽힌다.
 */
function lineColorFor(
  grade: GradeKey,
  heroGrade: GradeKey,
  palette: ChartPalette,
): string {
  return grade === heroGrade ? palette.heroLine : palette.gradeLines[grade];
}

/**
 * 라인 식별 키 · `"1++(9)"` (등급 통합) 또는 `"1++(9):A"` (특정 육량) 형태.
 */
type LineKey = string;

function makeLineKey(grade: GradeKey, yieldG: YieldGrade | null): LineKey {
  return yieldG ? `${grade}:${yieldG}` : grade;
}

/**
 * 초기 라인 선택 규칙.
 * - 통합 체크: 등급 통합 라인 1개 (`grade`)
 * - 통합 해제: 선택 개체의 육량등급 라인 1개 (`grade:A` 등) · 나머지 B/C 는 범례에서 켠다
 */
function buildInitialLines(
  grade: GradeKey,
  yieldG: YieldGrade,
  yieldUnified: boolean,
): Set<LineKey> {
  if (yieldUnified) return new Set<LineKey>([grade]);
  return new Set<LineKey>([makeLineKey(grade, yieldG)]);
}

/** `1++A` · `1+B` 같은 등급 문자열 끝의 육량등급 · 없으면 A */
function toYieldGrade(grade: string | null | undefined): YieldGrade {
  const suffix = (grade ?? "").trim().match(/[ABC]$/)?.[0];
  return (suffix as YieldGrade | undefined) ?? "A";
}

function parseLineKey(key: LineKey): {
  grade: GradeKey;
  yieldG: YieldGrade | null;
} {
  const [g, y] = key.split(":");
  return {
    grade: g as GradeKey,
    yieldG: (y as YieldGrade | undefined) ?? null,
  };
}

/** useQueries combine · 렌더마다 새 배열 대신 구조적 공유되는 최소 상태만 */
type SeriesQueryState = {
  data: Awaited<ReturnType<typeof fetchPartPriceSeries>> | undefined;
  isError: boolean;
  isLoading: boolean;
};
function combineSeriesQueries(
  results: Array<{
    data: Awaited<ReturnType<typeof fetchPartPriceSeries>> | undefined;
    isError: boolean;
    isLoading: boolean;
  }>,
): SeriesQueryState[] {
  return results.map((r) => ({
    data: r.data,
    isError: r.isError,
    isLoading: r.isLoading,
  }));
}

/** 각 라인의 최종 데이터. */
interface LineSeriesData {
  key: LineKey;
  grade: GradeKey;
  yieldG: YieldGrade | null;
  color: string;
  points: PricePoint[];
  latest: number | null;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * 부위별 뷰 우측 상단 시세 차트.
 *
 * AuctionLab `PriceLineChart` 를 컨텍스트(부위·등급) 1-series 로 단순화.
 * - lightweight-charts v5 + `chart.addPane()` 로 볼륨 별도 pane
 * - 원/두 커스텀 formatter · day/week/month tickMarkFormatter
 * - 호버 시 상단 InfoBar 갱신 + 우측 축에 가격 라벨 pop
 */
export function PartMarketChart({
  partName,
  listing,
  height,
  bordered = true,
  headerLeft,
  headerRight,
  headerAction,
  referencePrice,
  gradeOverride = null,
  theme,
  compact = false,
}: PartMarketChartProps) {
  const appTheme = useAppTheme();
  const tone = theme ?? appTheme;
  const palette = CHART_PALETTES[tone];
  const chartHeight = height ?? DEFAULT_CHART_HEIGHT;
  const [granularity, setGranularity] = useState<PriceGranularity>("day");
  // 축약형은 기간 토글이 없으므로 한눈에 추세가 잡히는 3M 으로 고정
  const [range, setRange] = useState<RangePreset>(
    compact ? "3M" : DEFAULT_RANGE,
  );
  const [yieldUnified, setYieldUnified] = useState(false);
  // 분석 오버레이 · 주인공 라인 기준
  const [overlays, setOverlays] = useState<OverlayState>(DEFAULT_OVERLAYS);
  const toggleOverlay = (key: OverlayKey) =>
    setOverlays((prev) => ({ ...prev, [key]: !prev[key] }));
  // 크로스헤어 hover · 헤더 히어로가 이 시점의 값으로 바뀐다 (마우스 이탈 시 null → 최신값)
  const [hover, setHover] = useState<ChartHoverInfo | null>(null);

  const gradeKey = useMemo<GradeKey>(
    () =>
      (gradeOverride ??
        toGradeSeriesKey(listing?.grade, listing?.marblingScore) ??
        "1++(9)") as GradeKey,
    [gradeOverride, listing?.grade, listing?.marblingScore],
  );

  const listingYield = useMemo<YieldGrade>(
    () => toYieldGrade(listing?.grade),
    [listing?.grade],
  );

  const normalizedPart = useMemo(
    () => (partName ? toPartGroup(partName) : "등심"),
    [partName],
  );

  // 다중 라인 선택 상태 · 초기: 현재 통합 상태에 맞는 라인
  const [selectedLines, setSelectedLines] = useState<Set<LineKey>>(() =>
    buildInitialLines(gradeKey, listingYield, yieldUnified),
  );

  // 개체(listing) 변경 시 새 등급·육량 라인으로 완전 대체 (기존 다른 등급 선택은 리셋)
  // · yieldUnified 는 handleUnifiedChange 에서 별도로 처리하므로 여기 deps 에서 제외
  useEffect(() => {
    setSelectedLines(buildInitialLines(gradeKey, listingYield, yieldUnified));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gradeKey, listingYield]);

  /**
   * 개별 라인 토글 · 라디오 스타일 (등급 기준 exclusive).
   * - 현재 선택 중 다른 등급 라인이 있으면 → 이 라인만 남기고 나머지 제거
   * - 같은 등급 내에서는 add/remove 토글
   */
  const toggleLine = (key: LineKey) => {
    setSelectedLines((prev) => {
      const { grade } = parseLineKey(key);
      const hasOtherGrade = [...prev].some(
        (k) => parseLineKey(k).grade !== grade,
      );
      if (hasOtherGrade) {
        return new Set([key]);
      }
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  /**
   * 등급 그룹 토글 (통합 해제 상태 전용) · 라디오 스타일.
   * - 이 등급 라인만 선택된 상태 → 전부 해제 (빈 상태)
   * - 그 외 → 다른 등급 전부 제거하고 이 등급의 선택 개체 육량 라인 1개만 선택
   *   (A/B/C 를 한꺼번에 켜지 않는다 · 추가 육량은 범례 pill 로)
   */
  const toggleGroup = (g: GradeKey) => {
    setSelectedLines((prev) => {
      const isOnlyThisGrade =
        prev.size > 0 && [...prev].every((k) => parseLineKey(k).grade === g);
      if (isOnlyThisGrade) {
        return new Set<LineKey>();
      }
      return new Set<LineKey>([makeLineKey(g, listingYield)]);
    });
  };

  /**
   * 통합 토글 · 상태 전환 시 라인 자동 변환
   * - true (통합): 기존 A/B/C 선택을 aggregate 로 변환
   * - false (해제): 기존 aggregate 선택을 선택 개체 육량 라인 1개로 변환
   */
  const handleUnifiedChange = (checked: boolean) => {
    setYieldUnified(checked);
    setSelectedLines((prev) => {
      const next = new Set<LineKey>();
      if (checked) {
        const aggFromYields = new Set<GradeKey>();
        for (const k of prev) {
          const { grade, yieldG } = parseLineKey(k);
          if (yieldG === null) {
            next.add(k);
          } else {
            aggFromYields.add(grade);
          }
        }
        for (const g of aggFromYields) next.add(g);
        if (next.size === 0) next.add(gradeKey);
      } else {
        // 해제: 통합 라인 → 선택 개체 육량 라인 1개로 (A/B/C 전부 켜지 않음)
        for (const k of prev) {
          const { grade, yieldG } = parseLineKey(k);
          next.add(yieldG !== null ? k : makeLineKey(grade, listingYield));
        }
        if (next.size === 0) next.add(makeLineKey(gradeKey, listingYield));
      }
      return next;
    });
  };

  // 선택된 라인을 등급 순서 → (통합) → A → B → C 순으로 정렬
  // · 현재 통합 상태와 다른 종류의 라인은 화면에 그리지 않음
  const orderedLines = useMemo<LineKey[]>(() => {
    const result: LineKey[] = [];
    for (const g of ALL_GRADES) {
      if (yieldUnified) {
        if (selectedLines.has(g)) result.push(g);
      } else {
        for (const y of YIELDS) {
          const k = makeLineKey(g, y);
          if (selectedLines.has(k)) result.push(k);
        }
      }
    }
    return result;
  }, [selectedLines, yieldUnified]);

  /**
   * 지금 그려지고 있는 등급. 등급 선택은 배타라 화면에는 언제나 하나뿐이다.
   *
   * 시세색(red)의 기준을 개체 등급(`gradeKey`)에 묶어 두면, 다른 등급으로 바꾼 순간
   * 그 선이 「비교용」 회색 사다리로 떨어진다. 화면에 선이 하나뿐인데 그 하나가
   * 물러나 있는 셈이라, 정작 보고 있는 선이 가장 눈에 안 띄게 된다.
   */
  const shownGrade = useMemo<GradeKey>(() => {
    const first = orderedLines[0];
    return first ? parseLineKey(first).grade : gradeKey;
  }, [orderedLines, gradeKey]);

  // 병렬 fetch · 라인마다 grade + (통합 시 null / 특정 육량)
  // `combine` 은 모듈 레벨 함수 → 결과가 구조적으로 공유되어 데이터가 같으면 참조가 유지된다.
  // (기본 반환 배열은 렌더마다 새 참조라, hover 로 부모가 리렌더될 때마다 seriesList 가 바뀌어
  //  차트가 통째로 재생성되고 가시 범위가 리셋 → 드래그/줌이 먹히지 않던 원인)
  const queries = useQueries({
    combine: combineSeriesQueries,
    queries: orderedLines.map((key) => {
      const { grade, yieldG } = parseLineKey(key);
      return {
        queryKey: [
          "live-auction",
          "part-price-series",
          normalizedPart,
          grade,
          yieldG ?? "all",
          730,
        ],
        queryFn: () =>
          fetchPartPriceSeries({
            partName: normalizedPart,
            grade,
            yieldGrade: yieldG,
            days: 730,
          }),
        enabled: !!normalizedPart,
        staleTime: 60_000,
        refetchOnWindowFocus: false,
      };
    }),
  });

  const anyLoading = queries.some((q) => q.isLoading);

  // 라인별 시리즈 (실 데이터 or 더미 폴백)
  const lineSeriesData = useMemo<LineSeriesData[]>(() => {
    return orderedLines.map((key, idx) => {
      const { grade, yieldG } = parseLineKey(key);
      const q = queries[idx];
      const apiData = q?.data;
      const isError = q?.isError ?? false;
      const realPoints =
        apiData?.series?.filter((p) => p.avg != null && p.count > 0) ?? [];
      const realCount = realPoints.length;

      // 실데이터가 있어도 최신 시점이 STALE_DAYS 이상 오래됐으면
      // 오늘 기준 차트가 잘리므로 더미로 폴백 (dev 환경 대응)
      const STALE_DAYS = 14;
      const lastRealDateStr = realPoints[realPoints.length - 1]?.date;
      const isStale = lastRealDateStr
        ? (Date.now() - new Date(lastRealDateStr).getTime()) /
            (24 * 60 * 60 * 1000) >
          STALE_DAYS
        : true;

      const useDummy = isError || realCount < REAL_DATA_MIN_POINTS || isStale;

      const points = useDummy
        ? buildPartPriceSeries({
            partName: normalizedPart,
            grade,
            // 통합 라인은 baseline (B) · 특정 육량은 해당 육량
            yieldGrade: yieldG ?? "B",
            granularity,
          })
        : aggregatePartPriceSeries({
            series: apiData!.series,
            granularity,
          });

      return {
        key,
        grade,
        yieldG,
        color: lineColorFor(grade, shownGrade, palette),
        points,
        latest: points[points.length - 1]?.value ?? null,
      };
    });
  }, [orderedLines, queries, granularity, normalizedPart, shownGrade, palette]);

  const hasAny = lineSeriesData.some((gs) => gs.points.length > 0);

  // 시세 히어로 기준 라인 · 그려지는 등급의 라인 (육량 여러 개면 첫 줄)
  const heroLine = useMemo(
    () =>
      lineSeriesData.find((l) => l.grade === shownGrade) ??
      lineSeriesData[0] ??
      null,
    [lineSeriesData, shownGrade],
  );
  const rangeDays = rangeDaysOf(range);
  const heroStats = useMemo(
    () =>
      buildHeroStats({
        points: heroLine?.points ?? [],
        hoverDate: hover?.date ?? null,
        hoverValue: heroLine ? (hover?.values.get(heroLine.key) ?? null) : null,
      }),
    [heroLine, hover],
  );

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden",
        bordered ? SURFACE_SHELL_CLASS : "bg-transparent",
      )}
    >
      {/* Row 1 · 부위명(또는 커스텀 slot) + 기준 라인 등급 · 우측 단위 + 기간 + granularity */}
      {/* 좁은 자리(개체 페이지 1열)에서는 오른쪽 묶음이 아랫줄로 내려간다 · 잘리는 것보다 낫다 */}
      <header className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 px-3 pt-2.5">
        {headerLeft ?? (
          <h4
            className={cn(
              "flex items-baseline gap-1.5 text-[13px] font-bold",
              palette.titleClass,
            )}
          >
            {normalizedPart}
            {heroLine ? (
              <span
                className={cn(
                  "text-[11px] font-semibold",
                  palette.mutedTextClass,
                )}
              >
                {formatLineLabel(heroLine.grade, heroLine.yieldG)}
              </span>
            ) : null}
          </h4>
        )}
        {compact ? (
          headerRight
        ) : (
          // 「단위 : 원/kg」 는 바로 아래 현재가가 이미 달고 있어 뺐다 · 좁은 열에서 이 라벨이
          // 탭을 밀어 눌렀고, 눌린 탭은 글자가 세로로 쪼개졌다
          <div className="flex shrink-0 items-center gap-2">
            <RangeTabs value={range} onChange={setRange} />
            <GranularityTabs value={granularity} onChange={setGranularity} />
            {headerAction}
          </div>
        )}
      </header>

      {/* Row 1.5 · 시세 히어로 · hover 시 그 시점 값, 아니면 최신값 · 우측 노출 기간 내 고가/저가 + 건수 */}
      <PriceHero
        stats={heroStats}
        granularity={granularity}
        palette={palette}
        compact={compact}
      />

      {/* Row 2 · 켜진 등급 범례 + 등급 추가 · 우측 분석 오버레이 토글 + 통합 토글 */}
      {/* 등급 묶음(1++ A B C)은 줄바꿈이 안 되는 덩어리라 좁으면 토글을 아랫줄로 내린다 */}
      <div
        className={cn(
          "flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-line-soft px-3 py-1.5",
          compact ? "hidden" : "flex",
        )}
      >
        {/* flex-1 로 두면 토글이 내려가는 대신 범례가 눌려 잘린다 · 제 폭을 갖고 줄을 넘긴다 */}
        <div className="flex items-center gap-2">
          <LineLegend
            selected={selectedLines}
            heroGrade={shownGrade}
            onToggle={toggleLine}
            onPickGrade={(g) => (yieldUnified ? toggleLine(g) : toggleGroup(g))}
            yieldUnified={yieldUnified}
            palette={palette}
          />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <OverlayToggles
            value={overlays}
            onToggle={toggleOverlay}
            palette={palette}
          />
          <span className="mx-0.5 h-4 w-px bg-surface-strong" aria-hidden />
          <YieldUnifyToggle
            checked={yieldUnified}
            onChange={handleUnifiedChange}
            palette={palette}
          />
        </div>
      </div>

      {/* 차트 */}
      <div className="relative pb-2">
        {!hasAny ? (
          <div
            className={cn(
              "flex items-center justify-center text-[11px]",
              palette.mutedTextClass,
            )}
            style={{ height: chartHeight }}
          >
            {anyLoading ? "불러오는 중…" : "데이터 없음"}
          </div>
        ) : (
          <PriceLineChart
            key={tone}
            seriesList={lineSeriesData}
            heroKey={heroLine?.key ?? null}
            granularity={granularity}
            rangeDays={rangeDays}
            height={chartHeight}
            referencePrice={referencePrice ?? null}
            overlays={overlays}
            onHover={setHover}
            palette={palette}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PriceHero · Upbit 형 시세 요약 스트립                              */
/* ------------------------------------------------------------------ */

/** 크로스헤어 hover 스냅샷 · 차트 → 부모 헤더로 올라가는 값 */
interface ChartHoverInfo {
  date: Date;
  values: Map<LineKey, number>;
}

interface HeroStats {
  /** 표시 시점(최신 또는 hover) 가중 평균단가 */
  latest: number | null;
  /** 직전 시점 대비 절대 변화 */
  diff: number | null;
  /** 직전 시점 대비 변화율 (%) */
  pct: number | null;
  /** 표시 시점 최고/최저 낙찰 단가 (낙찰가 범위 띠와 같은 값) · 범위가 없으면 평균으로 대체 */
  high: number | null;
  low: number | null;
  /** 표시 시점 낙찰(거래) 건수 */
  count: number | null;
  /** 표시 시점 상장 건수 (마감 기준) */
  listed: number | null;
  /** 표시 시점 낙찰률 (0~1) · 상장 건수가 없으면 null */
  rate: number | null;
  /** hover 중이면 그 시점 날짜 · 아니면 null (→ "전일 대비" 캡션) */
  hoverDate: Date | null;
}

const EMPTY_HERO_STATS: HeroStats = {
  latest: null,
  diff: null,
  pct: null,
  high: null,
  low: null,
  count: null,
  listed: null,
  rate: null,
  hoverDate: null,
};

/** 낙찰률 · 상장 0 이면 산출 불가 · 진행 중 상장이 섞여 1 을 넘는 경우 1 로 클램프 */
function settlementRateOf(p: PricePoint): number | null {
  if (p.listed <= 0) return null;
  return Math.min(1, p.count / p.listed);
}

const COMPARE_LABEL: Record<PriceGranularity, string> = {
  day: "전일 대비",
  week: "전주 대비",
  month: "전월 대비",
};

/**
 * 시리즈 포인트 → 히어로 요약.
 * - 표시 시점: hover 중이면 그 날짜의 포인트, 아니면 마지막 포인트
 * - 비교 대상: 같은 granularity 의 직전 포인트
 * - 고가/저가: 표시 시점의 최고/최저 낙찰가 (거래소의 "당일 고가/저가" 와 같은 정의 · hover 따라 바뀜)
 */
function buildHeroStats({
  points,
  hoverDate,
  hoverValue,
}: {
  points: PricePoint[];
  hoverDate: Date | null;
  hoverValue: number | null;
}): HeroStats {
  if (points.length === 0) return EMPTY_HERO_STATS;

  let idx = points.length - 1;
  if (hoverDate && hoverValue !== null) {
    const target = toUtcDayStart(hoverDate);
    const found = points.findIndex((p) => toUtcDayStart(p.date) === target);
    if (found >= 0) idx = found;
  }
  const current = points[idx];
  const prevPoint = idx > 0 ? points[idx - 1] : null;

  const diff = prevPoint ? current.value - prevPoint.value : null;
  const pct =
    prevPoint && prevPoint.value > 0 && diff !== null
      ? (diff / prevPoint.value) * 100
      : null;
  return {
    latest: current.value,
    diff,
    pct,
    high: current.high ?? current.value,
    low: current.low ?? current.value,
    count: current.count,
    listed: current.listed,
    rate: settlementRateOf(current),
    hoverDate: hoverDate ? current.date : null,
  };
}

/** 국내 시세 관례 · 상승 red / 하락 blue / 보합 slate */
function getChangeTone(diff: number | null): "up" | "down" | "flat" {
  if (diff === null || diff === 0) return "flat";
  return diff > 0 ? "up" : "down";
}

/** 국내 시세 관례 색 · 밝기 보정은 `rise`/`fall` 토큰이 명암별로 알아서 한다 */
const CHANGE_TONE_CLASS = {
  up: "text-rise",
  down: "text-fall",
  flat: "text-content-soft",
} as const;

/**
 * 등급 + 육량 · 표의 등급 열과 같은 표기 (`1++A(9)` · `1+A` · `2A`).
 * 육량은 등급 문자 바로 뒤에 붙고 근내지방 점수는 괄호로 뒤에 남는다.
 */
function formatLineLabel(grade: GradeKey, yieldG: YieldGrade | null): string {
  if (!yieldG) return grade;
  const m = grade.match(/^(.*?)(\(\d+\))$/);
  return m ? `${m[1]}${yieldG}${m[2]}` : `${grade}${yieldG}`;
}

/**
 * 시세 히어로 · 업비트 가격 블록 구조.
 *   좌 · 큰 평균단가(등락색) + 단위 · 아랫줄 등락률·등락폭 · 비교 캡션
 *   우 · 2×2 스탯 · 고가 red / 저가 blue · 낙찰률 / 낙찰(상장)
 * hover 중이면 모든 값이 그 시점으로 바뀐다.
 */
function PriceHero({
  stats,
  granularity,
  palette,
  compact,
}: {
  stats: HeroStats;
  granularity: PriceGranularity;
  palette: ChartPalette;
  compact: boolean;
}) {
  const tone = getChangeTone(stats.diff);
  const arrow = tone === "up" ? "▲" : tone === "down" ? "▼" : "";
  const toneClass = CHANGE_TONE_CLASS[tone];

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-b px-3 pt-2",
        compact ? "pb-2" : "pb-3",
        palette.dividerClass,
      )}
    >
      {/* 좌 · 가격 블록 */}
      <div className="min-w-0 shrink-0">
        <div className="flex items-baseline gap-1">
          <span
            className={cn(
              "font-bold leading-none tabular-nums tracking-[-0.02em]",
              // 좁은 요약 레일에서는 28px 가 카드를 다 먹는다 · 값보다 선이 주인공
              compact ? "text-[20px]" : "text-[28px]",
              stats.latest === null ? palette.mutedTextClass : toneClass,
            )}
          >
            {stats.latest !== null
              ? NUMBER_FORMATTER.format(stats.latest)
              : "—"}
          </span>
          <span
            className={cn(
              "font-semibold leading-none",
              compact ? "text-[10.5px]" : "text-[11px]",
              palette.subTextClass,
            )}
          >
            원/kg
          </span>
        </div>
        {/*
         * 호버로 값이 바뀌어도 이 줄의 폭이 흔들리면 안 된다 · 폭이 변하면 줄바꿈
         * 임계를 넘나들며 카드 높이가 튀고, 옆 칸(사진)이 그만큼 커졌다 작아진다.
         * 자릿수가 늘어도 버티도록 바닥 폭을 주고, 날짜는 차트 축 배지에 맡긴다.
         */}
        <div
          className={cn(
            "flex items-baseline gap-2",
            compact ? "mt-1" : "mt-1.5 min-w-[132px]",
          )}
        >
          {stats.diff !== null && stats.pct !== null ? (
            <span
              className={cn(
                "flex items-baseline gap-1.5 font-semibold leading-none tabular-nums",
                compact ? "text-[11.5px]" : "text-[12.5px]",
                toneClass,
              )}
            >
              <span>
                {stats.pct > 0 ? "+" : ""}
                {stats.pct.toFixed(2)}%
              </span>
              <span>
                {arrow} {NUMBER_FORMATTER.format(Math.abs(stats.diff))}
              </span>
            </span>
          ) : (
            <span
              className={cn(
                "text-[12.5px] leading-none",
                palette.mutedTextClass,
              )}
            >
              —
            </span>
          )}
          <span
            className={cn(
              "text-[10.5px] leading-none tabular-nums",
              palette.mutedTextClass,
            )}
          >
            {COMPARE_LABEL[granularity]}
          </span>
        </div>
      </div>

      {/* 우 · 2×2 스탯 · 축약형에서는 뺀다 (고가/저가는 가격축이 이미 말해 준다) */}
      <dl
        className={cn(
          "grid-cols-2 gap-x-6 gap-y-2.5",
          compact ? "hidden" : "grid",
        )}
      >
        <HeroStat label="최고가" value={stats.high} valueClass="text-rise" />
        <HeroStat
          label="낙찰률"
          value={stats.rate !== null ? Math.round(stats.rate * 100) : null}
          unit="%"
        />
        <HeroStat label="최저가" value={stats.low} valueClass="text-fall" />
        <HeroStat
          label="낙찰(상장)"
          value={stats.count}
          secondary={stats.listed}
          unit="건"
        />
      </dl>
    </div>
  );
}

/**
 * 스탯 1칸 · 라벨 좌 / 값 우 (업비트 고가·저가·거래량 표와 같은 정렬).
 * `secondary` 가 있으면 `25 / 30 건` 처럼 분모를 옅게 붙인다.
 */
function HeroStat({
  label,
  value,
  secondary,
  unit,
  valueClass,
}: {
  label: string;
  value: number | null;
  secondary?: number | null;
  unit?: string;
  valueClass?: string;
}) {
  return (
    <div className="flex min-w-[136px] items-baseline justify-between gap-3">
      <dt className="text-[12px] font-medium leading-none text-content-soft">
        {label}
      </dt>
      <dd
        className={cn(
          "text-[14px] font-semibold leading-none tabular-nums",
          valueClass ?? "text-content",
        )}
      >
        {value !== null ? (
          <>
            {NUMBER_FORMATTER.format(value)}
            {secondary !== undefined && secondary !== null ? (
              <span className="font-medium text-content-faint">
                {" / "}
                {NUMBER_FORMATTER.format(secondary)}
              </span>
            ) : null}
            {unit ? (
              <span className="ml-0.5 text-[11px] font-medium text-content-faint">
                {unit}
              </span>
            ) : null}
          </>
        ) : (
          <span className="text-content-ghost">—</span>
        )}
      </dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PriceLineChart · AuctionLab port (single series)                   */
/* ------------------------------------------------------------------ */

interface PriceLineChartProps {
  seriesList: LineSeriesData[];
  /** 주인공 라인 · Area(옅은 채움) + 2px + 마지막값 라벨 · 나머지는 1px 보조선 */
  heroKey: LineKey | null;
  granularity: PriceGranularity;
  /** 노출 기간(캘린더 일수) · null 이면 전체 */
  rangeDays: number | null;
  height: number;
  referencePrice: { value: number; label: string } | null;
  overlays: OverlayState;
  /** 크로스헤어 이동 → 부모 헤더 갱신 · 이탈 시 null */
  onHover: (info: ChartHoverInfo | null) => void;
  palette: ChartPalette;
}

type PriceSeriesApi = ISeriesApi<"Line">;

function PriceLineChart({
  seriesList,
  heroKey,
  granularity,
  rangeDays,
  height,
  referencePrice,
  overlays,
  onHover,
  palette,
}: PriceLineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const lineSeriesRefsRef = useRef<Map<string, PriceSeriesApi>>(new Map());
  /** 주인공 시리즈 · hover 중엔 마지막값 축 라벨을 숨겨 축에 칩이 항상 하나만 보이게 */
  const heroSeriesRef = useRef<PriceSeriesApi | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const listedSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  // 분석 오버레이 시리즈 · 주인공 라인 파생 (MA · 낙찰률) · 시리즈 재구성마다 함께 정리
  const overlaySeriesRef = useRef<ISeriesApi<"Line">[]>([]);
  const bandPrimitiveRef = useRef<SettlementBandPrimitive | null>(null);
  // 기준선(최저단가) · 첫 라인 시리즈에 붙는 priceLine · 시리즈 재구성마다 다시 생성
  const referenceLineRef = useRef<{
    series: PriceSeriesApi;
    line: IPriceLine;
  } | null>(null);
  // 라인별 hover Y축 라벨 · 호버 시에만 axisLabelVisible=true
  const hoverPriceLinesRef = useRef<Map<string, IPriceLine>>(new Map());
  // 볼륨 pane hover 라벨 · 마우스 위치 날짜의 건수를 우측 Y축에 pop
  const hoverVolumeLineRef = useRef<IPriceLine | null>(null);

  /**
   * 호버 스냅샷을 부모로 전달 · requestAnimationFrame 으로 스로틀링.
   * onHover 는 init effect(1회) 안에서 쓰이므로 ref 로 최신 콜백을 참조.
   */
  const onHoverRef = useRef(onHover);
  onHoverRef.current = onHover;

  /**
   * 기준선 라벨 · 캔버스 좌측에 HTML 칩으로 띄운다.
   * lightweight-charts 의 priceLine title 은 axisLabelVisible 일 때만 그려지는데,
   * 축 라벨을 켜면 주인공 마지막값 라벨과 충돌하므로 축 라벨은 끄고 좌측 오버레이로 대체.
   * y 좌표는 가격축 autoscale 에 따라 움직이므로 범위 변경·리사이즈마다 다시 계산.
   */
  const [refLabel, setRefLabel] = useState<{
    y: number;
    /** 기준선이 pane 밖이면 어느 쪽으로 벗어났는지 · 칩을 가장자리에 고정하고 화살표로 방향 표시 */
    clamped: "above" | "below" | null;
  } | null>(null);
  const updateRefLabel = () => {
    const ref = referenceLineRef.current;
    const chart = chartRef.current;
    if (!ref || !referencePrice || !chart) {
      setRefLabel(null);
      return;
    }
    const y = ref.series.priceToCoordinate(referencePrice.value);
    if (y === null) {
      setRefLabel(null);
      return;
    }
    const paneHeight = chart.panes()[0]?.getHeight() ?? 0;
    if (paneHeight > 0 && y < 0) {
      setRefLabel({ y: REFERENCE_CHIP_EDGE_INSET, clamped: "above" });
      return;
    }
    if (paneHeight > 0 && y > paneHeight) {
      setRefLabel({
        y: paneHeight - REFERENCE_CHIP_EDGE_INSET,
        clamped: "below",
      });
      return;
    }
    setRefLabel({ y: Math.round(y), clamped: null });
  };
  const updateRefLabelRef = useRef(updateRefLabel);
  updateRefLabelRef.current = updateRefLabel;

  const pendingHoverRef = useRef<ChartHoverInfo | null>(null);
  const rafRef = useRef<number | null>(null);
  const flushHover = () => {
    onHoverRef.current(pendingHoverRef.current);
    rafRef.current = null;
  };
  const scheduleHover = (next: ChartHoverInfo | null) => {
    pendingHoverRef.current = next;
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(flushHover);
  };

  /* ─── 1. 차트 1회 init ─────────────────────── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: palette.canvasBg },
        // Upbit 스타일 · 축 텍스트는 본문보다 한 단계만 옅게
        textColor: palette.axisText,
        fontSize: 11,
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto',
        panes: {
          separatorColor: palette.paneSeparator,
          separatorHoverColor: palette.paneSeparatorHover,
          enableResize: false,
        },
        attributionLogo: false,
      },
      grid: {
        // 수직 격자 없음 · 수평 격자는 극도로 옅게 (눈금 위치만 · 선으로 읽히지 않게)
        vertLines: { visible: false },
        horzLines: { color: palette.grid, style: LineStyle.Solid },
      },
      rightPriceScale: {
        borderColor: palette.axisBorder,
        scaleMargins: { top: 0.1, bottom: 0.08 },
        entireTextOnly: true,
        ticksVisible: false,
        // 라벨 폭 고정 · 값 자릿수가 바뀌어도 캔버스 폭이 흔들리지 않음
        minimumWidth: 60,
      },
      timeScale: {
        borderColor: palette.axisBorder,
        timeVisible: false,
        secondsVisible: false,
        ticksVisible: false,
        // 마지막 바 우측 여백 · 마지막값 라벨과 선 끝이 겹치지 않게
        rightOffset: 4,
        fixRightEdge: true,
        tickMarkFormatter: makeTickFormatter(granularity),
      },
      localization: {
        locale: "ko-KR",
        timeFormatter: makeTimeFormatter(granularity),
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        // 세로선만 실선으로 · 가로선은 제거 (값은 우측 축 라벨 배지가 담당 → 선 두 개가 교차하는 클러터 제거)
        vertLine: {
          color: palette.crosshair,
          width: 1,
          style: LineStyle.Solid,
          labelBackgroundColor: palette.badgeBg,
        },
        horzLine: {
          visible: false,
          labelVisible: false,
        },
      },
      handleScroll: {
        // 차트 몸통 마우스 드래그로 좌/우 시간축 팬
        pressedMouseMove: true,
        horzTouchDrag: true,
        // 휠 팬은 끔 (스케일과 명확히 분리하기 위함)
        mouseWheel: false,
        vertTouchDrag: false,
      },
      handleScale: {
        // 우측 가격축(Y) · 하단 시간축(X) 잡고 드래그하면 각각 스케일 조절
        axisPressedMouseMove: true,
        // 차트 위에서 마우스 휠 → 커서 기준 시간축 줌 인/아웃
        mouseWheel: true,
        pinch: true,
      },
      autoSize: false,
      width: el.clientWidth,
      height,
    });

    chartRef.current = chart;

    const setHeroLastValueVisible = (visible: boolean) => {
      const hero = heroSeriesRef.current;
      if (!hero) return;
      try {
        hero.applyOptions({ lastValueVisible: visible });
      } catch {
        // series already removed
      }
    };

    // hover 시 라인별 우측 Y축 라벨 pop + 상단 InfoBar 갱신
    const handleCrosshairMove = (param: MouseEventParams) => {
      const invalid =
        !param ||
        !param.time ||
        !param.point ||
        param.point.x < 0 ||
        param.point.y < 0;

      if (invalid) {
        // 모든 hover 라벨 숨김
        hoverPriceLinesRef.current.forEach((line) => {
          try {
            line.applyOptions({ axisLabelVisible: false });
          } catch {
            // series already removed
          }
        });
        if (hoverVolumeLineRef.current) {
          try {
            hoverVolumeLineRef.current.applyOptions({
              axisLabelVisible: false,
            });
          } catch {
            // ignored
          }
        }
        setHeroLastValueVisible(true);
        scheduleHover(null);
        return;
      }

      // hover 중엔 마지막값 칩 숨김 · 축엔 항상 칩 하나 (겹침 구조적으로 제거)
      setHeroLastValueVisible(false);

      // 라인별 값 수집 + 각 hover 라벨 갱신
      const values = new Map<LineKey, number>();
      lineSeriesRefsRef.current.forEach((seriesApi, key) => {
        const data = param.seriesData.get(seriesApi) as LineData | undefined;
        const hoverLine = hoverPriceLinesRef.current.get(key);
        if (data && typeof data.value === "number") {
          values.set(key, data.value);
          if (hoverLine) {
            try {
              hoverLine.applyOptions({
                price: data.value,
                axisLabelVisible: true,
              });
            } catch {
              // ignored
            }
          }
        } else if (hoverLine) {
          try {
            hoverLine.applyOptions({ axisLabelVisible: false });
          } catch {
            // ignored
          }
        }
      });

      // 볼륨 hover 라벨 갱신 (그 날 건수)
      if (volumeSeriesRef.current && hoverVolumeLineRef.current) {
        const volData = param.seriesData.get(volumeSeriesRef.current) as
          { value: number } | undefined;
        try {
          if (volData && typeof volData.value === "number") {
            hoverVolumeLineRef.current.applyOptions({
              price: volData.value,
              axisLabelVisible: true,
            });
          } else {
            hoverVolumeLineRef.current.applyOptions({
              axisLabelVisible: false,
            });
          }
        } catch {
          // ignored
        }
      }

      // 상단 InfoBar 갱신
      const timeSec = param.time as unknown as number;
      const date = new Date(timeSec * 1000);
      scheduleHover({ date, values });
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);

    // 가시 범위가 바뀌면 가격축 autoscale 도 바뀌므로 기준선 라벨 y 재계산
    const handleRangeChange = () => {
      requestAnimationFrame(() => updateRefLabelRef.current());
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(handleRangeChange);

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? el.clientWidth;
      chart.applyOptions({ width: Math.max(240, Math.floor(w)) });
      handleRangeChange();
    });
    ro.observe(el);

    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleRangeChange);
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      lineSeriesRefsRef.current.clear();
      heroSeriesRef.current = null;
      volumeSeriesRef.current = null;
      hoverPriceLinesRef.current.clear();
      hoverVolumeLineRef.current = null;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    // 초기화는 마운트 시 1회. height/granularity 변화는 별도 effect 에서 applyOptions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── 2. height / granularity 변화 적용 ─────── */
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.applyOptions({
      height,
      timeScale: {
        timeVisible: false,
        secondsVisible: false,
        tickMarkFormatter: makeTickFormatter(granularity),
      },
      localization: {
        locale: "ko-KR",
        timeFormatter: makeTimeFormatter(granularity),
      },
    });
  }, [height, granularity]);

  /* ─── 3. 시리즈 재구성 (데이터 변화) ─── */
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    // 기존 라인 시리즈 전부 정리
    lineSeriesRefsRef.current.forEach((s) => {
      try {
        chart.removeSeries(s);
      } catch {
        // ignored
      }
    });
    lineSeriesRefsRef.current.clear();
    heroSeriesRef.current = null;

    overlaySeriesRef.current.forEach((s) => {
      try {
        chart.removeSeries(s);
      } catch {
        // ignored
      }
    });
    overlaySeriesRef.current = [];

    if (volumeSeriesRef.current) {
      try {
        chart.removeSeries(volumeSeriesRef.current);
      } catch {
        // ignored
      }
      volumeSeriesRef.current = null;
    }
    if (listedSeriesRef.current) {
      try {
        chart.removeSeries(listedSeriesRef.current);
      } catch {
        // ignored
      }
      listedSeriesRef.current = null;
    }
    hoverPriceLinesRef.current.clear();
    hoverVolumeLineRef.current = null;
    // 기준선은 시리즈와 함께 제거됨 · ref 만 비움 (아래 4번 effect 가 다시 그림)
    referenceLineRef.current = null;

    if (seriesList.length === 0) return;

    const priceFormat = {
      type: "custom" as const,
      formatter: formatPriceAxis,
      minMove: 1,
    };

    // 라인 시리즈 생성 · 직선 연결(스무딩 없음 · 곡선 보간은 일별 노이즈를 "출렁임" 으로 과장한다)
    //  - 주인공(heroKey): 2px · 마지막값 라벨 · 크로스헤어 마커
    //  - 보조(B/C 또는 다른 등급): 1px · 옅게 · 라벨 없음 → 위계가 선 자체에서 읽힘
    seriesList.forEach((gs) => {
      if (gs.points.length === 0) return;
      const isHero = gs.key === heroKey;
      const styleOpts = getLineStyleOptions(gs.yieldG);
      // 농도는 흰색 혼합(불투명)으로 · rgba 를 쓰면 마지막값 축 라벨이 반투명해져 얼룩짐
      const lineColor = toneColor(gs.color, styleOpts.alpha);
      const lineData: LineData[] = gs.points.map((p) => ({
        time: dateToTime(p.date),
        value: p.value,
      }));

      const lineApi = chart.addSeries(LineSeries, {
        color: lineColor,
        lineWidth: styleOpts.lineWidth,
        lineStyle: LineStyle.Solid,
        lineType: LineType.Simple,
        // 주인공만 마지막값 축 라벨 + 크로스헤어 마커 · 보조선은 둘 다 없음
        lastValueVisible: isHero,
        priceLineVisible: false,
        crosshairMarkerVisible: isHero,
        crosshairMarkerRadius: 3,
        crosshairMarkerBorderWidth: 2,
        crosshairMarkerBorderColor: palette.markerBorder,
        crosshairMarkerBackgroundColor: gs.color,
        priceFormat,
      });
      lineApi.setData(lineData);
      lineSeriesRefsRef.current.set(gs.key, lineApi);
      if (isHero) heroSeriesRef.current = lineApi;

      // 라인별 hover priceLine · 라인은 안 그리고 라벨만 hover 시 pop
      // 칩은 중립 먹색 · 마지막값 칩(시리즈 색)과 역할이 색으로 갈린다
      const hoverLine = lineApi.createPriceLine({
        price: 0,
        color: palette.badgeBg,
        lineWidth: 1,
        lineStyle: 0,
        lineVisible: false,
        axisLabelVisible: false,
        axisLabelColor: palette.badgeBg,
        axisLabelTextColor: palette.badgeText,
        title: "",
      });
      hoverPriceLinesRef.current.set(gs.key, hoverLine);
    });

    // 낙찰가 범위 밴드 · 주인공 라인 뒤 · 그 시점 최저~최고 낙찰가를 라인 색의 옅은 띠로
    //   시리즈가 아니라 primitive 라 hover/축 라벨에 끼어들지 않는다.
    //   토글 여부와 무관하게 항상 붙여 두고 그리기만 켜고 끈다 → 가격축 범위가 토글에 흔들리지 않는다
    const heroSeriesData = seriesList.find((s) => s.key === heroKey);
    const heroPoints = heroSeriesData?.points ?? [];
    const heroApi = heroKey
      ? lineSeriesRefsRef.current.get(heroKey)
      : undefined;
    bandPrimitiveRef.current = null;
    if (heroApi && heroSeriesData) {
      const bandPoints: BandPoint[] = [];
      for (const p of heroPoints) {
        if (p.low === null || p.high === null || p.high <= p.low) continue;
        bandPoints.push({
          time: dateToTime(p.date) as UTCTimestamp,
          low: p.low,
          high: p.high,
        });
      }
      if (bandPoints.length >= 2) {
        const band = new SettlementBandPrimitive(
          bandPoints,
          hexToRgba(heroSeriesData.color, BAND_FILL_ALPHA),
          hexToRgba(heroSeriesData.color, BAND_EDGE_ALPHA),
          overlays.band,
        );
        heroApi.attachPrimitive(band);
        bandPrimitiveRef.current = band;
      }
    }

    // 하단 pane · 상장/낙찰 누적 막대 · 등급 별 합산
    //   옅은 막대 = 상장 건수, 그 위 진한 막대 = 낙찰 건수 → 채워진 비율이 낙찰률, 빈 윗부분이 유찰
    const volumeMap = new Map<
      UTCTimestamp,
      { count: number; listed: number }
    >();
    for (const gs of seriesList) {
      for (const p of gs.points) {
        const t = dateToTime(p.date) as UTCTimestamp;
        const acc = volumeMap.get(t) ?? { count: 0, listed: 0 };
        acc.count += p.count;
        acc.listed += p.listed;
        volumeMap.set(t, acc);
      }
    }
    const volumeEntries = [...volumeMap.entries()].sort(
      (a, b) => (a[0] as number) - (b[0] as number),
    );
    const volumeData: HistogramData[] = volumeEntries.map(([time, v]) => ({
      time,
      value: v.count,
      color: palette.volumeBar,
    }));
    // 상장 막대는 낙찰보다 클 때만 의미 (진행 중 상장이 섞여 작으면 낙찰 막대에 가려짐)
    const listedData: HistogramData[] = volumeEntries.map(([time, v]) => ({
      time,
      value: Math.max(v.listed, v.count),
      color: palette.listedBar,
    }));

    if (volumeData.length > 0) {
      const panes = chart.panes();
      if (panes.length < 2) {
        chart.addPane();
      }
      const allPanes = chart.panes();
      const mainPane = allPanes[0];
      const volumePane = allPanes[1];
      if (mainPane && typeof mainPane.setStretchFactor === "function") {
        mainPane.setStretchFactor(PRICE_PANE_STRETCH);
      }
      if (volumePane && typeof volumePane.setStretchFactor === "function") {
        volumePane.setStretchFactor(VOLUME_PANE_STRETCH);
      }

      // 상장 막대 먼저(뒤) · 낙찰 막대 나중(앞) · 같은 pane 우측 축을 공유해 높이가 비교된다
      const listedApi = chart.addSeries(
        HistogramSeries,
        {
          color: palette.listedBar,
          priceFormat: {
            type: "custom" as const,
            formatter: formatVolumeKR,
            minMove: 1,
          },
          priceLineVisible: false,
          lastValueVisible: false,
        },
        1,
      );
      listedApi.setData(listedData);
      listedSeriesRef.current = listedApi;

      const volumeApi = chart.addSeries(
        HistogramSeries,
        {
          color: palette.volumeBar,
          priceFormat: {
            type: "custom" as const,
            formatter: formatVolumeKR,
            minMove: 1,
          },
          priceLineVisible: false,
          lastValueVisible: false,
        },
        1,
      );
      volumeApi.priceScale().applyOptions({
        borderColor: palette.axisBorder,
        scaleMargins: { top: 0.2, bottom: 0.02 },
        ticksVisible: true,
        entireTextOnly: true,
      });
      volumeApi.setData(volumeData);
      volumeSeriesRef.current = volumeApi;

      // 볼륨 pane 도 hover 시 그 날 건수만 라벨로 pop
      hoverVolumeLineRef.current = volumeApi.createPriceLine({
        price: 0,
        color: palette.badgeBg,
        lineWidth: 1,
        lineStyle: 0,
        lineVisible: false,
        axisLabelVisible: false,
        axisLabelColor: palette.badgeBg,
        axisLabelTextColor: palette.badgeText,
        title: "",
      });
    }

    // 시리즈가 바뀌었으니 기준선 라벨 좌표 재계산
    const raf = requestAnimationFrame(() => updateRefLabelRef.current());
    return () => cancelAnimationFrame(raf);
    // overlays.band 는 deps 에서 제외 · 아래 3c 에서 그리기만 토글 (시리즈·축 재생성 없음)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesList, heroKey]);

  /* ─── 3c. 낙찰가 범위 표시 토글 · 축 범위는 그대로, 띠만 켜고 끈다 ─── */
  useEffect(() => {
    bandPrimitiveRef.current?.setVisible(overlays.band);
  }, [overlays.band]);

  /* ─── 3b. 노출 기간 · 데이터 마지막 시점을 우측 anchor 로 캘린더 일수 창 ─── */
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const firstPoints = seriesList[0]?.points ?? [];
    if (firstPoints.length === 0) return;

    if (rangeDays === null) {
      chart.timeScale().fitContent();
      return;
    }
    const lastDate = firstPoints[firstPoints.length - 1].date;
    const fromDate = new Date(lastDate);
    fromDate.setDate(fromDate.getDate() - rangeDays);
    chart.timeScale().setVisibleRange({
      from: dateToTime(fromDate),
      to: dateToTime(lastDate),
    });
  }, [seriesList, rangeDays]);

  /* ─── 4. 기준선(선택 부위 최저단가) ─────────── */
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    // 이전 기준선 제거 (시리즈가 살아있을 때만)
    const prev = referenceLineRef.current;
    if (prev) {
      try {
        prev.series.removePriceLine(prev.line);
      } catch {
        // series already removed
      }
      referenceLineRef.current = null;
    }

    if (!referencePrice || !Number.isFinite(referencePrice.value)) {
      setRefLabel(null);
      return;
    }
    const host =
      (heroKey ? lineSeriesRefsRef.current.get(heroKey) : undefined) ??
      (lineSeriesRefsRef.current.values().next().value as
        PriceSeriesApi | undefined);
    if (!host) return;

    // 기준선이 시세 범위 근처면 가격축을 늘려 화면에 담는다 (priceLine 은 자동 스케일에 안 잡힘)
    //   너무 멀면 시세가 눌리므로 축은 그대로 두고 칩만 가장자리에 고정 (updateRefLabel)
    const refValue = referencePrice.value;
    host.applyOptions({
      autoscaleInfoProvider: (original) => {
        const base = original();
        if (!base?.priceRange) return base;
        const { minValue, maxValue } = base.priceRange;
        const tolerance =
          Math.max(maxValue - minValue, maxValue * 0.02) *
          (1 + REFERENCE_AUTOSCALE_TOLERANCE);
        const nearEnough =
          refValue >= minValue - tolerance && refValue <= maxValue + tolerance;
        if (!nearEnough) return base;
        return {
          ...base,
          priceRange: {
            minValue: Math.min(minValue, refValue),
            maxValue: Math.max(maxValue, refValue),
          },
        };
      },
    });

    // 축 라벨은 끔 · 주인공 마지막값 라벨 하나만 축에 남기고, 기준선 라벨은 좌측 HTML 칩(refLabel)
    const line = host.createPriceLine({
      price: referencePrice.value,
      color: palette.referenceLine,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed, // 시세 라인(실선)과 구분
      lineVisible: true,
      axisLabelVisible: false,
      title: "",
    });
    referenceLineRef.current = { series: host, line };
    // 가격축 autoscale 반영 후 좌표 계산
    const raf = requestAnimationFrame(() => updateRefLabelRef.current());
    return () => cancelAnimationFrame(raf);
  }, [seriesList, heroKey, referencePrice, rangeDays, palette.referenceLine]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="w-full overflow-hidden"
        style={{ height, minHeight: height }}
      />
      {referencePrice && refLabel !== null ? (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute left-2 z-10 inline-flex -translate-y-1/2 items-center gap-1 border px-1.5 py-[1px] text-[10px] font-semibold leading-none tabular-nums",
            palette.refChipClass,
          )}
          style={{ top: refLabel.y }}
        >
          {refLabel.clamped === "above" ? "▲ " : null}
          {refLabel.clamped === "below" ? "▼ " : null}
          {referencePrice.label} {formatPriceAxis(referencePrice.value)}
        </span>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Toolbars                                                           */
/* ------------------------------------------------------------------ */

/** 노출 기간 프리셋 · 1M/3M/6M/1Y/전체 · granularity 탭과 같은 segmented 외형 */
function RangeTabs({
  value,
  onChange,
}: {
  value: RangePreset;
  onChange: (v: RangePreset) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="노출 기간"
      className="inline-flex h-7 shrink-0 items-center gap-0.5 rounded-md border border-line bg-surface-muted p-0.5"
    >
      {RANGE_PRESETS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "whitespace-nowrap rounded-[5px] px-1 text-[11px] font-semibold leading-6 tabular-nums transition-colors",
              active
                ? "bg-surface text-content shadow-sm ring-1 ring-line"
                : "text-content-soft hover:text-content",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function GranularityTabs({
  value,
  onChange,
}: {
  value: PriceGranularity;
  onChange: (v: PriceGranularity) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="평균가 산출 단위"
      className="inline-flex h-7 shrink-0 items-center gap-0.5 rounded-md border border-line bg-surface-muted p-0.5"
    >
      {GRANULARITY_TABS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "whitespace-nowrap rounded-[5px] px-2 text-[11px] font-semibold leading-6 transition-colors",
              active
                ? "bg-surface text-content shadow-sm ring-1 ring-line"
                : "text-content-soft hover:text-content",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * 시세 라인 범례.
 *
 * 등급을 바꾸는 입구는 등급 이름 자체다. 옆에 `등급 ▾` 버튼을 따로 두면 화면에는
 * 등급 이름이 이미 떠 있는데 그걸 바꾸는 손잡이만 다른 자리에 있는 꼴이라,
 * 두 개를 눈으로 잇는 일을 사용자가 한다. A/B/C 칩은 그대로 켜고 끄는 역할로 남는다.
 */
function LineLegend({
  selected,
  heroGrade,
  onToggle,
  onPickGrade,
  yieldUnified,
  palette,
}: {
  selected: Set<LineKey>;
  heroGrade: GradeKey;
  onToggle: (key: LineKey) => void;
  onPickGrade: (g: GradeKey) => void;
  yieldUnified: boolean;
  palette: ChartPalette;
}) {
  const activeGrades = ALL_GRADES.filter((g) =>
    yieldUnified
      ? selected.has(g)
      : YIELDS.some((y) => selected.has(makeLineKey(g, y))),
  );

  // 하나도 안 켜져 있으면 누를 등급 이름조차 없다 · 메뉴 입구를 따로 세운다
  if (activeGrades.length === 0) {
    return (
      <GradeMenu
        label="등급 선택"
        dash={null}
        selected={selected}
        heroGrade={heroGrade}
        yieldUnified={yieldUnified}
        onPick={onPickGrade}
        palette={palette}
      />
    );
  }

  return (
    <div
      role="group"
      aria-label="시세 라인 선택"
      className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1"
    >
      {activeGrades.map((g) => {
        const color = lineColorFor(g, heroGrade, palette);

        if (yieldUnified) {
          return (
            <GradeMenu
              key={g}
              label={g}
              dash={<LegendDash color={color} yieldG={null} emphasize />}
              selected={selected}
              heroGrade={heroGrade}
              yieldUnified={yieldUnified}
              onPick={onPickGrade}
              palette={palette}
            />
          );
        }

        // 통합 해제 · 등급 이름(= 등급 메뉴) + A/B/C 서브라인 pill
        return (
          <div
            key={g}
            className="inline-flex items-center gap-1 whitespace-nowrap"
          >
            <GradeMenu
              label={g}
              dash={null}
              selected={selected}
              heroGrade={heroGrade}
              yieldUnified={yieldUnified}
              onPick={onPickGrade}
              palette={palette}
            />
            {YIELDS.map((y) => {
              const key = makeLineKey(g, y);
              return (
                <LegendPill
                  key={key}
                  label={y}
                  color={color}
                  yieldG={y}
                  isSelected={selected.has(key)}
                  onClick={() => onToggle(key)}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/** 레전드 pill · 컬러 마커(굵기·농도 = 차트 라인과 동일 규칙) + 라벨. */
function LegendPill({
  label,
  color,
  yieldG,
  isSelected,
  onClick,
}: {
  label: string;
  color: string;
  yieldG: YieldGrade | null;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={isSelected}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:bg-surface-accent",
        !isSelected && "opacity-30 hover:opacity-70",
      )}
    >
      <LegendDash color={color} yieldG={yieldG} emphasize={false} />
      <span
        className={cn(
          "text-[10px] font-medium tabular-nums tracking-tight",
          isSelected ? "text-content" : "text-content-soft",
        )}
      >
        {label}
      </span>
    </button>
  );
}

/** 레전드 마커 · 차트 라인과 같은 굵기/농도 규칙 (A 2px 100% · B 2px 60% · C 1px 40%). */
function LegendDash({
  color,
  yieldG,
  emphasize,
}: {
  color: string;
  yieldG: YieldGrade | null;
  emphasize: boolean;
}) {
  const { lineWidth, alpha } = getLineStyleOptions(yieldG);
  return (
    <span
      aria-hidden
      className="inline-block rounded-sm"
      style={{
        width: emphasize ? 14 : 11,
        height: lineWidth,
        backgroundColor: toneColor(color, alpha),
      }}
    />
  );
}

/**
 * 등급 메뉴 · 방아쇠가 곧 등급 이름이다.
 * 켜져 있는 등급을 다시 고르면 꺼지므로 추가와 제거가 한 자리에서 끝난다.
 */
function GradeMenu({
  label,
  dash,
  selected,
  heroGrade,
  yieldUnified,
  onPick,
  palette,
}: {
  label: string;
  /** 통합 모드에서만 붙는 라인 마커 · 나머지는 이름만 */
  dash: React.ReactNode;
  selected: Set<LineKey>;
  heroGrade: GradeKey;
  yieldUnified: boolean;
  onPick: (g: GradeKey) => void;
  palette: ChartPalette;
}) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useClickAway(rootRef, () => setOpen(false));

  /*
   * 범례 줄은 차트 카드 위쪽 절반에 있지만 카드 자체가 화면 아래에 걸릴 때가 있다.
   * 카드는 `overflow-hidden` 이라 넘친 만큼이 잘려 나가고, 잘리는 건 언제나
   * 목록의 아래쪽 — 즉 등급이 낮은 쪽부터 사라져 고를 수 없게 된다.
   */
  useEffect(() => {
    if (!open) return;
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const needed = ALL_GRADES.length * MENU_ROW_HEIGHT + MENU_CHROME;
    setDropUp(window.innerHeight - r.bottom < needed && r.top > needed);
  }, [open]);

  const isActive = (g: GradeKey) =>
    yieldUnified
      ? selected.has(g)
      : YIELDS.some((y) => selected.has(makeLineKey(g, y)));

  return (
    <div ref={rootRef} className="relative inline-flex shrink-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label} · 등급 바꾸기`}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1 rounded px-1 py-0.5 text-[10.5px] font-semibold tabular-nums tracking-tight transition-colors hover:bg-surface-accent",
          open && "bg-surface-accent",
        )}
      >
        {/*
         * 글자는 시세색이 아니라 본문색이다. 등급 이름은 「지금 뭘 보고 있나」를
         * 말하는 라벨이라 빨강까지 쓰면 캔버스의 시세선과 세기가 같아져 둘 다 소리친다.
         * 선과의 연결은 옆의 마커(통합) 또는 A/B/C 칩의 마커가 이미 맡는다.
         */}
        {dash}
        <span className="text-content">{label}</span>
        <ChevronDown
          className={cn(
            "h-2.5 w-2.5 text-content-faint transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label="등급 선택"
          className={cn(
            "absolute left-0 z-30 min-w-[140px] rounded-md border border-line bg-surface p-1 shadow-md",
            dropUp ? "bottom-full mb-1" : "top-full mt-1",
          )}
        >
          {ALL_GRADES.map((g) => {
            const active = isActive(g);
            return (
              <li key={g}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onPick(g);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 whitespace-nowrap rounded px-2 py-1 text-left text-[11px] tabular-nums tracking-tight transition-colors hover:bg-surface-accent",
                    active
                      ? "font-semibold text-content"
                      : "font-medium text-content-mid",
                  )}
                >
                  <span
                    aria-hidden
                    className="inline-block h-[2px] w-3 shrink-0 rounded-sm"
                    style={{
                      backgroundColor: lineColorFor(g, heroGrade, palette),
                    }}
                  />
                  <span className="flex-1">{g}</span>
                  {active ? (
                    <span className="shrink-0 text-micro text-content-soft">
                      표시 중
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * 분석 오버레이 토글 · 낙찰가 범위.
 * 범례 pill 과 같은 문법(마커 + 라벨 · 꺼지면 옅게) · 마커는 차트 위 표현(띠/선)과 같은 모양.
 */
function OverlayToggles({
  value,
  onToggle,
  palette,
}: {
  value: OverlayState;
  onToggle: (key: OverlayKey) => void;
  palette: ChartPalette;
}) {
  const keys: OverlayKey[] = ["band"];
  return (
    <div
      role="group"
      aria-label="분석 오버레이"
      className="inline-flex items-center gap-0.5"
    >
      {keys.map((key) => {
        const on = value[key];
        return (
          <button
            key={key}
            type="button"
            role="checkbox"
            aria-checked={on}
            onClick={() => onToggle(key)}
            className={cn(
              "inline-flex h-6 items-center gap-1 rounded px-1.5 text-[10.5px] font-semibold tabular-nums tracking-tight transition-colors hover:bg-surface-accent",
              on ? "text-content" : "text-content-faint",
            )}
          >
            <OverlayMarker overlayKey={key} on={on} palette={palette} />
            {OVERLAY_LABEL[key]}
          </button>
        );
      })}
    </div>
  );
}

/** 오버레이 마커 · band 는 옅은 띠 (차트 위 표현과 같은 모양 · 주인공 색) */
function OverlayMarker({
  on,
  palette,
}: {
  overlayKey: OverlayKey;
  on: boolean;
  palette: ChartPalette;
}) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0"
      style={{
        width: 12,
        height: 6,
        backgroundColor: hexToRgba(
          on ? palette.heroLine : palette.crosshair,
          on ? 0.14 : 0.2,
        ),
        borderTop: `1px solid ${hexToRgba(on ? palette.heroLine : palette.crosshair, on ? 0.35 : 0.8)}`,
        borderBottom: `1px solid ${hexToRgba(on ? palette.heroLine : palette.crosshair, on ? 0.35 : 0.8)}`,
      }}
    />
  );
}

function YieldUnifyToggle({
  checked,
  onChange,
  palette,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  palette: ChartPalette;
}) {
  // 낙찰가 범위 토글과 같은 문법 · 마커(12×6) + 라벨 · 꺼지면 옅게
  //   마커 · 꺼짐 = A/B/C 세 줄이 따로, 켜짐 = 한 줄로 합쳐진 모양
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex h-6 select-none items-center gap-1 rounded px-1.5 text-[10.5px] font-semibold tracking-tight transition-colors hover:bg-surface-accent",
        checked ? "text-content" : "text-content-faint",
      )}
    >
      <svg
        aria-hidden
        viewBox="0 0 12 6"
        width={12}
        height={6}
        className="shrink-0"
      >
        {checked ? (
          <line
            x1="0"
            y1="3"
            x2="12"
            y2="3"
            stroke={palette.heroLine}
            strokeWidth="2"
          />
        ) : (
          <>
            <line
              x1="0"
              y1="0.5"
              x2="12"
              y2="0.5"
              stroke={palette.crosshair}
              strokeWidth="1"
            />
            <line
              x1="0"
              y1="3"
              x2="12"
              y2="3"
              stroke={palette.crosshair}
              strokeWidth="1"
            />
            <line
              x1="0"
              y1="5.5"
              x2="12"
              y2="5.5"
              stroke={palette.crosshair}
              strokeWidth="1"
            />
          </>
        )}
      </svg>
      육량등급 통합
    </button>
  );
}

function YieldSegmented({
  value,
  onChange,
}: {
  value: YieldGrade;
  onChange: (y: YieldGrade) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="육량 등급 필터"
      className="inline-flex h-7 items-center gap-0.5 rounded-md border border-line bg-surface-muted p-0.5"
    >
      {YIELDS.map((y) => {
        const isActive = value === y;
        return (
          <button
            key={y}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(y)}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-[5px] text-[10.5px] font-bold transition-colors",
              isActive
                ? "bg-surface text-content shadow-sm ring-1 ring-line"
                : "text-content-soft hover:text-content",
            )}
          >
            {y}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers · Context normalization                                    */
/* ------------------------------------------------------------------ */

/** `등심(좌)` → `등심` 같은 정규화. */
function toPartGroup(partName: string): string {
  return partName.replace(/\(좌\)|\(우\)/g, "").trim();
}

/* ------------------------------------------------------------------ */
/*  Formatters / Time helpers · AuctionLab port                        */
/* ------------------------------------------------------------------ */

/**
 * 통합(null) vs A/B/C 별 라인 스타일 정책 · 굵기 + 농도.
 *
 * 주인공(통합/A) 하나만 2px, 나머지는 1px 보조선 → 선 세 개가 같은 존재감으로 출렁이지 않는다.
 * (lightweight-charts LineWidth 는 정수 1|2|3|4 라 1.5px 는 농도로 대체)
 *  - 통합 / A · 2px · 100%
 *  - B          · 1px · 60%
 *  - C          · 1px · 40%
 */
function getLineStyleOptions(yieldG: YieldGrade | null): {
  lineWidth: 2 | 1;
  alpha: number;
} {
  if (yieldG === null || yieldG === "A") return { lineWidth: 2, alpha: 1 };
  if (yieldG === "B") return { lineWidth: 1, alpha: 0.6 };
  return { lineWidth: 1, alpha: 0.4 };
}

/**
 * `#rrggbb` 를 흰 배경 위 alpha 로 보이는 불투명 색으로 변환.
 * 캔버스 라인 · 마지막값 축 라벨 · 범례 마커가 모두 같은 함수를 써 색이 일치한다.
 * (rgba 를 쓰면 축 라벨 배경이 반투명해져 그리드 위에서 얼룩짐)
 */
function toneColor(hex: string, alpha: number): string {
  if (alpha >= 1) return hex;
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c * alpha + 255 * (1 - alpha));
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `rgb(${r}, ${g}, ${b})`;
}

/* ------------------------------------------------------------------ */
/*  낙찰가 범위 밴드 · series primitive                                 */
/* ------------------------------------------------------------------ */

interface BandPoint {
  time: UTCTimestamp;
  low: number;
  high: number;
}

interface BandCoord {
  x: number;
  yHigh: number;
  yLow: number;
}

/**
 * 주인공 라인에 붙는 낙찰가 범위(최저~최고) 띠.
 * 시리즈로 그리면 hover 라벨·마지막값 배지·크로스헤어 마커에 끼어드는데,
 * primitive 는 순수 그림이라 라인 뒤(zOrder bottom)에 조용히 깔리고 자동 스케일에만 범위를 보탠다.
 */
class SettlementBandPrimitive implements ISeriesPrimitive<Time> {
  private chart: IChartApi | null = null;
  private series: ISeriesApi<SeriesType> | null = null;
  private requestUpdate: (() => void) | null = null;
  private readonly view: BandPaneView;
  private readonly views: readonly IPrimitivePaneView[];

  constructor(
    private readonly points: BandPoint[],
    fill: string,
    edge: string,
    private visible: boolean,
  ) {
    this.view = new BandPaneView(fill, edge);
    this.views = [this.view];
  }

  attached({ chart, series, requestUpdate }: SeriesAttachedParameter<Time>) {
    this.chart = chart;
    this.series = series;
    this.requestUpdate = requestUpdate;
  }

  detached() {
    this.chart = null;
    this.series = null;
    this.requestUpdate = null;
  }

  /** 그리기만 켜고 끔 · autoscaleInfo 는 그대로라 가격축 범위가 흔들리지 않는다 */
  setVisible(visible: boolean) {
    if (this.visible === visible) return;
    this.visible = visible;
    this.requestUpdate?.();
  }

  updateAllViews() {
    if (!this.chart || !this.series) return;
    const timeScale = this.chart.timeScale();
    const coords: BandCoord[] = [];
    for (const p of this.points) {
      // 화면 밖 시점도 좌표를 얻어야 띠가 양끝에서 끊기지 않는다 → index 경유
      const index = timeScale.timeToIndex(p.time, false);
      if (index === null) continue;
      // TimePointIndex 와 Logical 은 같은 정수 축의 nominal 타입 · 라이브러리 예제와 동일한 캐스트
      const x = timeScale.logicalToCoordinate(index as unknown as Logical);
      const yHigh = this.series.priceToCoordinate(p.high);
      const yLow = this.series.priceToCoordinate(p.low);
      if (x === null || yHigh === null || yLow === null) continue;
      coords.push({ x, yHigh, yLow });
    }
    this.view.setCoords(coords);
  }

  paneViews() {
    return this.visible ? this.views : EMPTY_PANE_VIEWS;
  }

  /** 숨김 상태에서도 범위를 보탠다 · 띠를 켤 때 축이 늘어나며 라인이 눌려 보이는 걸 막기 위해 */
  autoscaleInfo(): AutoscaleInfo | null {
    if (!this.chart) return null;
    const visible = this.chart.timeScale().getVisibleRange();
    if (!visible) return null;
    const from = visible.from as number;
    const to = visible.to as number;
    let min = Infinity;
    let max = -Infinity;
    for (const p of this.points) {
      if (p.time < from || p.time > to) continue;
      if (p.low < min) min = p.low;
      if (p.high > max) max = p.high;
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
    return { priceRange: { minValue: min, maxValue: max } };
  }
}

const EMPTY_PANE_VIEWS: readonly IPrimitivePaneView[] = [];

class BandPaneView implements IPrimitivePaneView {
  private coords: BandCoord[] = [];

  constructor(
    private readonly fill: string,
    private readonly edge: string,
  ) {}

  setCoords(coords: BandCoord[]) {
    this.coords = coords;
  }

  zOrder(): PrimitivePaneViewZOrder {
    return "bottom";
  }

  renderer(): IPrimitivePaneRenderer {
    return new BandRenderer(this.coords, this.fill, this.edge);
  }
}

class BandRenderer implements IPrimitivePaneRenderer {
  constructor(
    private readonly coords: BandCoord[],
    private readonly fill: string,
    private readonly edge: string,
  ) {}

  draw(target: CanvasRenderingTarget2D) {
    const coords = this.coords;
    if (coords.length < 2) return;
    target.useMediaCoordinateSpace(({ context: ctx }) => {
      ctx.save();
      // 채움 · 위쪽 경계를 왼→오, 아래쪽 경계를 오→왼 으로 이어 닫힌 다각형
      ctx.beginPath();
      ctx.moveTo(coords[0].x, coords[0].yHigh);
      for (let i = 1; i < coords.length; i++) {
        ctx.lineTo(coords[i].x, coords[i].yHigh);
      }
      for (let i = coords.length - 1; i >= 0; i--) {
        ctx.lineTo(coords[i].x, coords[i].yLow);
      }
      ctx.closePath();
      ctx.fillStyle = this.fill;
      ctx.fill();

      // 경계선 · 1px · 채움보다 조금 진하게 (범위 끝이 읽히도록)
      ctx.strokeStyle = this.edge;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(coords[0].x, coords[0].yHigh);
      for (let i = 1; i < coords.length; i++) {
        ctx.lineTo(coords[i].x, coords[i].yHigh);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(coords[0].x, coords[0].yLow);
      for (let i = 1; i < coords.length; i++) {
        ctx.lineTo(coords[i].x, coords[i].yLow);
      }
      ctx.stroke();
      ctx.restore();
    });
  }
}

/** `#rrggbb` → `rgba(r, g, b, alpha)` */
function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** 축·라벨용 · 단위 없음 (`원/kg` 은 헤더 캡션에 1회) */
function formatPriceAxis(price: number): string {
  return Math.round(price).toLocaleString("ko-KR");
}

/** 호버 카드용 · 단위 포함 */
function formatPriceKRW(price: number): string {
  return `${Math.round(price).toLocaleString("ko-KR")}원`;
}

function formatVolumeKR(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")}건`;
}

/**
 * 시간축 라벨 · 경계(연/월)는 이름으로, 그 사이는 `M.d` 숫자로.
 * `6월 · 11일 · 7월 · 13일` 처럼 단위가 섞여 불규칙하게 읽히던 것을
 * `6월 · 6.15 · 7월 · 7.15` 로 통일해 격자처럼 규칙적으로 보이게 한다.
 */
function makeTickFormatter(granularity: PriceGranularity) {
  return (time: Time, tickMarkType: TickMarkType): string => {
    const d = timeToDate(time);
    const yy = String(d.getFullYear()).slice(2);
    const m = d.getMonth() + 1;
    if (granularity === "month") {
      if (tickMarkType === TickMarkType.Year) return `${yy}년 ${m}월`;
      return `${m}월`;
    }
    switch (tickMarkType) {
      case TickMarkType.Year:
        return `${yy}년 ${m}월`;
      case TickMarkType.Month:
        return `${m}월`;
      default:
        return `${m}.${d.getDate()}`;
    }
  };
}

function makeTimeFormatter(granularity: PriceGranularity) {
  return (time: Time): string => {
    const d = timeToDate(time);
    switch (granularity) {
      case "day":
        return format(d, "yyyy. M. d (eee)", { locale: ko });
      case "week":
        return `${format(d, "yyyy. M. d", { locale: ko })} 주`;
      case "month":
        return format(d, "yyyy년 M월", { locale: ko });
      default:
        return format(d, "yyyy-MM-dd", { locale: ko });
    }
  };
}

function dateToTime(d: Date): Time {
  return Math.floor(toUtcDayStart(d) / 1000) as UTCTimestamp;
}

function toUtcDayStart(d: Date): number {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

function timeToDate(time: Time): Date {
  if (typeof time === "number") {
    return new Date(time * 1000);
  }
  if (typeof time === "string") {
    return new Date(time);
  }
  return new Date(time.year, time.month - 1, time.day);
}
