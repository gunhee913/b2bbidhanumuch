"use client";

import { useMemo, type CSSProperties } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { SURFACE_SHELL_CLASS } from "@/features/live-auction/constants/surface";
import { formatKrw } from "@/features/live-auction/lib/masking";
import { usePartPriceSeries } from "@/features/live-auction/hooks/usePartPriceSeries";
import type { YieldGrade } from "@/features/live-auction/lib/buildPartPriceSeries";
import {
  EmptyRow,
  Measured,
  SkeletonRows,
} from "@/features/history/components/TableParts";

export interface MarketDailyTableProps {
  /** 차트가 그리고 있는 부위 */
  partName: string | null;
  /** 차트가 고른 선의 등급 열쇠 (`1++(9)` 꼴) */
  grade: string | null;
  /** 그 선의 육량 · 통합 중이면 null (셋을 합친 값) */
  yieldGrade: YieldGrade | null;
  /** 머리에 적을 등급 이름 (`1++A(9)`) */
  gradeLabel: string | null;

  style?: CSSProperties;
  className?: string;
}

/** 차트와 같은 창을 본다 · 받아 둔 것을 그대로 나눠 쓴다 (`staleTime` 도 같다) */
const SERIES_DAYS = 730;

const HEAD_CELL =
  "whitespace-nowrap border-b border-line px-2 py-1.5 font-medium -tracking-[0.01em]";
const CELL = "whitespace-nowrap px-2 py-1.5 align-middle tabular-nums";

/** 일자 · 낙찰건수 · 중량 · 평균단가 · 최고단가 · 최저단가 · 평균 낙찰대금 */
const COLUMN_WIDTHS = [102, 68, 70, 88, 88, 88, 104];
const TOTAL_WIDTH = COLUMN_WIDTHS.reduce((a, b) => a + b, 0);

/**
 * 차트가 고른 등급의 일자별 시세 · 차트 바로 밑에 선다.
 *
 * 차트는 모양을 말하고 이 표는 값을 말한다. 선이 어느 날 꺾였는지는 눈으로 바로
 * 보이지만 「그날 몇 건에 얼마였나」 는 끝내 읽을 수 없는데, 그 답이 필요한 자리가
 * 입찰가를 정하는 순간이다. 크로스헤어로 한 점씩 짚어 보게 하는 대신 같은 값을
 * 아래에 펴 둔다 — 세 날을 견주려면 짚는 것으로는 안 되고 나란히 놓여야 한다.
 *
 * 그리는 등급은 차트와 하나다. 머리의 등급 탭이 둘을 함께 움직인다 — 위아래가 다른
 * 등급을 보면서 나란히 서면 둘을 견줄 수가 없다.
 *
 * **제 안에서 구르지 않는다.** 줄을 다 펴 두고 화면 바깥이 아래로 민다. 틀 안에
 * 가둬 두면 두 겹으로 굴러야 하는데 — 바깥을 끝까지 민 다음 안쪽을 또 민다 — 그
 * 경계가 손에 안 잡히고, 안쪽 틀 높이가 몇 줄로 끊기는지도 자료가 정하지 못한다.
 *
 * 최근 날이 위다. 오늘 값을 보려고 두 해치를 끝까지 굴려 내려갈 수는 없다.
 */
