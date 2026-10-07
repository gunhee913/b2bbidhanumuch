"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import { useAppTheme } from "@/hooks/useAppTheme";
import { SURFACE_SHELL_CLASS } from "@/features/live-auction/constants/surface";
import {
  formatCompactWon,
  formatWon,
} from "@/features/live-auction/lib/masking";

/**
 * 금액 분포 도넛 · 경매통계의 등급별·부위별·낙찰률 셋이 같은 부품을 쓴다.
 *
 * 낙찰분석 패널(`AuctionAnalysisPanel`) 안에 살던 것을 꺼냈다. 그 패널이 사라지면서
 * 천육백 줄짜리 파일에서 쓰이는 것이 이 카드 하나뿐이 됐는데, 그대로 두면 쓰지도
 * 않는 집계·표·추이차트가 도넛 하나 때문에 통째로 따라다닌다.
 */

/** 도넛 한 조각 · 「기타」 는 접어 둔 것들을 `children` 에 담는다 */
export interface DistItem {
  name: string;
  count: number;
  amount: number;
  /** 몫 비율 · **금액 기준** (건수가 아니다) */
  pct: number;
  children?: DistItem[];
}

/**
 * 도넛 조각 색 · 무채색 사다리 열 단 · 큰 조각이 진하다.
 *
 * recharts 는 SVG `fill` 에 값을 직접 받으므로 CSS 변수 토큰을 못 쓴다. 그래서
 * 명암마다 한 벌씩 손으로 적어 두고 훅이 고른다 (`PartMarketChart` 가 캔버스에
 * 색을 칠하는 방식과 같다).
 *
 * **밝기 간격을 고르게 다시 깔았다.** 전에는 일곱 단의 뒤쪽이 촘촘해(L* 76 → 86 → 93)
 * 작은 조각 셋이 한 색으로 뭉쳤고, 가장 옅은 단은 흰 패널 위에서 조각인지 빈자리인지
 * 구분이 안 됐다. 지금은 양 끝을 안쪽으로 당겨 바탕에 닿지 않게 하고 그 안에서 L* 를
 * 일정하게 나눈다 — 어느 이웃한 두 조각도 같은 간격만큼 벌어진다.
 *
 * 열 단인 것은 `DIST_TOP_N` 이 열이기 때문이다. 일곱 단일 때는 여덟째 조각이
 * `i % 7` 로 첫 조각 색을 다시 받아, 한 도넛 안에 같은 색 조각이 둘 생겼다.
 *
 * 색을 안 쓰는 것은 이 도넛이 **크기 순서**를 말하기 때문이다. 등급도 부위도 제 색이
 * 없어서, 하나를 빨강으로 칠하는 순간 그 조각만 뜻이 생긴다. 밝기는 순서를 그대로
 * 옮긴다 — 진한 것이 큰 것.
 */
const DONUT_PALETTE_LIGHT = [
  "#1c1c22",
  "#33333c",
  "#4a4a55",
  "#61616d",
  "#787885",
  "#8f8f9c",
  "#a6a6b2",
  "#bdbdc7",
  "#d2d2da",
  "#e4e4ea",
];

const DONUT_PALETTE_DARK = [
  "#ebebf0",
  "#d5d5dd",
  "#bfbfc9",
  "#a8a8b4",
  "#9292a0",
  "#7c7c8b",
  "#666676",
  "#515161",
  "#3d3d4b",
  "#2c2c37",
];

function useDonutPalette() {
  return useAppTheme() === "dark" ? DONUT_PALETTE_DARK : DONUT_PALETTE_LIGHT;
}

/**
 * 조각을 무엇으로 세나 · 금액(원)이 기본이고 낙찰률만 건수다.
 *
 * 못 딴 건에는 거래액이 없어 금액으로는 분모가 안 선다.
 */
export type DonutUnit = "won" | "count";

/**
 * 본문 높이 · 도넛 지름(140) + 위아래 여백(16×2).
 *
 * 범례 여섯 줄이 132px 라 도넛이 늘 더 크다 — 그래서 줄 수가 몇이든 이 높이에서
 * 멈춘다. 일곱 줄부터는 넘치므로 보내는 쪽이 「기타」 로 묶어 와야 한다.
 */
const DONUT_BODY_HEIGHT = 172;

/**
 * 고리 두께 · 바깥 62, 안쪽 46 (16px).
 *
 * 전에는 24px 였다. 가는 고리가 더 정갈해 보이기도 하지만, 여기서는 안쪽을 넓혀
 * 가운데에 합계를 적을 자리를 내려는 쪽이 크다 — 지름 92px 면 `1,983만` 이 한 줄로
 * 들어간다. 16px 아래로 더 깎으면 1% 짜리 조각이 실밥처럼 가늘어져 누를 수가 없다.
 */
