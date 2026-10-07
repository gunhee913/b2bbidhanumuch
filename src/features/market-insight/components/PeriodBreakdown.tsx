"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { SURFACE_SHELL_CLASS } from "@/features/live-auction/constants/surface";
import { formatWon } from "@/features/live-auction/lib/masking";
import { DonutCard } from "./DonutCard";
import type { AuctionResult } from "@/features/bids/types";
import {
  buildAmountDist,
  buildWinRateDist,
  gradeAxis,
  GRADE_ORDER,
  partAxis,
} from "../lib/dailyStats";
import { useMarketAverages } from "../hooks/useMarketAverages";
import { DayDetailTable, type DetailTab } from "./DayDetailTable";

/**
 * 고른 구간 하나 · 위에 구성(도넛 셋), 아래에 그 구성을 이룬 물건들(표).
 *
 * **날이든 달이든 같은 판이 선다.** 위에서 캘린더를 보든 월별 막대를 보든 묻는 것은
 * 「이 구간을 무엇으로 채웠나」 로 같아서, 구간을 자르는 일만 부르는 쪽이 하고 여기는
 * 받은 줄만 센다.
 *
 * 앞의 두 도넛은 **금액**으로 센다 — 이 자리에 오는 까닭이 「내 돈이 어디로 갔나」
 * 라서다. 낙찰률만 **건수**다. 못 딴 건에는 거래액이 없어 금액으로는 분모가 안 선다.
 *
 * **도넛은 누르는 것이 아니다.** 한때 조각을 눌러 표를 걸렀는데, 거르는 자리를 표
 * 제 머리로 옮겼다 — 거르개를 도넛에 걸면 「등심」 을 고른 순간 부위 도넛이 100%
 * 짜리 고리 하나가 되어 그림이 아무 말도 안 한다.
 */
export function PeriodBreakdown({
  label,
  anchorDate,
  results,
  emptyHint,
  wonOnly = false,
}: {
  /** 머리에 적을 구간 이름 · `2026.09.17 (목)` 또는 `2026년 9월` */
  label: string | null;
  /**
   * 「평균가 대비」 를 재는 창의 끝 날 (`yyyy-MM-dd`).
   *
   * 날을 보고 있으면 그 날, 달을 보고 있으면 그 달의 마지막 날이다. 달을 볼 때
   * 줄마다 제 날짜로 창을 따로 잡으면 더 정확하지만 한 달치면 창을 서른 번 잡아야
   * 한다 — 한 달 창과 그 달이 거의 겹치므로 끝 날 하나로 둔다.
   */
  anchorDate: string | null;
  /** 이 구간의 입찰 결과 전부 (낙찰 + 미낙찰) */
  results: AuctionResult[];
  /** 아직 아무것도 안 골랐을 때 적을 말 */
  emptyHint: string;
  /**
   * 들어온 줄이 낙찰뿐임이 **미리 정해져 있나** · 거래처 거르개가 켜지면 참.
   *
   * 「마침 미낙찰이 없는 날」 과는 다르다. 그런 날은 미낙찰 0건이 그 자체로 말이
   * 되지만, 여기는 들어올 수 없게 막아 둔 것이라 0이 사실을 말하지 않는다. 그대로
   * 두면 낙찰률 도넛이 100% 고리 하나로 「이 거래처에선 다 땄다」 고 거짓말한다.
   */
  wonOnly?: boolean;
}) {
  const [tab, setTab] = useState<DetailTab>("won");

  const gradeDist = useMemo(
    () => buildAmountDist(results, gradeAxis, GRADE_ORDER),
    [results],
  );
  const partDist = useMemo(() => buildAmountDist(results, partAxis), [results]);
  const rateDist = useMemo(
    () => (wonOnly ? [] : buildWinRateDist(results)),
    [results, wonOnly],
  );

  const { data: averages } = useMarketAverages(anchorDate);

  const summary = useMemo(() => {
    const won = results.filter((r) => r.result === "won");
    return {
      wonCount: won.length,
      lostCount: results.length - won.length,
      amount: won.reduce((sum, r) => sum + r.totalAmount, 0),
    };
  }, [results]);

  /*
   * 표에 내려보내는 줄은 거르지 않은 전부다. 거르는 일은 표 제 머리에서 한다 —
   * 도넛은 이 구간의 **구성**을 말하는 자리라, 거르개를 여기 걸면 「등심」 을 고른
   * 순간 부위 도넛이 100% 짜리 고리 하나가 되어 그림이 아무 말도 안 하게 된다.
   */
  const { wonRows, lostRows } = useMemo(
    () => ({
      wonRows: results.filter((r) => r.result === "won"),
      lostRows: results.filter((r) => r.result === "lost"),
    }),
    [results],
  );

  if (!label) return <Notice>{emptyHint}</Notice>;

  if (results.length === 0) {
    return <Notice>{label} 에는 입찰 내역이 없습니다.</Notice>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          "flex items-center justify-between gap-3 px-3 py-2",
          SURFACE_SHELL_CLASS,
        )}
      >
        <span className="text-[13px] font-bold tabular-nums text-content">
          {label}
        </span>
        <dl className="flex items-baseline gap-4 text-[11.5px] tabular-nums">
          <SummaryStat label="낙찰" value={`${summary.wonCount}건`} />
          {wonOnly ? null : (
            <SummaryStat label="미낙찰" value={`${summary.lostCount}건`} />
          )}
          <SummaryStat label="낙찰금액" value={formatWon(summary.amount)} />
        </dl>
      </div>

      <div
        className={cn(
          "grid gap-2",
          wonOnly ? "lg:grid-cols-2" : "lg:grid-cols-3",
        )}
      >
        <DonutCard title="등급별 낙찰금액" data={gradeDist} fixedBody />
        <DonutCard title="부위별 낙찰금액" data={partDist} fixedBody />
        {wonOnly ? null : (
          <DonutCard title="낙찰률" data={rateDist} unit="count" fixedBody />
        )}
      </div>

      <DayDetailTable
        wonRows={wonRows}
        lostRows={lostRows}
        tab={wonOnly ? "won" : tab}
        onTab={setTab}
        hideTabs={wonOnly}
        averages={averages}
      />
    </div>
  );
}

function SummaryStat({
  label,
  value,
  title,
}: {
  label: string;
  value: string;
  title?: string;
}) {
  return (
    <span className="flex items-baseline gap-1.5" title={title}>
      <dt className="font-medium text-content-faint">{label}</dt>
      <dd className="font-bold text-content">{value}</dd>
    </span>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "px-4 py-16 text-center text-[13px] text-content-faint",
        SURFACE_SHELL_CLASS,
      )}
    >
      {children}
    </div>
  );
}
