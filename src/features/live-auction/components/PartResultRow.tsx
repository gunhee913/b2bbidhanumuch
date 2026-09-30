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
 * 나와 가까운 결과일수록 진하게 · 내 낙찰(먹색) > 미낙찰(rose · 요약·마감 알림과 같은 뜻) > 낙찰(옅은 회색).
 * 유찰은 낙찰과 겹치지 않게 흰 바탕 테두리로 한 단계 더 물린다.
 */
const CHIP_TONE: Record<PartOutcome, string> = {
  won: "bg-inverse text-inverse-content",
  lost: "bg-rose-50 text-rose-600",
  noBid: "bg-surface-accent text-content-soft",
  passed: "bg-surface text-content-faint ring-1 ring-inset ring-line",
  waiting: "bg-surface text-content-mid ring-1 ring-inset ring-slate-300",
};

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
 * 낙찰은 채운 칩으로 표 안에서 가장 먼저 눈에 걸리게 한다 · 내 낙찰은 칩 글자(「내 낙찰」)로 구분.
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
    <span
      className={cn(
        "inline-flex h-[18px] shrink-0 items-center justify-center rounded-[1px] px-1.5 text-[10.5px] font-bold tracking-tight",
        CHIP_TONE[outcome],
      )}
    >
      {label ?? CHIP_LABEL[outcome]}
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
 * 배경과 좌측 accent 는 위 행(`getRowBgClass` · `getRowAccentClass`)과 같은 값을 써서
 * 두 줄이 한 덩어리로 읽히게 한다.
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
