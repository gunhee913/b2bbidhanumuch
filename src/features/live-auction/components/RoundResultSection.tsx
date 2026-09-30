"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LiveListing } from "../api";
import {
  avgPerKg,
  buildRoundResult,
  wonRate,
  type RoundPartRow,
  type RoundResultCell,
} from "../lib/roundResult";

/** 고른 회차를 결과로 보여줄 수 있는 상태인가 */
export type RoundResultState = "closed" | "pending" | "none";

export interface RoundResultSectionProps {
  roundNo: number | null;
  state: RoundResultState;
  listings: LiveListing[];
  /** 개체 → 걸린 회차 번호 · 회차별 상장 수를 세는 기준 */
  roundListingMap: Record<string, number[]>;
}

/**
 * 회차별 경매 결과 · 부위별 낙찰/상장과 평균 단가, 부위를 펼치면 등급별.
 *
 * 회차는 위 시간표에서 고른다 — 여기에 회차 탭을 또 두면 같은 번호가 한 화면에 두 줄로
 * 나오고, 시간표 줄은 이미 어느 회차가 끝났는지 말하고 있어 선택지로 쓰기에 딱 맞다.
 *
 * 진행 중인 회차는 결과를 그리지 않는다. 비공개 입찰이라 마감 전에는 매참인에게
 * 낙찰 여부가 내려오지 않아, 그려 봐야 「전부 유찰」 로 보이는 거짓 화면이 된다.
 */
export function RoundResultSection({
  roundNo,
  state,
  listings,
  roundListingMap,
}: RoundResultSectionProps) {
  const result = useMemo(
    () =>
      state === "closed" && roundNo != null
        ? buildRoundResult(roundNo, listings, roundListingMap)
        : null,
    [state, roundNo, listings, roundListingMap],
  );

  return (
    <section
      className="mt-1 border-t border-line-soft px-2 pb-3 pt-3"
      aria-label="회차별 경매 결과"
    >
      <h3 className="px-2 text-[12px] font-bold tracking-tight text-content">
        {roundNo != null ? `${roundNo}회차 결과` : "회차별 결과"}
      </h3>

      {state !== "closed" || !result ? (
        <p className="px-2 pt-2 text-[11.5px] font-medium text-content-soft">
          {state === "pending"
            ? "회차가 마감되면 공개됩니다"
            : "마감된 회차가 없습니다"}
        </p>
      ) : result.total.offered === 0 ? (
        <p className="px-2 pt-2 text-[11.5px] font-medium text-content-soft">
          이 회차에 오른 부위가 없습니다
        </p>
      ) : result.total.won === 0 ? (
        /* 전부 유찰이면 부위 표를 펴 봐야 `0/19` 가 스무 줄 늘어설 뿐이다 */
        <p className="px-2 pt-2 text-[11.5px] font-medium tabular-nums text-content-soft">
          상장{" "}
          <span className="font-bold text-content">{result.total.offered}</span>
          부위 · 낙찰 없음
        </p>
      ) : (
        <>
          <ResultSummary total={result.total} />
          <PartBreakdown parts={result.parts} />
        </>
      )}
    </section>
  );
}

/**
 * 부위별 표 · 접어 둔 채로 시작한다.
 *
 * 부위가 스무 줄이라 펴 두면 패널 높이를 혼자 다 먹고, 정작 위쪽 남은 시간과 회차 요약이
 * 화면 밖으로 밀린다. 회차를 옮겨 다닐 때 대부분 궁금한 건 요약 두 줄이라 그게 늘 보이게
 * 두고, 부위별은 필요할 때만 편다.
 */