export function MarketDailyTable({
  partName,
  grade,
  yieldGrade,
  gradeLabel,
  style,
  className,
}: MarketDailyTableProps) {
  const { data, isLoading, isError } = usePartPriceSeries({
    partName: partName ?? "",
    grade: grade ?? "",
    yieldGrade,
    days: SERIES_DAYS,
    enabled: !!partName && !!grade,
  });

  /* 낙찰이 있던 날만 · 두 해치 빈 날 칠백 줄은 굴릴 거리만 늘린다 */
  const rows = useMemo(
    () =>
      (data?.series ?? [])
        .filter((p) => p.count > 0 && p.avg != null)
        .reverse(),
    [data],
  );

  return (
    <section
      style={style}
      className={cn("flex flex-col", SURFACE_SHELL_CLASS, className)}
    >
      <header className="flex shrink-0 items-center gap-1.5 border-b border-line-soft px-2 py-1.5">
        <h2 className="shrink-0 text-[13px] font-bold text-content">
          일자별 시세
        </h2>
        {partName && gradeLabel ? (
          <span className="truncate text-[11.5px] font-semibold text-content-mid">
            {partName} {gradeLabel}
          </span>
        ) : null}
        <span className="ml-auto shrink-0 whitespace-nowrap text-[11px] tabular-nums text-content-faint">
          {rows.length.toLocaleString("ko-KR")}일
        </span>
      </header>

      {/*
       * 가로 틀을 두르지 않는다. `overflow-x` 는 세로 넘침까지 제 안에 가두는 탓에
       * 아래 `thead` 의 붙박이(`sticky`)가 바깥 스크롤을 못 보고 죽는다. 일곱 열
       * 618px 은 이 화면의 가장 좁은 폭보다도 작아 가로로 넘칠 일이 없다.
       */}
      <table
        style={{ minWidth: TOTAL_WIDTH }}
        className="w-full table-fixed text-[13px] font-semibold text-content"
      >
        <colgroup>
          {COLUMN_WIDTHS.map((width, i) => (
            <col key={i} style={{ width: `${(width / TOTAL_WIDTH) * 100}%` }} />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-10 bg-surface-muted text-[12px] font-medium text-content-faint">
          <tr>
            <th className={cn(HEAD_CELL, "text-left")}>일자</th>
            <th className={cn(HEAD_CELL, "text-right")}>낙찰건수</th>
            <th className={cn(HEAD_CELL, "text-right")}>중량</th>
            <th className={cn(HEAD_CELL, "text-right")}>평균단가</th>
            <th className={cn(HEAD_CELL, "text-right")}>최고단가</th>
            <th className={cn(HEAD_CELL, "text-right")}>최저단가</th>
            <th className={cn(HEAD_CELL, "text-right")}>평균 낙찰대금</th>
          </tr>
        </thead>
        <tbody>
          {!partName || !grade ? (
            <EmptyRow
              colSpan={COLUMN_WIDTHS.length}
              message="머리의 등급 탭에서 등급을 고르세요."
            />
          ) : isLoading ? (
            <SkeletonRows colSpan={COLUMN_WIDTHS.length} rows={6} />
          ) : isError ? (
            <EmptyRow
              colSpan={COLUMN_WIDTHS.length}
              message="일자별 시세를 불러오지 못했습니다."
            />
          ) : rows.length === 0 ? (
            <EmptyRow
              colSpan={COLUMN_WIDTHS.length}
              message="최근 두 해 동안 이 등급의 낙찰이 없습니다."
            />
          ) : (
            rows.map((row) => (
              <tr
                key={row.date}
                className="border-b border-line-soft transition-colors hover:bg-surface-muted"
              >
                <td className={cn(CELL, "text-left")}>
                  {format(new Date(row.date), "yyyy.MM.dd (EEE)", {
                    locale: ko,
                  })}
                </td>
                <td className={cn(CELL, "text-right text-content-mid")}>
                  <Measured
                    value={row.count.toLocaleString("ko-KR")}
                    unit="건"
                  />
                </td>
                <td className={cn(CELL, "text-right")}>
                  <Measured
                    value={row.weight != null ? row.weight.toFixed(1) : "-"}
                    unit="kg"
                    className="font-bold"
                  />
                </td>
                <td className={cn(CELL, "text-right")}>
                  <Measured
                    value={row.avg != null ? formatKrw(row.avg) : "-"}
                    unit="원"
                    className="font-bold"
                  />
                </td>
                {/* 양 끝은 평균보다 한 톤 물린다 · 주인공은 가운데 평균단가다 */}
                <td className={cn(CELL, "text-right text-content-mid")}>
                  <Measured
                    value={row.max != null ? formatKrw(row.max) : "-"}
                    unit="원"
                  />
                </td>
                <td className={cn(CELL, "text-right text-content-mid")}>
                  <Measured
                    value={row.min != null ? formatKrw(row.min) : "-"}
                    unit="원"
                  />
                </td>
                <td className={cn(CELL, "text-right")}>
                  <Measured
                    value={row.amount != null ? formatKrw(row.amount) : "-"}
                    unit="원"
                    className="font-bold"
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
