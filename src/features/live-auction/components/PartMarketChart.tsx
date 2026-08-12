"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  TickMarkType,
  createChart,
  type HistogramData,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type LineData,
  type MouseEventParams,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { fetchPartPriceSeries, type LiveListing } from "../api";
import {
  aggregatePartPriceSeries,
  buildPartPriceSeries,
  type PriceGranularity,
  type PricePoint,
  type YieldGrade,
} from "../lib/buildPartPriceSeries";

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
}

const DEFAULT_CHART_HEIGHT = 320;
const VOLUME_COLOR = "#cbd5e1"; // slate-300 · 무채색 cool neutral · 라인 slate 팔레트와 조화 · 배경 대비 확실
/** 마우스 호버 시 Y축에 팝업되는 라인별 가격 배지 색상 · 브랜드 sky-600 통일. */
const HOVER_BADGE_COLOR = "#0284c7";

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

// 최초 진입 시 노출할 최근 bar 수 · 이전 데이터는 좌측 팬으로 확인
const INITIAL_VISIBLE_BARS: Record<PriceGranularity, number> = {
  day: 90,
  week: 26,
  month: 12,
};

// 등급 순서 · 레전드/차트 라인 순서
const ALL_GRADES = [
  "1++(9)",
  "1++(8)",
  "1++(7)",
  "1+",
  "1",
  "2",
  "3",
] as const;
type GradeKey = (typeof ALL_GRADES)[number];

/**
 * 등급별 라인 색상 팔레트 · Trading Desk 톤 (Cool + Slate accent).
 * - 프리미엄일수록 진한 톤 · 하위 등급은 자연스레 옅어져 시각 계층 자동 표현
 * - 브랜드 sky-600 을 실사용 최다 등급인 1+ 에 배치
 */
const GRADE_PALETTE: Record<GradeKey, string> = {
  "1++(9)": "#0f172a", // slate-900
  "1++(8)": "#1e40af", // blue-800
  "1++(7)": "#0e7490", // cyan-700
  "1+": "#0284c7", // sky-600 · 브랜드
  "1": "#64748b", // slate-500
  "2": "#94a3b8", // slate-400
  "3": "#cbd5e1", // slate-300
};

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
 * - 통합 해제: 해당 등급의 A/B/C 서브라인 3개 (aggregate 는 노출 X)
 */
