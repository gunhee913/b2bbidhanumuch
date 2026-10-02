"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatKrw } from "../lib/masking";
import {
  isSoldResult,
  type PartOutcome,
  type PartResult,
} from "../lib/partResult";
import { PRICE_NUMBER_FORMATTER } from "./PriceSlot";

/**
 * 칩은 「나에게」 어떤 결과인지를 말한다 · 내 낙찰 / 미낙찰(입찰했으나 밀림) / 낙찰(참여 안 함).
 */
const CHIP_LABEL: Record<PartOutcome, string> = {
  won: "내 낙찰",
  lost: "미낙찰",
  noBid: "낙찰",
  passed: "유찰",
  waiting: "대기",
};

/**
 * 색이 갈라 놓는 건 「내 결과냐 남의 결과냐」다 · 내 낙찰(파랑) · 미낙찰(빨강) 둘만 색을 갖고
 * 낙찰 · 유찰 · 대기는 무채색으로 물러난다. 열을 훑을 때 세는 건 파랑 몇 · 빨강 몇 이라
 * 색 대비가 그 일을 바로 한다.
 *
 * 다만 진하게는 칠하지 않는다. 내 낙찰은 여기서 가장 흔한 상태라(스무 부위에 다 입찰하면
 * 열넷이 이 칸에 온다) 먹색으로 채웠더니 표의 70%가 검은 칩이 되어 아무것도 가리키지
 * 못했다. 그래서 색은 주되 바탕은 잠기게 두고 글자만 띄운다.
 *
 * 시세 관행(빨강 상승 · 파랑 하락)과는 뒤집혀 있다. 알고 그렇게 뒀다 — 이 열에서 파랑은
 * 등락이 아니라 「내 것」이고, 표 안 낙찰가 · 경락대금 열에는 애초에 색이 없어 숫자와
 * 나란히 놓일 일이 없다. `rise`/`fall` 은 시세 차트 카드 안에서만 쓴다.
 *
 * 색은 `won`/`lost` 토큰이라 두 모드에서 값이 갈린다 · 라이트는 연한 바탕 + 진한 글자,
 * 다크는 그 명암을 뒤집는다. 고정 틴트(blue-50)로 두면 먹색 위에서 행 대비 15:1 짜리
 * 흰 덩어리가 된다 — `fall` 토큰을 그대로 쓰지 않는 이유도 같다(연 바탕 위 3.41).
 */
const CHIP_TONE: Record<PartOutcome, string> = {
  won: "bg-won-surface text-won",
  lost: "bg-lost-surface text-lost",
  noBid: "bg-surface-accent text-content-soft",
  passed: "bg-surface text-content-faint ring-1 ring-inset ring-line",
  waiting: "bg-surface text-content-mid ring-1 ring-inset ring-line",
};

/**
 * 다섯 결과와 「입찰」이 모두 같은 상자를 쓴다 · 크기가 같아야 열이 흔들리지 않는다.
 * 경매내역의 진행중·낙찰·미낙찰 배지도 이 상자를 가져다 쓴다 — 같은 뜻이면 같은 크기.
 */
export const CHIP_BASE =
  "inline-flex h-[18px] shrink-0 items-center justify-center rounded-[1px] px-1.5 text-[10.5px] font-bold tracking-tight";

const RESULT_CELL_CLASS = "relative pb-2 pl-3 pr-3 pt-0";
const RESULT_LINE_CLASS =
  "flex min-h-[18px] flex-wrap items-center gap-x-2 gap-y-1 whitespace-nowrap text-[10.5px] leading-[1.6]";

/** 다음 회차가 열려 다시 입찰 중인 대기 부위는 `진행` · 그 외엔 기본 라벨 */
export function resultChipLabel(result: PartResult): string | undefined {
  return result.outcome === "waiting" && result.nextRoundOpen
    ? "진행"
    : undefined;
}

/**
 * 결과 칩 · 텍스트 칩 폼팩터 (h-[18px] · 10.5px bold).
 * 다섯 결과가 모두 같은 상자를 쓰고 `CHIP_TONE` 의 색만 갈린다 · 크기가 같아야 열이 흔들리지 않는다.
 */
export function ResultChip({
  outcome,
  label,
}: {
  outcome: PartOutcome;
  /** 기본 라벨 대신 · 다음 회차가 열려 다시 입찰 중이면 `진행` */
  label?: string;
}) {
  return (
    <span className={cn(CHIP_BASE, CHIP_TONE[outcome])}>
      {label ?? CHIP_LABEL[outcome]}
    </span>
  );
}

