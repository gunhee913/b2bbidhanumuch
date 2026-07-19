"use client";

import { useEffect, useRef, useState } from "react";
import {
  AreaSeries,
  ColorType,
  LineType,
  createChart,
  type AreaData,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { PartPriceSeriesPoint } from "../api";

const NUMBER_FORMATTER = new Intl.NumberFormat("ko-KR");

interface MiniSparklineChartProps {
  points: PartPriceSeriesPoint[];
  chartHeight?: number;
  className?: string;
}

interface TooltipData {
  date: string;
  avg: number;
  min: number | null;
  max: number | null;
  count: number;
  x: number;
  y: number;
  containerWidth: number;
  containerHeight: number;
}

/**
 * `lightweight-charts` 기반의 라이트 테마 라인차트.
 *
 * · 부드러운 sky 라인 (avg 시계열)
 * · 마우스 오버 시 crosshair + 커스텀 툴팁 (평균/최고/최저/경락건수)
 * · Y축 자동 스케일, 그리드 slate-100
 * · 볼륨 바 없음 (요구사항)
 */
export function MiniSparklineChart({
  points,
  chartHeight = 140,
  className,
}: MiniSparklineChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const pointsRef = useRef<PartPriceSeriesPoint[]>(points);
  pointsRef.current = points;

  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  // 차트 초기화 (chartHeight 변경 시 재생성)
  useEffect(() => {
    if (!chartContainerRef.current) return;
    const container = chartContainerRef.current;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "#ffffff" },
        textColor: "#94A3B8", // slate-400
        fontSize: 10,
      },
      grid: {
        // 이미지처럼 가로 그리드 제거 · 세로만 얇게 dashed
        vertLines: { color: "#F1F5F9", style: 2 }, // slate-100 dashed
        horzLines: { visible: false, color: "transparent" },
      },
      width: container.clientWidth,
      height: chartHeight,
      timeScale: {
        borderColor: "#F1F5F9", // 축선 매우 옅게 (slate-100)
        timeVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
        barSpacing: 6,
        minBarSpacing: 2,
        rightOffset: 2,
        tickMarkFormatter: (time: Time) => {
          const dateStr = String(time);
          const d = new Date(dateStr);
          return `${d.getMonth() + 1}.${d.getDate()}`;
        },
      },
      rightPriceScale: {
        visible: false,
        scaleMargins: { top: 0.18, bottom: 0.14 },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: "#94A3B8",
          style: 3,
          labelVisible: false,
        },
        horzLine: {
          visible: false,
          labelVisible: false,
        },
      },
      handleScroll: false,
      handleScale: false,
      localization: {
        priceFormatter: (v: number) => NUMBER_FORMATTER.format(Math.round(v)),
        locale: "ko-KR",
      },
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: "#0284c7", // sky-600
      topColor: "rgba(2, 132, 199, 0.28)",
      bottomColor: "rgba(2, 132, 199, 0.02)",
      lineWidth: 2,
      lineType: LineType.Curved, // 이미지처럼 부드러운 곡선
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: "#ffffff",
      crosshairMarkerBackgroundColor: "#0284c7",
      crosshairMarkerBorderWidth: 2,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    chart.subscribeCrosshairMove((param) => {
      if (
        !param.time ||
        !param.point ||
        param.point.x < 0 ||
        param.point.y < 0
      ) {
        setTooltip(null);
        return;
      }
      const data = param.seriesData.get(series) as
        | AreaData<Time>
        | undefined;
      const pt = pointsRef.current.find(
        (p) => p.date === (param.time as string),
      );
      if (!data || !pt) {
        setTooltip(null);
        return;
      }
      setTooltip({
        date: pt.date,
        avg: pt.avg ?? data.value,
        min: pt.min,
        max: pt.max,
        count: pt.count,
        x: param.point.x,
        y: param.point.y,
        containerWidth: container.clientWidth,
        containerHeight: chartHeight,
      });
    });

    // 리사이즈
    const resizeObserver = new ResizeObserver(() => {
      if (!chartRef.current || !container) return;
      chartRef.current.applyOptions({ width: container.clientWidth });
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [chartHeight]);

  // 데이터 갱신
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return;
    const data: AreaData<Time>[] = points
      .filter((p): p is typeof p & { avg: number } => p.avg !== null)
      .map((p) => ({ time: p.date as Time, value: p.avg }));

    seriesRef.current.setData(data);

    if (data.length > 0) {
      chartRef.current.timeScale().fitContent();
    }
  }, [points]);

  return (
    <div className={cn("relative", className)}>
      <div
        ref={chartContainerRef}
        style={{ height: chartHeight, width: "100%" }}
      />
      {tooltip ? <TooltipCard data={tooltip} /> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function TooltipCard({ data }: { data: TooltipData }) {
  const TOOLTIP_WIDTH = 130;
  const TOOLTIP_HEIGHT = 92;
  const OFFSET = 10;

  // 커서 우측 기본, 잘리면 좌측으로 flip
  const wouldOverflowRight =
    data.x + OFFSET + TOOLTIP_WIDTH > data.containerWidth;
  const left = wouldOverflowRight
    ? Math.max(4, data.x - OFFSET - TOOLTIP_WIDTH)
    : data.x + OFFSET;

  const top = Math.min(
    Math.max(4, data.y - TOOLTIP_HEIGHT / 2),
    data.containerHeight - TOOLTIP_HEIGHT - 4,
  );

  const d = new Date(data.date);
  const dateLabel = format(d, "M.d (EEE)", { locale: ko });

  return (
    <div
      className="pointer-events-none absolute z-20 rounded-lg bg-slate-900 px-3 py-2 text-[10px] font-medium text-white shadow-xl ring-1 ring-black/5"
      style={{ left, top, width: TOOLTIP_WIDTH }}
    >
      <div className="mb-1.5 border-b border-white/10 pb-1 text-[10px] font-semibold text-slate-300">
        {dateLabel}
      </div>
      <div className="space-y-0.5">
        <TooltipRow label="평균" value={data.avg} strong />
        {data.max != null ? (
          <TooltipRow label="최고" value={data.max} color="text-rose-300" />
        ) : null}
        {data.min != null ? (
          <TooltipRow label="최저" value={data.min} color="text-sky-300" />
        ) : null}
        <TooltipRow
          label="경락"
          value={`${data.count}건`}
          raw
          color="text-slate-200"
        />
      </div>
    </div>
  );
}

function TooltipRow({
  label,
  value,
  color,
  strong,
  raw,
}: {
  label: string;
  value: number | string;
  color?: string;
  strong?: boolean;
  raw?: boolean;
}) {
  const text = raw ? String(value) : NUMBER_FORMATTER.format(value as number);
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-400">{label}</span>
      <span
        className={cn(
          "tabular-nums",
          strong ? "font-bold" : "font-medium",
          color ?? "text-white",
        )}
      >
        {text}
      </span>
    </div>
  );
}
