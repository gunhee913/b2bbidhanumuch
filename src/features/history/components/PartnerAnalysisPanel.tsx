"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWinningParts } from "@/features/delivery/hooks/useWinningParts";
import { useDeliveryAssignments } from "@/features/delivery/hooks/useDeliveryAssignments";
import type { AssignmentInfo, WinningPart } from "@/features/delivery/types";
import { formatWon } from "@/features/live-auction/lib/masking";
import { formatGradeLabel } from "@/features/live-auction/lib/grade";
import { PeriodFilter } from "./PeriodFilter";
import { DonutCard, type DistItem } from "./AuctionAnalysisPanel";

export interface PartnerAnalysisPanelProps {
  dealerId: string | null;
}

const KRW = new Intl.NumberFormat("ko-KR");
const WEEK_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

/**
 * 등급 표시용 버킷 순서 (도넛 분포 정렬 기준).
 * 육량(A/B/C) 은 통합 · 근내지방도 (9/8/7) 는 1++ 에 한해 분리.
 */
const GRADE_ORDER = [
  "1++(9)",
  "1++(8)",
  "1++(7)",
  "1++",
  "1+",
  "1",
  "2",
  "3",
];

/**
 * WinningPart 를 도넛 버킷으로 정규화.
 * 1++ 등급은 근내지방도(marbling · 9/8/7) 로 세분화.
 *
 * - grade 문자열에 "(N)" 이 있으면 그 값을 우선 사용
 * - 없으면 WinningPart.marbling 숫자 필드 사용
 * - 그 외 육량(A/B/C) 는 통합
 *
 * 예:
 * - "1++A(9)"          → "1++(9)"
 * - "1++A" + marbling=8 → "1++(8)"
 * - "1+B"              → "1+"
 * - "2C"               → "2"
 */
function toGradeBucket(item: WinningPart): string {
  const grade = item.grade;
  if (!grade) return "기타";
  const qualityMatch = grade.match(/^(1\+\+|1\+|1|2|3)/);
  if (!qualityMatch) return "기타";
  const quality = qualityMatch[1];
  if (quality === "1++") {
    const parenMatch = grade.match(/\((\d)\)/);
    const score = parenMatch
      ? Number(parenMatch[1])
      : Number(item.marbling ?? 0);
    if (score === 9 || score === 8 || score === 7) {
      return `1++(${score})`;
    }
    return "1++";
  }
  return quality;
}

interface PartnerRow {
  partnerId: string;
  partnerName: string;
  partnerNo: string;
  count: number;
  amount: number;
  /** 평균 배정단가 (원/kg · 총액/총중량) */
  avgPrice: number;
  /** 최근 배정 일자 (YYYY-MM-DD) */
  lastAssignedDate: string;
  /** 확장 영역에서 사용 · 배정된 부위 원본 리스트 */
  items: WinningPart[];
}

/**
 * 거래처 분석 대시보드.
 *
 * - 상단 · 기간 필터
 * - 거래처별 테이블 (배정금액 desc) · 클릭 시 단일 아코디언 확장
 * - 확장 영역 · 요약(도넛×2 + 요일 바) → 미니 캘린더 → 선택일 상세 테이블
 */