/**
 * 결과 전 · 「내가 걸어 뒀다」 · 서버에 들어간 내 입찰이 있을 때만.
 *
 * 결과 칩과 같은 자리 · 같은 상자를 쓰는 게 핵심이다. 한 칸이 시간순으로 이어 말한다 —
 * 속 빈 파랑(걸었다) → 속이 차면 내 낙찰, 빨강으로 바뀌면 미낙찰. 자리를 옮기면
 * 그 이어짐이 끊기고 그냥 뱃지가 하나 더 느는 것에 그친다.
 *
 * 속을 비워 두는 건 아직 결과가 아니라는 뜻이다. 채우면 마감된 줄과 구별되지 않는다.
 *
 * 입력칸에 숫자가 있는 것과는 다른 말이다 — 거기 숫자는 아직 안 보낸 초안일 수도 있다.
 * 그 차이를 지금은 테두리 색 하나가 지고 있었다.
 */
export function MyBidChip() {
  return (
    <span
      className={cn(CHIP_BASE, "text-won ring-1 ring-inset ring-won/45")}
      title="입찰을 넣고 결과를 기다리는 중입니다"
    >
      입찰중
    </span>
  );
}

/**
 * 부위 행 바로 아래 붙는 경매결과 띠 · 개체별 · 부위별 · 상장표 · 상장표(부위별) 공용.
 *
 *   [낙찰] 1회차 · 낙찰자 7000001 · 낙찰가 97,100 · 경락대금 971,000
 *   [대기]
 *
 * 낙찰 안 된 부위도 같은 높이의 띠를 받아 3열 미니표에서 행이 가로로 줄 맞춰진다.
 * 대신 칩 하나만 두고 나머지는 비워, 반복되는 문장이 표를 덮지 않게 한다.
 *
 * 열에 맞추지 않고 왼쪽부터 라벨-값으로 채운다. 위 행의 `내 입찰가` 와 같은 세로선에
 * 남의 낙찰가를 놓으면 두 숫자의 주인이 섞여 읽히던 문제를 라벨로 끊는다.
 * 가장 좁은 곳(상장표 3열 미니표 · 약 413px)에 한 줄로 들어가도록 10.5px 로 낮췄다.
 *
 * 배경은 위 행(`getRowBgClass`)과 같은 값을 써서 두 줄이 한 덩어리로 읽히게 한다.
 */
export function PartResultRow({
  result,
  colSpan,
  isSelected,
  onClick,
  className,
}: {
  result: PartResult;
  colSpan: number;
  isSelected: boolean;
  onClick: () => void;
  className?: string;
}) {
  const { outcome, roundNo } = result;
  const iWon = outcome === "won";
  const isSold = isSoldResult(result);
  const chipLabel = resultChipLabel(result);

  return (
    <tr
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-colors",
        isSelected
          ? "bg-surface-accent hover:bg-surface-accent"
          : "bg-surface-muted hover:bg-surface-accent",
        className,
      )}
    >
      <td colSpan={colSpan} className={RESULT_CELL_CLASS}>
        {/* 끝난 줄임을 알리는 옅은 띠 · 누가 가져갔는지는 칩과 낙찰자가 말한다 */}
        {isSold ? (
          <span
            className="absolute inset-y-0 left-0 w-[3px] bg-content-ghost"
            aria-hidden
          />
        ) : null}
        <div className={RESULT_LINE_CLASS}>
          <ResultChip outcome={outcome} label={chipLabel} />
          {isSold ? (
            <>
              {roundNo != null ? (
                <span className="font-semibold text-content-soft">
                  {roundNo}회차
                </span>
              ) : null}
              <Field label="낙찰자">
                <span className="font-medium tabular-nums text-content-mid">
                  {result.dealerNo || "-"}
                </span>
              </Field>
              <Field label="낙찰가">
                <Value strong={iWon}>
                  {result.price != null
                    ? PRICE_NUMBER_FORMATTER.format(Math.round(result.price))
                    : "-"}
                </Value>
              </Field>
              <Field label="경락대금">
                <Value strong={iWon}>{formatKrw(result.amount)}</Value>
              </Field>
            </>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="text-content-faint">{label}</span>
      {children}
    </span>
  );
}

function Value({ strong, children }: { strong: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        "tabular-nums -tracking-[0.01em]",
        strong ? "font-bold text-content" : "font-semibold text-content",
      )}
    >
      {children}
    </span>
  );
}
