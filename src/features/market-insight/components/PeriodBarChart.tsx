"use client";

import { useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SURFACE_SHELL_CLASS } from "@/features/live-auction/constants/surface";
import {
  formatCompactWon,
  formatWon,
} from "@/features/live-auction/lib/masking";
import type { BucketStat } from "../lib/dailyStats";

/** 한 번에 세우는 칸 수 천장 · 더 오면 최근 것부터 자른다 */
const MAX_BUCKETS = 18;

/** 가장 긴 막대의 높이 (px) */
const BAR_AREA_HEIGHT = 132;

/**
 * 값 글자가 쓸 자리 (px) · 가장 긴 막대 위에 이만큼을 더 둔다.
 *
 * 글자를 칸 꼭대기에 못 박아 두면 짧은 막대 위로는 허공이 한참이고 가장 긴 막대
 * 위로는 한 톨도 안 남아, 제일 중요한 달의 값이 막대에 들러붙는다. 글자를 막대에
 * 붙여 함께 오르내리게 하고, 다 찬 막대도 숨 쉴 자리를 여기서 확보한다.
 */
const BAR_LABEL_SPACE = 18;

/** 막대 사이 틈 (px) · 칸 너비에서 이만큼 뺀 것이 막대다 */
const BAR_GAP = 6;

/**
 * 가장 작은 막대도 이만큼은 올라온다 (px).
 *
 * 큰 달의 1% 밖에 안 되는 달은 비율대로면 1px 이라 바닥선과 구분이 안 간다. 「적게
 * 먹은 달」 과 「안 나간 달」 은 다른 말이라 눈에 보이는 선은 남겨야 한다.
 */
const BAR_MIN_HEIGHT = 3;

/**
 * 구간별 낙찰금액 막대 · 일자별 캘린더가 서던 자리에 대신 선다.
 *
 * 달이나 해를 캘린더로 깔 수는 없다. 칸 안에 적을 것이 금액 하나뿐이고, 달력의
 * 쓸모였던 「무슨 요일에 장이 섰나」 가 달 단위에서는 아무 뜻이 없다. 구간끼리
 * 견주는 자리에서 묻는 것은 늘 「저번보다 많이 샀나」 라서, 길이로 바로 견줘지는
 * 막대가 맞다.
 *
 * **막대 묶음은 판 너비를 안 채우고 가운데 선다.** 아홉 칸을 1100px 에 고르게
 * 펴면 칸 하나가 122px 이 되는데, 거기에 막대를 꽉 채우면 높이보다 넓은 네모가
 * 되고 좁게 그리면 막대들이 서로 멀찍이 떨어져 한 그림으로 안 읽힌다. 칸 너비를
 * 못 박아 두고 남는 자리는 양옆으로 흘린다 — 칸이 하나든 열여덟이든 막대 굵기와
 * 사이 틈이 같아서 탭을 옮겨도 그림의 결이 안 변한다.
 *
 * **색은 안 쓰고 밝기만 쓴다.** 옆 추이 막대(`AvgPriceTrendChart`)와 같은 셈이다 —
 * 글자색 토큰을 면으로 쓰면 명암을 뒤집어도 「진한 막대 = 고른 칸」 이 그대로 선다.
 */
