"use client";

import { format, parse } from "date-fns";
import { ko } from "date-fns/locale";
import { useAuctionDayStats } from "@/features/auction-days/hooks/useAuctionDayStats";
import { useCurrentHouse } from "@/features/entry/hooks/useCurrentHouse";
import type { AuctionDayGradeStat } from "@/features/main/api";
import { cn } from "@/lib/utils";

/** 데이터가 아직 없어도 표 모양은 유지한다 · 칸이 비는 것도 그날의 정보다 */
const GRADE_ROWS = ["1++(9)", "1++(8)", "1++(7)", "1+", "1", "2", "3"] as const;

export interface GradeListingTableProps {
  /** yyyy-MM-dd · 달력에서 고른 날 */
  date: string;
  /** 바깥에 날짜를 적어 주는 자리가 없을 때만 켠다 (모달 등) */
  showDate?: boolean;
  /** 감싸는 쪽의 테두리·여백 · 패널 안인지 카드 안인지에 따라 다르다 */
  className?: string;
}

/**
 * 고른 날의 등급별 상장 두수 · 육질(1++ 는 근내지방도까지) × 육량 A/B/C 매트릭스.
 *
 * 달력은 "장이 서느냐" 까지만 말한다. 정작 나갈지 말지를 가르는 건 그날 어떤 등급이
 * 얼마나 나오느냐라서, 고른 날마다 이 표가 따라 바뀌어야 달력을 누르는 의미가 생긴다.
 *
 * 합계 열을 따로 두는 건 A/B/C 를 눈으로 더하게 하지 않으려는 것이고, 등급 행을 늘
 * 일곱 개 다 세우는 건 「1++ 가 없는 날」 과 「아직 안 불러온 날」 을 구분하기 위해서다.
 */
export function GradeListingTable({
  date,
  showDate,
  className,
}: GradeListingTableProps) {
  const { house } = useCurrentHouse();
  const { data, isLoading } = useAuctionDayStats(date, house?.name ?? null);

  const byGrade = new Map(
    (data?.byGrade ?? []).map((g) => [g.grade, g] as const),
  );
  const total = data?.totalListings ?? 0;

  return (
    <section className={cn("px-2", className)} aria-label="등급별 상장">
      {/* 달력 밑에서는 바로 위 블록이 날짜를 이미 크게 적고 있어 또 적지 않는다 */}
      <header className="flex items-baseline justify-between gap-2 px-2">
        <h3 className="text-[12px] font-bold tracking-tight text-content">
          등급별 상장
        </h3>
        {showDate ? (
          <span className="text-[11px] font-medium tabular-nums text-content-soft">
            {formatDayLabel(date)}
          </span>
        ) : null}
      </header>

      {total === 0 ? (
        <p className="px-2 pt-2 text-[11.5px] font-medium text-content-soft">
          {isLoading ? "불러오는 중..." : "이 날은 상장 기록이 없습니다"}
        </p>
      ) : (
        <>
          <div className="mt-1.5 flex items-center border-b border-line-soft px-2 pb-1 text-[10px] font-semibold text-content-soft">
            <span className="flex-1">등급</span>
            <span className="w-8 text-right">A</span>
            <span className="w-8 text-right">B</span>
            <span className="w-8 text-right">C</span>
            <span className="w-9 text-right">계</span>
          </div>

          <ul>
            {GRADE_ROWS.map((grade) => (
              <GradeRow
                key={grade}
                grade={grade}
                stat={byGrade.get(grade) ?? null}
              />
            ))}
          </ul>

          <div className="flex items-center border-t border-line-soft px-2 pt-1.5 text-[11px] font-semibold tabular-nums text-content-soft">
            <span className="flex-1">합계</span>
            <SumCell value={sumOf(data?.byGrade, "A")} />
            <SumCell value={sumOf(data?.byGrade, "B")} />
            <SumCell value={sumOf(data?.byGrade, "C")} />
            <span className="w-9 text-right text-[11.5px] font-bold text-content">
              {total.toLocaleString("ko-KR")}
            </span>
          </div>
        </>
      )}
    </section>
  );
}

function GradeRow({
  grade,
  stat,
}: {
  grade: string;
  stat: AuctionDayGradeStat | null;
}) {
  const rowTotal = stat?.total ?? 0;
  const empty = rowTotal === 0;

  return (
    <li className="flex items-center px-2 py-[5px]">
      <span
        className={cn(
          "flex-1 text-[11.5px] tabular-nums",
          empty
            ? "font-medium text-content-soft"
            : "font-semibold text-content-mid",
        )}
      >
        {grade}
      </span>
      <Cell value={stat?.A ?? 0} />
      <Cell value={stat?.B ?? 0} />
      <Cell value={stat?.C ?? 0} />
      <span
        className={cn(
          "w-9 text-right text-[11.5px] tabular-nums",
          empty ? "text-content-soft" : "font-bold text-content",
        )}
      >
        {empty ? "-" : rowTotal.toLocaleString("ko-KR")}
      </span>
    </li>
  );
}

function Cell({ value }: { value: number }) {
  return (
    <span
      className={cn(
        "w-8 text-right text-[11px] tabular-nums",
        value > 0 ? "font-medium text-content-mid" : "text-content-soft",
      )}
    >
      {value > 0 ? value : "-"}
    </span>
  );
}

function SumCell({ value }: { value: number }) {
  return (
    <span className="w-8 text-right text-[11px] tabular-nums">
      {value > 0 ? value : "-"}
    </span>
  );
}

function sumOf(
  rows: AuctionDayGradeStat[] | undefined,
  key: "A" | "B" | "C",
): number {
  return (rows ?? []).reduce((acc, r) => acc + r[key], 0);
}

function formatDayLabel(iso: string): string {
  const d = parse(iso, "yyyy-MM-dd", new Date());
  if (Number.isNaN(d.getTime())) return iso;
  return format(d, "M월 d일 (EEEEE)", { locale: ko });
}