function buildInitialLines(
  grade: GradeKey,
  yieldUnified: boolean,
): Set<LineKey> {
  if (yieldUnified) return new Set<LineKey>([grade]);
  const initial = new Set<LineKey>();
  for (const y of YIELDS) initial.add(makeLineKey(grade, y));
  return initial;
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
}: PartMarketChartProps) {
  const chartHeight = height ?? DEFAULT_CHART_HEIGHT;
  const [granularity, setGranularity] = useState<PriceGranularity>("day");
  const [yieldUnified, setYieldUnified] = useState(false);

  const gradeKey = useMemo<GradeKey>(
    () =>
      (toGradeKey(listing?.grade ?? null, listing?.marblingScore ?? null) ??
        "1++(9)") as GradeKey,
    [listing?.grade, listing?.marblingScore],
  );

  const normalizedPart = useMemo(
    () => (partName ? toPartGroup(partName) : "등심"),
    [partName],
  );

  // 다중 라인 선택 상태 · 초기: 현재 통합 상태에 맞는 라인
  const [selectedLines, setSelectedLines] = useState<Set<LineKey>>(() =>
    buildInitialLines(gradeKey, yieldUnified),
  );

  // 개체(listing) 변경 시 새 등급 라인으로 완전 대체 (기존 다른 등급 선택은 리셋)
  // · yieldUnified 는 handleUnifiedChange 에서 별도로 처리하므로 여기 deps 에서 제외
  useEffect(() => {
    setSelectedLines(buildInitialLines(gradeKey, yieldUnified));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gradeKey]);

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
   * - 이미 이 그룹의 A/B/C 만 정확히 선택 → 전부 해제 (빈 상태)
   * - 그 외 → 다른 등급 전부 제거하고 이 그룹의 A/B/C 만 선택
   */
  const toggleGroup = (g: GradeKey) => {
    setSelectedLines((prev) => {
      const yieldKeys = YIELDS.map((y) => makeLineKey(g, y));
      const isExactlyThisGroup =
        prev.size === yieldKeys.length &&
        yieldKeys.every((k) => prev.has(k));
      if (isExactlyThisGroup) {
        return new Set<LineKey>();
      }
      return new Set(yieldKeys);
    });
  };


  /**
   * 통합 토글 · 상태 전환 시 라인 자동 변환
   * - true (통합): 기존 A/B/C 선택을 aggregate 로 변환
   * - false (해제): 기존 aggregate 선택을 A/B/C 3개로 변환
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
        for (const k of prev) {
          const { grade, yieldG } = parseLineKey(k);
          if (yieldG !== null) {
            next.add(k);
          } else {
            for (const y of YIELDS) next.add(makeLineKey(grade, y));
          }
        }
        if (next.size === 0) {
          for (const y of YIELDS) next.add(makeLineKey(gradeKey, y));
        }
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

  // 병렬 fetch · 라인마다 grade + (통합 시 null / 특정 육량)
  const queries = useQueries({
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

      const useDummy =
        isError || realCount < REAL_DATA_MIN_POINTS || isStale;

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
        color: GRADE_PALETTE[grade],
        points,
        latest: points[points.length - 1]?.value ?? null,
      };
    });
  }, [orderedLines, queries, granularity, normalizedPart]);

  const hasAny = lineSeriesData.some((gs) => gs.points.length > 0);

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden",
        bordered ? "border border-slate-200 bg-white" : "bg-transparent",
      )}
    >
      {/* Row 1 · 부위명(또는 커스텀 slot) + granularity */}
      <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
        {headerLeft ?? (
          <h4 className="text-[13px] font-bold text-slate-900">
            {normalizedPart}
          </h4>
        )}
        <GranularityTabs value={granularity} onChange={setGranularity} />
      </header>

      {/* Row 2 · 라인 레전드 (등급 통합 or 등급 + A/B/C) + 통합 토글 */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-3 py-2">
        <LineLegend
          selected={selectedLines}
          onToggle={toggleLine}
          onToggleGroup={toggleGroup}
          yieldUnified={yieldUnified}
        />
        <div className="flex shrink-0 items-center gap-2">
          <YieldUnifyToggle
            checked={yieldUnified}
            onChange={handleUnifiedChange}
          />
        </div>
      </div>

      {/* 차트 */}
      <div className="relative pb-2">
        {!hasAny ? (
          <div
            className="flex items-center justify-center text-[11px] text-slate-400"
            style={{ height: chartHeight }}
          >
            {anyLoading ? "불러오는 중…" : "데이터 없음"}
          </div>
        ) : (
          <PriceLineChart
            seriesList={lineSeriesData}
            granularity={granularity}
            height={chartHeight}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PriceLineChart · AuctionLab port (single series)                   */
/* ------------------------------------------------------------------ */

interface PriceLineChartProps {
  seriesList: LineSeriesData[];
  granularity: PriceGranularity;
  height: number;
}

function PriceLineChart({
  seriesList,
  granularity,
  height,
}: PriceLineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const lineSeriesRefsRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  // 라인별 hover Y축 라벨 · 호버 시에만 axisLabelVisible=true
  const hoverPriceLinesRef = useRef<Map<string, IPriceLine>>(new Map());
  // 볼륨 pane hover 라벨 · 마우스 위치 날짜의 건수를 우측 Y축에 pop
  const hoverVolumeLineRef = useRef<IPriceLine | null>(null);

  /**
   * 호버 시 상단에 표시할 라인별 시세.
   * requestAnimationFrame 으로 스로틀링해서 불필요한 리렌더 방지.
   */
  const [hoverInfo, setHoverInfo] = useState<{
    date: Date;
    values: Map<LineKey, number>;
  } | null>(null);
  const pendingHoverRef = useRef<{
    date: Date;
    values: Map<LineKey, number>;
  } | null>(null);
  const rafRef = useRef<number | null>(null);
  const flushHover = () => {
    setHoverInfo(pendingHoverRef.current);
    rafRef.current = null;
  };
  const scheduleHover = (
    next: { date: Date; values: Map<LineKey, number> } | null,
  ) => {
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
        background: { type: ColorType.Solid, color: "#ffffff" },
        // Upbit 스타일 · 텍스트 대비 강화 (slate-500 → slate-700)
        textColor: "#334155",
        fontSize: 10,
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto',
        panes: {
          separatorColor: "#e2e8f0",
          separatorHoverColor: "#94a3b8",
          enableResize: false,
        },
        attributionLogo: false,
      },
      grid: {
        // Upbit 스타일 · vertical grid 완전 제거 · horizontal 만 극도로 옅게
        vertLines: { color: "transparent" },
        horzLines: { color: "#f5f8fb" },
      },
      rightPriceScale: {
        borderColor: "#e2e8f0",
        scaleMargins: { top: 0.08, bottom: 0.1 },
        entireTextOnly: true,
      },
      timeScale: {
        borderColor: "#e2e8f0",
        timeVisible: false,
        secondsVisible: false,
        tickMarkFormatter: makeTickFormatter(granularity),
      },
      localization: {
        locale: "ko-KR",
        timeFormatter: makeTimeFormatter(granularity),
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        // Upbit 스타일 · dashed → dotted (더 얇고 미묘한 hover 가이드)
        vertLine: {
          color: "#94a3b8",
          width: 1,
          style: 1,
          labelBackgroundColor: "#0f172a",
        },
        horzLine: {
          color: "#94a3b8",
          width: 1,
          style: 1,
          labelBackgroundColor: "#0f172a",
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
        scheduleHover(null);
        return;
      }

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
          | { value: number }
          | undefined;
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

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? el.clientWidth;
      chart.applyOptions({ width: Math.max(240, Math.floor(w)) });
    });
    ro.observe(el);

    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      lineSeriesRefsRef.current.clear();
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

    if (volumeSeriesRef.current) {
      try {
        chart.removeSeries(volumeSeriesRef.current);
      } catch {
        // ignored
      }
      volumeSeriesRef.current = null;
    }
    hoverPriceLinesRef.current.clear();
    hoverVolumeLineRef.current = null;

    if (seriesList.length === 0) return;

    const priceFormat = {
      type: "custom" as const,
      formatter: formatPriceKRW,
      minMove: 1,
    };

    // 라인 시리즈 생성 · 통합/A/B/C 별 스타일 분화
    seriesList.forEach((gs) => {
      if (gs.points.length === 0) return;
      const styleOpts = getLineStyleOptions(gs.yieldG);
      const lineApi = chart.addSeries(LineSeries, {
        color: gs.color,
        lineWidth: styleOpts.lineWidth,
        lineStyle: styleOpts.lineStyle,
        // Upbit 스타일 · 최신값 우측 축 anchor 상시 노출 (라인 색 badge)
        // priceLineVisible 은 유지 false · dashed horizontal 로 인한 clutter 방지
        // hover 시 별도 hoverPriceLine 이 sky-600 배지로 pop (라인 색과 대비)
        lastValueVisible: true,
        priceLineVisible: false,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 3,
        priceFormat,
      });
      const lineData: LineData[] = gs.points.map((p) => ({
        time: dateToTime(p.date),
        value: p.value,
      }));
      lineApi.setData(lineData);
      lineSeriesRefsRef.current.set(gs.key, lineApi);

      // 라인별 hover priceLine · 라인은 안 그리고 라벨만 hover 시 pop
      // 배지 컬러는 브랜드 sky-600 로 통일해 축 그리드/라인 컬러와 확실히 대비
      const hoverLine = lineApi.createPriceLine({
        price: 0,
        color: HOVER_BADGE_COLOR,
        lineWidth: 1,
        lineStyle: 0,
        lineVisible: false,
        axisLabelVisible: false,
        axisLabelColor: HOVER_BADGE_COLOR,
        axisLabelTextColor: "#ffffff",
        title: "",
      });
      hoverPriceLinesRef.current.set(gs.key, hoverLine);
    });

    // 볼륨 · 등급 별 count 합산 후 별도 pane 히스토그램으로
    const volumeMap = new Map<UTCTimestamp, number>();
    for (const gs of seriesList) {
      for (const p of gs.points) {
        const t = dateToTime(p.date) as UTCTimestamp;
        volumeMap.set(t, (volumeMap.get(t) ?? 0) + p.count);
      }
    }
    const volumeData: HistogramData[] = [...volumeMap.entries()]
      .sort((a, b) => (a[0] as number) - (b[0] as number))
      .map(([time, value]) => ({ time, value, color: VOLUME_COLOR }));

    if (volumeData.length > 0) {
      const panes = chart.panes();
      if (panes.length < 2) {
        chart.addPane();
      }
      const allPanes = chart.panes();
      const mainPane = allPanes[0];
      const volumePane = allPanes[1];
      if (mainPane && typeof mainPane.setStretchFactor === "function") {
        mainPane.setStretchFactor(4);
      }
      if (volumePane && typeof volumePane.setStretchFactor === "function") {
        volumePane.setStretchFactor(1);
      }

      const volumeApi = chart.addSeries(
        HistogramSeries,
        {
          color: VOLUME_COLOR,
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
        borderColor: "#e2e8f0",
        scaleMargins: { top: 0.2, bottom: 0.02 },
        ticksVisible: true,
        entireTextOnly: true,
      });
      volumeApi.setData(volumeData);
      volumeSeriesRef.current = volumeApi;

      // 볼륨 pane 도 hover 시 그 날 건수만 라벨로 pop
      hoverVolumeLineRef.current = volumeApi.createPriceLine({
        price: 0,
        color: HOVER_BADGE_COLOR,
        lineWidth: 1,
        lineStyle: 0,
        lineVisible: false,
        axisLabelVisible: false,
        axisLabelColor: HOVER_BADGE_COLOR,
        axisLabelTextColor: "#ffffff",
        title: "",
      });
    }

    // 초기 가시 범위 · 데이터의 마지막 시점을 우측 anchor 로 시간 기반 창 지정
    // ("last 90 workdays" 같이 index 로 잡으면 시리즈 밀도가 다를 때 우측 정렬이 어긋남)
    const firstPoints = seriesList[0]?.points ?? [];
    if (firstPoints.length > 0) {
      const lastDate = firstPoints[firstPoints.length - 1].date;
      const daysBack = INITIAL_VISIBLE_BARS[granularity] ?? 90;
      // 시각화 관점의 근사 · day 는 workday → calendar 환산, week/month 은 unit 을 그대로 일수로
      const calendarDaysBack =
        granularity === "day"
          ? Math.round(daysBack * (7 / 5))
          : granularity === "week"
            ? daysBack * 7
            : daysBack * 30;
      const fromDate = new Date(lastDate);
      fromDate.setDate(fromDate.getDate() - calendarDaysBack);
      chart.timeScale().setVisibleRange({
        from: dateToTime(fromDate),
        to: dateToTime(lastDate),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesList]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="w-full overflow-hidden"
        style={{ height, minHeight: height }}
      />
      {hoverInfo ? (
        <HoverInfoBar
          info={hoverInfo}
          seriesList={seriesList}
          granularity={granularity}
        />
      ) : null}
    </div>
  );
}

/** 호버 시 차트 상단 왼쪽에 붙는 시세 스냅샷 카드. */
function HoverInfoBar({
  info,
  seriesList,
  granularity,
}: {
  info: { date: Date; values: Map<LineKey, number> };
  seriesList: LineSeriesData[];
  granularity: PriceGranularity;
}) {
  const dateText = formatHoverDate(info.date, granularity);

  return (
    <div
      className="pointer-events-none absolute left-2 top-2 z-20 flex max-w-[calc(100%-1rem)] flex-wrap items-center gap-x-3 gap-y-0.5 rounded-md border border-slate-200 bg-white px-2 py-1 shadow-sm"
      role="presentation"
    >
      <span className="text-[10px] font-semibold tabular-nums text-slate-500">
        {dateText}
      </span>
      {seriesList.map((s) => {
        const val = info.values.get(s.key);
        if (val == null) return null;
        const variant: "solid" | "dashed" | "dotted" =
          s.yieldG === null
            ? "solid"
            : s.yieldG === "A"
              ? "solid"
              : s.yieldG === "B"
                ? "dashed"
                : "dotted";
        const label = s.yieldG ? `${s.grade}${s.yieldG}` : s.grade;
        return (
          <div
            key={s.key}
            className="flex items-center gap-1 text-[10.5px] leading-none"
          >
            <LegendDash
              color={s.color}
              variant={variant}
              emphasize={s.yieldG === null}
            />
            <span className="font-semibold" style={{ color: s.color }}>
              {label}
            </span>
            <span className="tabular-nums font-bold text-slate-900">
              {formatPriceKRW(val)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function formatHoverDate(date: Date, granularity: PriceGranularity): string {
  if (granularity === "month") return format(date, "yy년 M월", { locale: ko });
  if (granularity === "week") return format(date, "yy년 M월 d일 주", { locale: ko });
  return format(date, "yy.MM.dd (E)", { locale: ko });
}

/* ------------------------------------------------------------------ */
/*  Toolbars                                                           */
/* ------------------------------------------------------------------ */

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
      className="inline-flex h-7 items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 p-0.5"
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
              "rounded-[5px] px-2.5 text-[11px] font-semibold leading-6 transition-colors",
              active
                ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                : "text-slate-500 hover:text-slate-900",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function LineLegend({
  selected,
  onToggle,
  onToggleGroup,
  yieldUnified,
}: {
  selected: Set<LineKey>;
  onToggle: (key: LineKey) => void;
  onToggleGroup: (g: GradeKey) => void;
  yieldUnified: boolean;
}) {
  return (
    <div
      role="group"
      aria-label="시세 라인 선택"
      className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3.5 gap-y-1"
    >
      {ALL_GRADES.map((g) => {
        const color = GRADE_PALETTE[g];

        if (yieldUnified) {
          return (
            <LegendPill
              key={g}
              label={g}
              color={color}
              isSelected={selected.has(g)}
              onClick={() => onToggle(g)}
              variant="solid"
              emphasize
            />
          );
        }

        // 통합 해제 · 등급 라벨 (클릭 시 그룹 A/B/C 일괄) + A/B/C 서브라인 pill
        const yieldKeys = YIELDS.map((y) => makeLineKey(g, y));
        const allYieldsSelected = yieldKeys.every((k) => selected.has(k));

        return (
          <div
            key={g}
            className="inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <button
              type="button"
              onClick={() => onToggleGroup(g)}
              className={cn(
                "inline-flex items-center rounded px-1 py-0.5 text-[10.5px] font-semibold tabular-nums tracking-tight transition-colors",
                "hover:bg-slate-100",
                allYieldsSelected ? "" : "opacity-60",
              )}
              style={{ color }}
              aria-label={`${g} 등급 A/B/C 일괄 토글`}
            >
              {g}
            </button>
            {YIELDS.map((y) => {
              const key = makeLineKey(g, y);
              const variant =
                y === "A" ? "solid" : y === "B" ? "dashed" : "dotted";
              return (
                <LegendPill
                  key={key}
                  label={y}
                  color={color}
                  isSelected={selected.has(key)}
                  onClick={() => onToggle(key)}
                  variant={variant}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/** 레전드 pill · 상단 컬러 대시(스타일 반영) + 라벨. */
function LegendPill({
  label,
  color,
  isSelected,
  onClick,
  variant,
  emphasize = false,
}: {
  label: string;
  color: string;
  isSelected: boolean;
  onClick: () => void;
  variant: "solid" | "dashed" | "dotted";
  emphasize?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={isSelected}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:bg-slate-100",
        !isSelected && "opacity-30 hover:opacity-70",
      )}
    >
      <LegendDash color={color} variant={variant} emphasize={emphasize} />
      <span
        className={cn(
          "tabular-nums tracking-tight",
          emphasize
            ? "text-[10.5px] font-semibold"
            : "text-[10px] font-medium",
          isSelected ? "text-slate-900" : "text-slate-500",
        )}
      >
        {label}
      </span>
    </button>
  );
}

/** 레전드 대시 마커 · solid/dashed/dotted 시각화. */
function LegendDash({
  color,
  variant,
  emphasize,
}: {
  color: string;
  variant: "solid" | "dashed" | "dotted";
  emphasize: boolean;
}) {
  const width = emphasize ? 14 : 11;
  const height = 2;
  const commonStyle: React.CSSProperties = {
    width,
    height,
    color,
  };

  if (variant === "solid") {
    return (
      <span
        aria-hidden
        style={{ ...commonStyle, backgroundColor: color }}
        className="inline-block rounded-sm"
      />
    );
  }
  if (variant === "dashed") {
    return (
      <span
        aria-hidden
        style={{
          ...commonStyle,
          backgroundImage: `repeating-linear-gradient(90deg, ${color} 0 3px, transparent 3px 5px)`,
        }}
        className="inline-block"
      />
    );
  }
  // dotted
  return (
    <span
      aria-hidden
      style={{
        ...commonStyle,
        backgroundImage: `repeating-linear-gradient(90deg, ${color} 0 1.5px, transparent 1.5px 3.5px)`,
      }}
      className="inline-block"
    />
  );
}

function YieldUnifyToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex h-7 select-none items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-semibold transition-colors",
        checked
          ? "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
      )}
    >
      <span
        className={cn(
          "flex h-3.5 w-3.5 items-center justify-center rounded border transition-colors",
          checked
            ? "border-sky-600 bg-sky-600 text-white"
            : "border-slate-300 bg-white",
        )}
        aria-hidden
      >
        {checked ? (
          <svg viewBox="0 0 12 12" className="h-3 w-3">
            <path
              d="M2.5 6.5 L5 9 L9.5 3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
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
      className="inline-flex h-7 items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 p-0.5"
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
                ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                : "text-slate-500 hover:text-slate-900",
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

/** grade + marblingScore → `1++(9)` 처럼 시드용 등급 키. */
function toGradeKey(
  grade: string | null,
  marblingScore: number | null,
): string | null {
  if (!grade) return null;
  const match = grade.match(/^(1\+\+|1\+|1|2|3)/);
  if (!match) return null;
  const quality = match[1];
  if (quality === "1++" && marblingScore) {
    return `1++(${marblingScore})`;
  }
  return quality;
}

/* ------------------------------------------------------------------ */
/*  Formatters / Time helpers · AuctionLab port                        */
/* ------------------------------------------------------------------ */

/**
 * 통합(null) vs A/B/C 별 라인 스타일 정책.
 * lightweight-charts LineStyle: 0=Solid · 1=Dotted · 2=Dashed · 3=LargeDashed · 4=SparseDotted
 *
 * 굵기는 통합/개별 모두 2px 로 통일 (lightweight-charts LineWidth 정수 1|2|3|4).
 * 대시/도트 패턴만으로 A/B/C 를 구분 · 시각 계층은 색상 강도로 표현.
 */
function getLineStyleOptions(yieldG: YieldGrade | null): {
  lineWidth: 2 | 1;
  lineStyle: 0 | 1 | 2 | 3 | 4;
} {
  if (yieldG === null) return { lineWidth: 2, lineStyle: 0 }; // 통합: 실선
  if (yieldG === "A") return { lineWidth: 2, lineStyle: 0 }; // A: 실선
  if (yieldG === "B") return { lineWidth: 2, lineStyle: 2 }; // B: 대시
  return { lineWidth: 2, lineStyle: 1 }; // C: 도트
}

function formatPriceKRW(price: number): string {
  return `${Math.round(price).toLocaleString("ko-KR")}원`;
}

function formatVolumeKR(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")}건`;
}

function makeTickFormatter(granularity: PriceGranularity) {
  return (time: Time, tickMarkType: TickMarkType): string => {
    const d = timeToDate(time);
    if (granularity === "month") {
      if (tickMarkType === TickMarkType.Year) return `${d.getFullYear()}년`;
      return `${d.getMonth() + 1}월`;
    }
    switch (tickMarkType) {
      case TickMarkType.Year:
        return `${d.getFullYear()}년`;
      case TickMarkType.Month:
        return `${d.getMonth() + 1}월`;
      case TickMarkType.DayOfMonth:
        return `${d.getDate()}일`;
      default:
        return `${d.getDate()}일`;
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