export function PeriodBarChart({
  title,
  nav,
  buckets,
  selectedKey,
  onSelect,
  labelOf,
  titleOf,
  slotWidth,
}: {
  title: string;
  /** 제목 옆에 서는 조작 · 월별의 연도 고르개처럼 */
  nav?: ReactNode;
  /** 빈 구간까지 메워 놓은 차례 (`buildMonthStats` · `buildYearStats`) */
  buckets: BucketStat[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  /** 막대 밑에 적을 짧은 이름 · `9월` `26.01` `2026` */
  labelOf: (key: string) => string;
  /** 말풍선에 적을 긴 이름 · `2026.09` */
  titleOf: (key: string) => string;
  /** 칸 하나의 너비 (px) · 막대는 여기서 틈만큼 좁다 */
  slotWidth: number;
}) {
  const shown = useMemo(() => buckets.slice(-MAX_BUCKETS), [buckets]);
  const maxAmount = useMemo(
    () => Math.max(0, ...shown.map((b) => b.wonAmount)),
    [shown],
  );
  const total = useMemo(
    () =>
      shown.reduce(
        (acc, b) => ({
          count: acc.count + b.wonCount,
          amount: acc.amount + b.wonAmount,
        }),
        { count: 0, amount: 0 },
      ),
    [shown],
  );

  /* 칸이 좁아지면 값 글자를 지운다 · 겹쳐 적느니 안 적는 편이 낫다 (말풍선에 남는다) */
  const dense = slotWidth < 60;

  return (
    <section className={cn("flex flex-col", SURFACE_SHELL_CLASS)}>
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-3 py-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <h2 className="shrink-0 text-[14px] font-extrabold text-content">
            {title}
          </h2>
          {nav}
        </div>
        <span className="text-[11.5px] tabular-nums text-content-faint">
          낙찰 <span className="font-bold text-content">{total.count}건</span>
          {total.amount > 0 ? (
            <>
              {" · "}
              <span className="font-bold text-content">
                {formatWon(total.amount)}
              </span>
            </>
          ) : null}
        </span>
      </header>

      {shown.length === 0 ? (
        <div className="px-4 py-16 text-center text-[13px] text-content-faint">
          아직 낙찰 내역이 없습니다.
        </div>
      ) : (
        <div className="overflow-x-auto px-3 pb-2 pt-4">
          <div
            className="mx-auto grid items-end"
            style={{
              gridTemplateColumns: `repeat(${shown.length}, ${slotWidth}px)`,
              width: slotWidth * shown.length,
            }}
          >
            {shown.map((b) => (
              <Bar
                key={b.key}
                stat={b}
                maxAmount={maxAmount}
                selected={b.key === selectedKey}
                dense={dense}
                label={labelOf(b.key)}
                title={titleOf(b.key)}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Bar({
  stat,
  maxAmount,
  selected,
  dense,
  label,
  title,
  onSelect,
}: {
  stat: BucketStat;
  maxAmount: number;
  selected: boolean;
  dense: boolean;
  label: string;
  title: string;
  onSelect: (key: string) => void;
}) {
  const empty = stat.wonAmount <= 0;
  const ratio = maxAmount > 0 ? stat.wonAmount / maxAmount : 0;
  const height = empty
    ? 0
    : Math.max(BAR_MIN_HEIGHT, Math.round(ratio * BAR_AREA_HEIGHT));

  return (
    <button
      type="button"
      onClick={() => onSelect(stat.key)}
      aria-pressed={selected}
      title={
        empty
          ? `${title} · 낙찰 없음`
          : `${title} · 낙찰 ${stat.wonCount}건 · ${formatWon(stat.wonAmount)}`
      }
      className="group/bar flex min-w-0 flex-col items-stretch"
    >
      {/*
       * 값 글자와 막대를 한 칸에 쌓고 바닥으로 민다 (`justify-end`). 그래야 글자가
       * 늘 막대 머리 바로 위에 붙어 함께 오르내린다.
       *
       * 바닥선 위에 막대를 올린다 · 선이 없으면 길이를 견줄 기준이 눈에 없다.
       */}
      <span
        className="flex flex-col items-center justify-end border-b border-line"
        style={{ height: BAR_AREA_HEIGHT + BAR_LABEL_SPACE }}
      >
        {!dense ? (
          <span
            className={cn(
              "mb-1 w-full truncate text-center text-[10px] font-bold tabular-nums leading-none -tracking-[0.02em]",
              empty
                ? "text-content-ghost"
                : selected
                  ? "text-content"
                  : "text-content-faint",
            )}
          >
            {empty ? "-" : formatCompactWon(stat.wonAmount)}
          </span>
        ) : null}
        <span
          className={cn(
            "rounded-t-[2px] transition-colors",
            empty
              ? "border-t border-dashed border-line-soft"
              : selected
                ? "bg-inverse"
                : "bg-content-faint group-hover/bar:bg-content-soft",
          )}
          style={{
            width: `calc(100% - ${BAR_GAP}px)`,
            height: empty ? undefined : height,
          }}
        />
      </span>

      <span
        className={cn(
          "truncate pt-1.5 text-center text-[10.5px] tabular-nums leading-none",
          selected
            ? "font-bold text-content"
            : "font-medium text-content-faint",
        )}
      >
        {label}
      </span>
    </button>
  );
}