export function PartnerAnalysisPanel({ dealerId }: PartnerAnalysisPanelProps) {
  const today = format(new Date(), "yyyy-MM-dd");
  const monthAgo = format(subDays(new Date(), 29), "yyyy-MM-dd");
  const [startDate, setStartDate] = useState(monthAgo);
  const [endDate, setEndDate] = useState(today);
  const [searchStart, setSearchStart] = useState(monthAgo);
  const [searchEnd, setSearchEnd] = useState(today);

  const partsQuery = useWinningParts({
    dealerId,
    startDate: searchStart,
    endDate: searchEnd,
  });
  const assignmentsQuery = useDeliveryAssignments();

  const parts = useMemo<WinningPart[]>(
    () => partsQuery.data?.winningParts ?? [],
    [partsQuery.data],
  );
  const assignments = useMemo<Record<string, AssignmentInfo>>(
    () => assignmentsQuery.data?.assignments ?? {},
    [assignmentsQuery.data],
  );

  const isLoading = partsQuery.isLoading || assignmentsQuery.isLoading;

  const partners = useMemo<PartnerRow[]>(() => {
    interface Accum {
      partnerId: string;
      partnerName: string;
      partnerNo: string;
      count: number;
      amount: number;
      weightSum: number;
      lastAssignedDate: string;
      items: WinningPart[];
    }
    const map = new Map<string, Accum>();
    for (const p of parts) {
      const assign = assignments[p.partId];
      if (!assign) continue;
      let cur = map.get(assign.partnerId);
      if (!cur) {
        cur = {
          partnerId: assign.partnerId,
          partnerName: assign.partnerName || "-",
          partnerNo: assign.partnerNo || "",
          count: 0,
          amount: 0,
          weightSum: 0,
          lastAssignedDate: "",
          items: [],
        };
        map.set(assign.partnerId, cur);
      }
      cur.count++;
      cur.amount += p.bidAmount;
      cur.weightSum += p.weight;
      cur.items.push(p);
      if (p.listingDate > cur.lastAssignedDate) {
        cur.lastAssignedDate = p.listingDate;
      }
    }
    return Array.from(map.values())
      .map((v) => ({
        partnerId: v.partnerId,
        partnerName: v.partnerName,
        partnerNo: v.partnerNo,
        count: v.count,
        amount: v.amount,
        avgPrice: v.weightSum > 0 ? Math.round(v.amount / v.weightSum) : 0,
        lastAssignedDate: v.lastAssignedDate,
        items: v.items,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [parts, assignments]);

  /**
   * 단일 아코디언 · 다른 행을 열면 이전 것은 자동으로 닫힘.
   * null 이면 모두 닫힘 상태.
   */
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const togglePartner = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="grid gap-4">
      <PeriodFilter
        startDate={startDate}
        endDate={endDate}
        onChange={({ startDate: s, endDate: e }) => {
          setStartDate(s);
          setEndDate(e);
        }}
        onSearch={() => {
          setSearchStart(startDate);
          setSearchEnd(endDate);
        }}
      />

      <div className="flex flex-col border border-slate-200 bg-white">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
          <span className="text-[13px] font-extrabold text-slate-900">
            거래처별 배정
          </span>
          <span className="text-[11px] tabular-nums text-slate-400">
            {partners.length > 0 ? `${partners.length}개 거래처` : null}
          </span>
        </header>

        {isLoading ? (
          <div className="flex h-[240px] items-center justify-center text-[12px] text-slate-400">
            불러오는 중…
          </div>
        ) : partners.length === 0 ? (
          <div className="flex h-[240px] items-center justify-center text-[12px] text-slate-400">
            조회기간 내 배정된 거래처가 없습니다.
          </div>
        ) : (
          <table className="w-full table-fixed text-[12px] tabular-nums">
            <colgroup>
              <col className="w-[44px]" />
              <col className="w-auto" />
              <col className="w-[120px]" />
              <col className="w-[86px]" />
              <col className="w-[140px]" />
              <col className="w-[124px]" />
              <col className="w-[112px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold text-slate-500">
                <th className="px-2 py-2 text-center">#</th>
                <th className="px-3 py-2 text-left">거래처</th>
                <th className="px-3 py-2 text-left">거래처번호</th>
                <th className="px-3 py-2 text-right">배정건</th>
                <th className="px-3 py-2 text-right">배정금액</th>
                <th className="px-3 py-2 text-right">평균단가</th>
                <th className="px-3 py-2 text-center">최근배정일</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p, idx) => {
                const open = expandedId === p.partnerId;
                return (
                  <Fragment key={p.partnerId}>
                    <tr
                      onClick={() => togglePartner(p.partnerId)}
                      className={cn(
                        "cursor-pointer border-b border-slate-100 transition-colors last:border-b-0",
                        open ? "bg-slate-50" : "hover:bg-slate-50/60",
                      )}
                    >
                      <td className="px-2 py-2 text-center text-[11px] font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2 text-left">
                        <span className="inline-flex items-center gap-1.5">
                          {open ? (
                            <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                          )}
                          <span className="truncate text-[13px] font-bold text-slate-900">
                            {p.partnerName}
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-2 text-left text-[11px] text-slate-500">
                        {p.partnerNo || "-"}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700">
                        {KRW.format(p.count)}건
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-sky-700">
                        {formatWon(p.amount)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700">
                        {p.avgPrice > 0
                          ? `${KRW.format(p.avgPrice)}원/kg`
                          : "-"}
                      </td>
                      <td className="px-3 py-2 text-center text-[11px] text-slate-500">
                        {p.lastAssignedDate
                          ? p.lastAssignedDate.replace(/^\d{2}(\d{2})-/, "$1.").replace(/-/g, ".")
                          : "-"}
                      </td>
                    </tr>
                    {open ? (
                      <tr className="border-b border-slate-100 last:border-b-0">
                        <td
                          colSpan={7}
                          className="border-l-2 border-slate-900 bg-slate-50/70 p-0"
                        >
                          <PartnerExpandedRow partner={p} />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 확장 영역 · 요약(도넛×2 + 요일 바) → 캘린더 → 상세 테이블
// ============================================================

function PartnerExpandedRow({ partner }: { partner: PartnerRow }) {
  // 캘린더 커서: 확장 시 최근 배정일이 속한 달로 진입.
  const initialDate = partner.lastAssignedDate
    ? parseISO(partner.lastAssignedDate)
    : new Date();
  const [cursor, setCursor] = useState<Date>(initialDate);
  const [selectedDate, setSelectedDate] = useState<string | null>(
    partner.lastAssignedDate || null,
  );

  // 등급 · 부위 분포 · 요일 배정 건수 · 일자별 배정 건수 모두 partner.items 기준.
  const gradeDist = useMemo(
    () => buildDistribution(partner.items, (p) => toGradeBucket(p), GRADE_ORDER),
    [partner.items],
  );

  const partDist = useMemo(
    () =>
      buildDistribution(
        partner.items,
        (p) => p.partName || "기타",
        undefined,
        5,
      ),
    [partner.items],
  );

  const dowCounts = useMemo(() => {
    const arr = WEEK_LABELS.map((label) => ({ label, count: 0 }));
    for (const p of partner.items) {
      if (!p.listingDate) continue;
      const idx = parseISO(p.listingDate).getDay();
      arr[idx].count++;
    }
    return arr;
  }, [partner.items]);

  const dailyStats = useMemo(() => {
    const map = new Map<string, { count: number; amount: number }>();
    for (const p of partner.items) {
      if (!p.listingDate) continue;
      const cur = map.get(p.listingDate) ?? { count: 0, amount: 0 };
      cur.count++;
      cur.amount += p.bidAmount;
      map.set(p.listingDate, cur);
    }
    return map;
  }, [partner.items]);

  const daysDetail = useMemo(() => {
    if (!selectedDate) return [] as WinningPart[];
    return partner.items
      .filter((p) => p.listingDate === selectedDate)
      .sort((a, b) => a.bidAt.localeCompare(b.bidAt));
  }, [partner.items, selectedDate]);

  return (
    <div className="space-y-4 px-4 py-4">
      {/* 요약 · 3 열 (등급 분포 · 부위 분포 · 요일 배정건) */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <DonutCard title="등급 분포" data={gradeDist} />
        <DonutCard title="부위 분포" data={partDist} />
        <PartnerDowCard stats={dowCounts} />
      </div>

      {/* 캘린더 · 상세 · 2단 병렬 · lg 미만에서는 세로 스택 */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* 좌 · 미니 캘린더 · 일자별 배정 건수 + 총 낙찰금액 */}
        <PartnerMiniCalendar
          cursor={cursor}
          onChangeCursor={setCursor}
          stats={dailyStats}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />

        {/* 우 · 선택 날짜 상세 · 배정 부위 리스트 */}
        <PartnerDailyTable
          selectedDate={selectedDate}
          items={daysDetail}
        />
      </div>
    </div>
  );
}

// ============================================================
// 요일별 배정 건수 카드
// ============================================================

/**
 * 요일별 배정 건수 카드.
 * 최댓값 비율에 따라 slate 3단 톤 그라데이션 · 최고 요일은 sky-600 브랜드 강조.
 */
function PartnerDowCard({
  stats,
}: {
  stats: { label: string; count: number }[];
}) {
  const totalCount = stats.reduce((sum, s) => sum + s.count, 0);
  const maxCount = Math.max(0, ...stats.map((s) => s.count));
  const bestDow = stats.reduce(
    (best, cur) => (cur.count > best.count ? cur : best),
    stats[0],
  );
  const hasData = totalCount > 0;
  return (
    <div className="border border-slate-200 bg-white">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
        <span className="text-[13px] font-extrabold text-slate-900">
          요일별 배정 건수
        </span>
        <span className="text-[11px] tabular-nums text-slate-400">
          {hasData ? `${totalCount}건` : "-"}
        </span>
      </header>
      <div className="p-4">
        {!hasData ? (
          <div className="flex h-[140px] items-center justify-center text-[12px] text-slate-400">
            요일별 데이터가 없습니다.
          </div>
        ) : (
          <>
            <div className="mb-2 flex items-baseline justify-end text-[11px]">
              <span className="tabular-nums text-slate-500">
                최고{" "}
                <span className="font-bold text-slate-900">
                  {bestDow.label}요일
                </span>{" "}
                <span className="text-slate-400">({bestDow.count}건)</span>
              </span>
            </div>
            <div className="grid grid-cols-7 items-end gap-2 pt-3">
              {stats.map((s) => {
                const ratio = maxCount > 0 ? s.count / maxCount : 0;
                const heightPct = ratio * 100;
                const isBest = s.count > 0 && s.label === bestDow.label;
                const noData = s.count === 0;
                // DONUT_PALETTE 와 동일한 slate 계열 단계 (sky 제거).
                const barClass = isBest
                  ? "bg-slate-900"
                  : ratio >= 0.75
                    ? "bg-slate-700"
                    : ratio >= 0.5
                      ? "bg-slate-500"
                      : "bg-slate-400";
                return (
                  <div
                    key={s.label}
                    className="flex flex-col items-center gap-1"
                    title={
                      s.count > 0
                        ? `${s.label}요일 · ${s.count}건`
                        : `${s.label}요일 · 배정 없음`
                    }
                  >
                    <span
                      className={cn(
                        "text-[10px] font-bold tabular-nums",
                        noData
                          ? "text-slate-300"
                          : isBest
                            ? "text-slate-900"
                            : "text-slate-700",
                      )}
                    >
                      {s.count > 0 ? `${s.count}` : "-"}
                    </span>
                    <div
                      className={cn(
                        "relative h-16 w-full min-w-0",
                        noData
                          ? "border-b border-dashed border-slate-200"
                          : "bg-slate-50",
                      )}
                    >
                      {!noData ? (
                        <div
                          className={cn(
                            "absolute inset-x-0 bottom-0 transition-all",
                            barClass,
                          )}
                          style={{ height: `${heightPct}%` }}
                        />
                      ) : null}
                    </div>
                    <span
                      className={cn(
                        "text-[10.5px] font-semibold",
                        isBest
                          ? "text-slate-900"
                          : s.label === "일"
                            ? "text-rose-400"
                            : s.label === "토"
                              ? "text-slate-500"
                              : "text-slate-500",
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 미니 캘린더 · 일자별 배정 건수 히트맵
// ============================================================

interface DailyStat {
  count: number;
  amount: number;
}

interface PartnerMiniCalendarProps {
  cursor: Date;
  onChangeCursor: (next: Date) => void;
  stats: Map<string, DailyStat>;
  selectedDate: string | null;
  onSelectDate: (dateStr: string | null) => void;
}

/**
 * 미니 캘린더 · 월간 그리드.
 * 각 셀 · 일자 + 배정 건수 + 총 낙찰금액(원) · 총 낙찰금액 기준 4단 히트맵.
 * 클릭 시 해당 날짜 선택 (하단 상세 테이블 필터 트리거).
 */
function PartnerMiniCalendar({
  cursor,
  onChangeCursor,
  stats,
  selectedDate,
  onSelectDate,
}: PartnerMiniCalendarProps) {
  const gridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const monthAmountMax = useMemo(() => {
    let max = 0;
    for (const day of gridDays) {
      if (!isSameMonth(day, cursor)) continue;
      const key = format(day, "yyyy-MM-dd");
      const s = stats.get(key);
      if (s && s.amount > max) max = s.amount;
    }
    return max;
  }, [gridDays, cursor, stats]);

  return (
    <div className="border border-slate-200 bg-white">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
        <span className="text-[13px] font-extrabold text-slate-900">
          일자별 배정
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChangeCursor(subMonths(cursor, 1))}
            className="inline-flex h-6 w-6 items-center justify-center border border-slate-200 text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
            aria-label="이전 달"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[74px] text-center text-[12px] font-bold tabular-nums text-slate-800">
            {format(cursor, "yyyy.MM")}
          </span>
          <button
            type="button"
            onClick={() => onChangeCursor(addMonths(cursor, 1))}
            className="inline-flex h-6 w-6 items-center justify-center border border-slate-200 text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
            aria-label="다음 달"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <div className="p-3">
        <div className="grid grid-cols-[repeat(7,minmax(0,1fr))] gap-1">
          {WEEK_LABELS.map((label) => (
            <div
              key={label}
              className={cn(
                "py-1 text-center text-[10.5px] font-semibold",
                label === "일"
                  ? "text-rose-400"
                  : label === "토"
                    ? "text-sky-500"
                    : "text-slate-400",
              )}
            >
              {label}
            </div>
          ))}
          {gridDays.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const inMonth = isSameMonth(day, cursor);
            const stat = stats.get(dateStr);
            const count = stat?.count ?? 0;
            const amount = stat?.amount ?? 0;
            const level = computeHeatLevel(amount, monthAmountMax);
            const isSelected = selectedDate === dateStr;
            const style = HEAT_STYLE[level];
            return (
              <button
                key={dateStr}
                type="button"
                onClick={() =>
                  onSelectDate(isSelected ? null : dateStr)
                }
                disabled={!inMonth}
                title={
                  inMonth && count > 0
                    ? `${dateStr} · ${count}건 · ${KRW.format(amount)}원`
                    : undefined
                }
                className={cn(
                  "relative flex h-[78px] min-w-0 flex-col justify-between overflow-hidden px-1.5 py-2 text-left transition-colors",
                  inMonth ? style.bg : "bg-white opacity-40",
                  inMonth && style.hover,
                  isSelected &&
                    "z-10 outline outline-[1.5px] -outline-offset-[1.5px] outline-slate-900",
                )}
              >
                {/* 1 · 날짜 (좌상 · 톤 다운 · muted) */}
                <span
                  className={cn(
                    "text-[10.5px] font-semibold leading-none tabular-nums",
                    inMonth ? style.dateTone : "text-slate-300",
                    isToday(day) &&
                      inMonth &&
                      level < 3 &&
                      "font-bold text-sky-600",
                  )}
                >
                  {format(day, "d")}
                </span>

                {/* 2·3 · 건수 → 금액 (좌하 · 스택 · 위계 상승)
                    좁은 셀 폭 대비 · 금액은 10px + tracking-tighter 로 원 유지 · truncate fallback. */}
                {count > 0 && inMonth ? (
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span
                      className={cn(
                        "text-[10px] font-medium leading-none tabular-nums",
                        style.countTone,
                      )}
                    >
                      {count}건
                    </span>
                    <span
                      className={cn(
                        "block w-full truncate text-[10px] font-extrabold leading-none tabular-nums tracking-tighter",
                        style.amountTone,
                      )}
                    >
                      {KRW.format(amount)}원
                    </span>
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 선택 날짜 상세 테이블
// ============================================================

/**
 * 선택된 날짜의 배정 부위 리스트.
 * 컬럼: 시간 · 상장번호(링크) · 부위 · 등급 · 중량 · 배정단가 · 배정금액.
 */
function PartnerDailyTable({
  selectedDate,
  items,
}: {
  selectedDate: string | null;
  items: WinningPart[];
}) {
  const label = selectedDate
    ? format(parseISO(selectedDate), "yyyy.MM.dd")
    : null;

  return (
    <div className="border border-slate-200 bg-white">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
        <span className="text-[13px] font-extrabold text-slate-900">
          {label ? `${label} 상세` : "선택된 날짜 없음"}
        </span>
        {items.length > 0 ? (
          <span className="text-[11px] tabular-nums text-slate-400">
            {items.length}건
          </span>
        ) : null}
      </header>
      {!selectedDate ? (
        <div className="flex h-[140px] items-center justify-center text-[12px] text-slate-400">
          캘린더에서 날짜를 선택하세요.
        </div>
      ) : items.length === 0 ? (
        <div className="flex h-[140px] items-center justify-center text-[12px] text-slate-400">
          해당 날짜에 배정된 부위가 없습니다.
        </div>
      ) : (
        // 열 폭 최적화 · 실제 콘텐츠 폭 기준으로 재분배.
        // - 부위 열을 auto 에서 고정으로 변경 → 컨테이너 남는 폭이 부위 하나에만
        //   몰려 등급 열과 벌어져 보이던 이슈 해소.
        // - 이제 남는 폭은 모든 열에 균등 분배됨 (table-fixed + w-full 규칙).
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-[12px] tabular-nums">
            <colgroup>
              <col className="w-[60px]" />
              <col className="w-[110px]" />
              <col className="w-[96px]" />
              <col className="w-[66px]" />
              <col className="w-[56px]" />
              <col className="w-[62px]" />
              <col className="w-[86px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold text-slate-500">
                <th className="px-2 py-2 text-center">시간</th>
                <th className="px-2 py-2 text-left">상장번호</th>
                <th className="px-2 py-2 text-left">부위</th>
                <th className="px-2 py-2 text-center">등급</th>
                <th className="px-2 py-2 text-right">중량</th>
                <th className="px-2 py-2 text-right">단가</th>
                <th className="px-2 py-2 text-right">금액</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                // grade 문자열은 이미 육량(A/B/C) 을 포함 · marbling 필드로 근내지방도 보강.
                // 예: grade="1++A" + marbling=9 → "1++A(9)" · grade="1+B" → "1+B"
                const grade = formatGradeLabel(it.grade, it.marbling ?? null);
                const time = it.bidAt ? formatBidTime(it.bidAt) : "-";
                return (
                  <tr
                    key={it.partId}
                    className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60"
                  >
                    <td className="whitespace-nowrap px-2 py-2 text-center text-[11px] text-slate-500">
                      {time}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-left">
                      <ListingLink
                        entityListingNo={it.listingNo}
                        label={it.listingPartNo || it.listingNo}
                      />
                    </td>
                    <td
                      className="truncate px-2 py-2 text-left text-[12px] font-semibold text-slate-900"
                      title={it.partName}
                    >
                      {it.partName}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-center text-[11.5px] font-semibold text-slate-800">
                      {grade}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-right text-[11px] text-slate-600">
                      {it.weight ? `${it.weight.toFixed(1)}kg` : "-"}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-right text-[11px] text-slate-700">
                      {it.bidPrice > 0 ? `${KRW.format(it.bidPrice)}` : "-"}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-right text-[11.5px] font-bold text-sky-700">
                      {formatWon(it.bidAmount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Helper components / utilities
// ============================================================

/**
 * 상장번호 링크 · 통합 라이브 경매장으로 딥링크.
 * Phase 1 통합 이후 공판장 슬러그는 사용하지 않고 `?listing=` 쿼리로만 전달한다.
 */
function ListingLink({
  entityListingNo,
  label,
}: {
  entityListingNo: string;
  label: string;
}) {
  const cls =
    "text-[12px] font-bold -tracking-[0.02em] tabular-nums text-sky-700 hover:underline";
  if (!entityListingNo) {
    return (
      <span
        className={cn(
          cls,
          "cursor-default hover:no-underline text-slate-500",
        )}
      >
        {label}
      </span>
    );
  }
  return (
    <Link
      href={`/auction/live?listing=${encodeURIComponent(entityListingNo)}`}
      className={cls}
    >
      {label}
    </Link>
  );
}

/**
 * `bidAt` 를 HH:MM:SS 로 표시.
 * ISO 문자열이면 date-fns 로, "yy.MM.dd HH:MM:SS" 이면 뒤쪽만 추출.
 */
function formatBidTime(bidAt: string): string {
  if (!bidAt) return "-";
  // ISO 8601
  if (bidAt.includes("T") || bidAt.includes("Z")) {
    try {
      return format(new Date(bidAt), "HH:mm:ss");
    } catch {
      // fallthrough
    }
  }
  // "yy.MM.dd HH:mm:ss" 형태 → 뒤쪽 시간만
  const parts = bidAt.split(" ");
  return parts.length >= 2 ? parts[parts.length - 1] : bidAt;
}

/**
 * 분포 데이터 생성 (도넛 용) · DistItem[] 반환.
 * preferredOrder 있을 경우 정렬 우선 · topN 지정 시 초과분은 "기타" 로 병합
 * (children 에 원본 세부 유지).
 */
function buildDistribution<T>(
  items: T[],
  keyOf: (item: T) => string,
  preferredOrder?: string[],
  topN?: number,
): DistItem[] {
  const map = new Map<string, number>();
  let total = 0;
  for (const it of items) {
    const key = keyOf(it);
    map.set(key, (map.get(key) ?? 0) + 1);
    total++;
  }
  if (total === 0) return [];

  const entries: DistItem[] = Array.from(map.entries())
    .map(([name, count]) => ({
      name,
      count,
      pct: Math.round((count / total) * 100),
    }))
    .sort((a, b) => {
      if (preferredOrder) {
        const ai = preferredOrder.indexOf(a.name);
        const bi = preferredOrder.indexOf(b.name);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
      }
      return b.count - a.count;
    });

  if (!topN || entries.length <= topN) return entries;
  const top = entries.slice(0, topN);
  const rest = entries.slice(topN);
  const restCount = rest.reduce((sum, e) => sum + e.count, 0);
  if (restCount === 0) return top;
  return [
    ...top,
    {
      name: "기타",
      count: restCount,
      pct: Math.round((restCount / total) * 100),
      children: rest,
    },
  ];
}

// ============================================================
// 캘린더 히트맵 색상 팔레트 (HistoryCalendar 와 동일 계열)
// ============================================================

type HeatLevel = 0 | 1 | 2 | 3 | 4;

/**
 * 셀 톤 팔레트 · 3단 위계 (날짜 → 건수 → 금액) 로 색을 분리해 시각적 정보 위계 확보.
 * - dateTone  : 날짜 (톤 다운 · muted)
 * - countTone : 건수 (중간)
 * - amountTone: 낙찰금액 (강조 · 볼드 대상)
 */
const HEAT_STYLE: Record<
  HeatLevel,
  {
    bg: string;
    hover: string;
    dateTone: string;
    countTone: string;
    amountTone: string;
  }
> = {
  0: {
    bg: "bg-white",
    hover: "hover:bg-slate-50",
    dateTone: "text-slate-400",
    countTone: "text-slate-500",
    amountTone: "text-slate-900",
  },
  1: {
    bg: "bg-slate-100",
    hover: "hover:bg-slate-200",
    dateTone: "text-slate-400",
    countTone: "text-slate-600",
    amountTone: "text-slate-900",
  },
  2: {
    bg: "bg-slate-300",
    hover: "hover:bg-slate-400",
    dateTone: "text-slate-500",
    countTone: "text-slate-700",
    amountTone: "text-slate-900",
  },
  3: {
    bg: "bg-slate-500",
    hover: "hover:bg-slate-600",
    dateTone: "text-slate-200",
    countTone: "text-slate-50",
    amountTone: "text-white",
  },
  4: {
    bg: "bg-slate-800",
    hover: "hover:bg-slate-900",
    dateTone: "text-slate-400",
    countTone: "text-slate-200",
    amountTone: "text-white",
  },
};

function computeHeatLevel(count: number, monthMax: number): HeatLevel {
  if (count <= 0 || monthMax <= 0) return 0;
  const ratio = count / monthMax;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}