function PartBreakdown({ parts }: { parts: RoundPartRow[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-1 flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-[11.5px] font-semibold text-content-soft transition-colors hover:bg-surface-accent hover:text-content"
      >
        부위별
        <span className="tabular-nums text-content-soft">{parts.length}</span>
        <ChevronDown
          className={cn(
            "ml-auto h-3.5 w-3.5 transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <>
          <ColumnHeader />
          <ul>
            {parts.map((part) => (
              <PartRow key={part.partName} part={part} />
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}

/** 회차 요약 두 줄 · 위는 물량, 아래는 돈 */
function ResultSummary({ total }: { total: RoundResultCell }) {
  const rate = wonRate(total);
  const avg = avgPerKg(total);

  return (
    <div className="px-2 pb-2 pt-1.5">
      <p className="text-[12px] font-medium tabular-nums text-content-soft">
        낙찰 <span className="font-bold text-content">{total.won}</span> /{" "}
        {total.offered}부위
        {rate != null ? ` · ${(rate * 100).toFixed(1)}%` : null}
      </p>
      <p className="mt-0.5 text-[11.5px] font-medium tabular-nums text-content-soft">
        {formatCompactWon(total.amount)}
        {avg != null ? ` · 평균 ${avg.toLocaleString("ko-KR")}원/kg` : null}
      </p>
    </div>
  );
}

function ColumnHeader() {
  return (
    <div className="flex items-center gap-1.5 border-b border-line-soft px-2 pb-1 text-[10px] font-semibold text-content-soft">
      <span className="w-[58px]">부위</span>
      <span className="flex-1" />
      <span className="w-[42px] text-right">낙찰</span>
      <span className="w-[58px] text-right">평균단가</span>
      <span className="w-3" aria-hidden />
    </div>
  );
}

/**
 * 부위 한 줄 · 낙찰이 있는 부위만 등급별로 펼칠 수 있다.
 * 한 건도 안 팔린 부위를 펼쳐 봐야 `0/4` 가 등급 수만큼 늘어설 뿐이다.
 */
function PartRow({ part }: { part: RoundPartRow }) {
  const [expanded, setExpanded] = useState(false);
  const canExpand = part.won > 0 && part.grades.length > 1;

  const body = (
    <>
      <span
        className={cn(
          "w-[58px] truncate text-left text-[11.5px] font-medium",
          part.won > 0 ? "text-content-mid" : "text-content-soft",
        )}
      >
        {part.partName}
      </span>
      <span className="flex-1" />
      <CountCell cell={part} />
      <PriceCell cell={part} />
      {canExpand ? (
        <ChevronDown
          className={cn(
            "h-3 w-3 shrink-0 text-content-soft transition-transform duration-200",
            expanded && "rotate-180",
          )}
          aria-hidden
        />
      ) : (
        <span className="w-3 shrink-0" aria-hidden />
      )}
    </>
  );

  return (
    <li>
      {canExpand ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex w-full items-center gap-1.5 rounded-md px-2 py-[5px] transition-colors hover:bg-surface-accent"
        >
          {body}
        </button>
      ) : (
        <div className="flex w-full items-center gap-1.5 px-2 py-[5px]">
          {body}
        </div>
      )}

      {canExpand && expanded ? (
        <ul className="mb-1 ml-2 border-l border-line-soft">
          {part.grades.map((g) => (
            <li
              key={g.grade}
              className="flex items-center gap-1.5 py-[3px] pl-2 pr-2"
            >
              <span className="w-[50px] truncate text-[11px] font-medium text-content-soft">
                {g.grade}
              </span>
              <span className="flex-1" />
              <CountCell cell={g} muted />
              <PriceCell cell={g} muted />
              <span className="w-3 shrink-0" aria-hidden />
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** `3/20` · 낙찰이 0이면 숫자까지 흐려 스캔에서 빠지게 한다 */
function CountCell({
  cell,
  muted,
}: {
  cell: RoundResultCell;
  muted?: boolean;
}) {
  return (
    <span
      className={cn(
        "w-[42px] shrink-0 text-right tabular-nums",
        muted ? "text-[11px]" : "text-[11.5px]",
      )}
    >
      <span
        className={cn(
          cell.won > 0
            ? muted
              ? "font-semibold text-content-mid"
              : "font-bold text-content"
            : "text-content-soft",
        )}
      >
        {cell.won}
      </span>
      <span className="text-content-soft">/{cell.offered}</span>
    </span>
  );
}

function PriceCell({
  cell,
  muted,
}: {
  cell: RoundResultCell;
  muted?: boolean;
}) {
  const avg = avgPerKg(cell);
  return (
    <span
      className={cn(
        "w-[58px] shrink-0 text-right tabular-nums",
        muted ? "text-[11px]" : "text-[11.5px]",
        avg == null
          ? "text-content-soft"
          : muted
            ? "font-semibold text-content-mid"
            : "font-bold text-content",
      )}
    >
      {avg == null ? "-" : avg.toLocaleString("ko-KR")}
    </span>
  );
}

/** 304px 패널에서 9,641,085원은 너무 길다 · 자릿수보다 규모가 중요한 자리 */
function formatCompactWon(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "-";
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}억원`;
  if (value >= 10_000) {
    return `${Math.round(value / 10_000).toLocaleString("ko-KR")}만원`;
  }
  return `${value.toLocaleString("ko-KR")}원`;
}