const DONUT_INNER_R = 46;
const DONUT_OUTER_R = 62;

export function DonutCard({
  title,
  data,
  unit = "won",
  fixedBody = false,
}: {
  title: string;
  data: DistItem[];
  unit?: DonutUnit;
  /**
   * 본문 높이를 못 박는다 · 날짜를 옮길 때마다 카드가 들썩이지 않게.
   *
   * 한 줄에 선 도넛들은 격자가 이미 바닥을 맞춰 주지만, 가장 긴 범례가 높이를
   * 정하므로 고른 날에 따라 카드가 통째로 늘었다 줄었다 한다. 조각 수가 여섯을
   * 넘지 않는 자리(경매통계)에서만 켠다 — 안 켜면 범례 길이만큼 늘어난다.
   */
  fixedBody?: boolean;
}) {
  const colors = useDonutPalette();
  const total = useMemo(
    () => data.reduce((sum, d) => sum + d.amount, 0),
    [data],
  );
  const formatValue = (value: number) =>
    unit === "count" ? `${value.toLocaleString("ko-KR")}건` : formatWon(value);
  return (
    <div className={SURFACE_SHELL_CLASS}>
      <SectionHeader title={title} />
      {/* 넘침을 가두지 않는다 · 「기타」 범례가 띄우는 쪽지가 카드 밖으로 나간다 */}
      <div
        className="flex items-center p-4"
        style={fixedBody ? { height: DONUT_BODY_HEIGHT } : undefined}
      >
        {data.length === 0 || total === 0 ? (
          <div
            className="flex w-full items-center justify-center text-[12px] text-content-faint"
            style={fixedBody ? undefined : { height: 140 }}
          >
            표시할 데이터가 없습니다.
          </div>
        ) : (
          <div className="flex w-full items-center gap-5">
            <div className="relative h-[140px] w-[140px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={DONUT_INNER_R}
                    outerRadius={DONUT_OUTER_R}
                    /*
                     * 조각을 실선으로 가르던 것을 틈과 둥근 끝으로 바꿨다. 실선은
                     * 패널 면과 같은 색이라야 「붙어 있지 않다」 로 읽혀서 카드 배경이
                     * 바뀌는 자리마다 색을 다시 맞춰야 했는데, 틈은 아무 바탕에서나
                     * 틈이다. 끝을 둥글리면 가는 고리에서 조각이 토막이 아니라 하나의
                     * 획으로 보인다.
                     *
                     * 조각이 하나뿐이면 틈을 없앤다 — 100% 짜리 고리에 틈이 생기면
                     * 뭔가 빠진 것처럼 읽힌다.
                     */
                    stroke="none"
                    paddingAngle={data.length > 1 ? 2 : 0}
                    cornerRadius={3}
                    startAngle={90}
                    endAngle={-270}
                    isAnimationActive={false}
                  >
                    {data.map((entry, i) => (
                      <Cell key={entry.name} fill={colors[i % colors.length]} />
                    ))}
                  </Pie>
                  {/*
                   * 말풍선을 범례 위로 올린다.
                   *
                   * recharts 가 두르는 틀은 `position:absolute` 에 z-index 가 없고,
                   * 옆 범례의 줄들은 「기타」 쪽지를 띄우느라 `relative` 다. 둘 다
                   * z-index 가 없으면 같은 단계에서 DOM 차례로 그려지는데 범례가
                   * 뒤에 있어, 말풍선 위로 범례 색칩이 떠올랐다.
                   */}
                  {/* 말풍선은 안 미끄러진다 · 조각을 옮길 때마다 따라오는 상자는 굼떠 보인다 */}
                  <Tooltip
                    isAnimationActive={false}
                    wrapperStyle={{ zIndex: 30 }}
                    content={<DonutTooltip unit={unit} />}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/*
               * 고리 한가운데 · 비워 두면 그냥 구멍이고, 채우면 카드에서 제일 먼저
               * 읽히는 자리다. 머리에 작게 적어 두던 합계를 이리로 옮겼다 — 조각의
               * 크기를 재는 눈이 이미 가 있는 곳이라 두 번 볼 일이 없다.
               *
               * `pointer-events-none` · 여기에 손이 걸리면 가운데를 지나는 동안
               * 조각 말풍선이 꺼진다.
               */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-5 text-center">
                <span className="max-w-full truncate text-[13px] font-extrabold leading-none tabular-nums -tracking-[0.02em] text-content">
                  {unit === "count"
                    ? `${total.toLocaleString("ko-KR")}건`
                    : formatCompactWon(total)}
                </span>
              </div>
            </div>
            <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
              {data.map((entry, i) => {
                const hasChildren = entry.children && entry.children.length > 0;
                return (
                  <li
                    key={entry.name}
                    className="group relative flex text-[11.5px]"
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0"
                        style={{
                          backgroundColor: colors[i % colors.length],
                        }}
                        aria-hidden
                      />
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate text-content-mid",
                          hasChildren &&
                            "cursor-help underline decoration-content-faint decoration-dotted underline-offset-2",
                        )}
                        /* 「기타」 는 아래 팝오버가 맡는다 · 둘 다 걸면 같은 말이 겹쳐 뜬다 */
                        title={hasChildren ? undefined : entry.name}
                      >
                        {entry.name}
                      </span>
                      <span className="shrink-0 text-[10px] tabular-nums text-content-faint">
                        {entry.count}건
                      </span>
                      <span className="shrink-0 font-bold tabular-nums text-content">
                        {entry.pct}%
                      </span>
                    </span>
                    {/*
                     * 「기타」 상세는 위로 편다. 늘 범례 맨 아랫줄이라 아래로 열면
                     * 카드 밖으로 나가고, 화면 끝에 선 카드에서는 그대로 잘린다.
                     */}
                    {hasChildren ? (
                      <div className="pointer-events-none absolute bottom-full right-0 z-20 mb-1 hidden w-max min-w-[180px] max-w-[260px] border border-line bg-surface p-2 text-[11px] shadow-lg group-hover:block">
                        <div className="mb-1 text-[11px] font-medium text-content-faint">
                          기타 상세
                        </div>
                        <ul className="flex flex-col gap-0.5 tabular-nums">
                          {entry.children!.map((c) => (
                            <li
                              key={c.name}
                              className="flex items-center justify-between gap-3"
                            >
                              <span className="min-w-0 truncate text-content-mid">
                                {c.name}
                              </span>
                              <span className="shrink-0 whitespace-nowrap text-content-soft">
                                <span className="font-semibold text-content">
                                  {formatValue(c.amount)}
                                </span>
                                <span className="ml-1 text-content-faint">
                                  ({c.pct}%)
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="flex items-center justify-between gap-2 border-b border-line-soft px-3 py-1.5">
      <span className="text-[13px] font-bold text-content">{title}</span>
      {right}
    </header>
  );
}

interface TooltipPayloadItem {
  color?: string;
  name?: string;
  value?: number;
  payload?: { pct?: number; count?: number; children?: DistItem[] };
}

function DonutTooltip({
  active,
  payload,
  unit = "won",
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  unit?: DonutUnit;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  const name = item?.name ?? "";
  const amount = item?.value ?? 0;
  const pct = item?.payload?.pct ?? 0;
  const count = item?.payload?.count ?? 0;
  const children = item?.payload?.children;
  return (
    /*
     * `w-max` 가 있어야 한 줄로 선다.
     *
     * recharts 는 말풍선을 140px 짜리 차트 상자 안에 붙박이로 띄운다. 폭을 안 정해
     * 두면 그 상자가 천장이 되어 `1,983,640원` 이 「1,983,640」 과 「원」 으로 끊긴다 —
     * 한글은 글자 사이 어디서나 줄이 갈리므로 숫자와 단위가 갈라져도 막지 못한다.
     * 내용만큼만 벌리되(`w-max`) 「기타」 상세가 길어질 때를 대비해 천장을 둔다.
     */
    <div
      className={cn(
        "w-max max-w-[280px] px-3 py-2 shadow-lg",
        SURFACE_SHELL_CLASS,
      )}
    >
      <div className="text-[11px] font-bold text-content">{name}</div>
      <div className="mt-0.5 flex items-baseline gap-1.5 whitespace-nowrap text-[12px] tabular-nums">
        <span className="font-bold text-content">
          {unit === "count" ? `${count}건` : formatWon(amount)}
        </span>
        <span className="text-content-soft">({pct}%)</span>
        {/* 건수로 세는 도넛은 앞의 값이 이미 건수다 · 두 번 적지 않는다 */}
        {unit === "count" ? null : (
          <span className="text-content-faint">· {count}건</span>
        )}
      </div>
      {children && children.length > 0 ? (
        <div className="mt-2 border-t border-line-soft pt-1.5">
          <div className="mb-1 text-[11px] font-medium text-content-faint">
            상세
          </div>
          <ul className="flex flex-col gap-0.5 text-[11px] tabular-nums">
            {children.map((c) => (
              <li
                key={c.name}
                className="flex items-center justify-between gap-3"
              >
                <span className="min-w-0 truncate text-content-mid">
                  {c.name}
                </span>
                <span className="shrink-0 whitespace-nowrap text-content-soft">
                  <span className="font-semibold text-content">
                    {formatWon(c.amount)}
                  </span>
                  <span className="ml-1 text-content-faint">({c.pct}%)</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
