"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import type { AuctionResult, MyBidItem } from "@/features/bids/types";
import type { AssignmentInfo } from "@/features/delivery/types";
import {
  formatKrw,
  formatWeightKg,
  formatWon,
} from "@/features/live-auction/lib/masking";
import { formatGradeLabel } from "@/features/live-auction/lib/grade";
import { CompactFilterPill } from "@/features/live-auction/components/CompactFilterPill";
import { EntityDetailDialog } from "@/features/live-auction/components/EntityDetailDialog";
import {
  HistoryCalendar,
  type CalendarDayStat,
} from "./HistoryCalendar";
import { StatusBadge } from "./ResultBadge";

/**
 * `listingNo` (예: `260720-101-01`) 에서 부위 번호(마지막 2자리) 를 추출.
 */
function parsePartNo(listingNo: string): number | null {
  const m = listingNo.match(/-(\d{2})$/);
  return m ? Number(m[1]) : null;
}

export interface HistoryCalendarPanelProps {
  activeBids: MyBidItem[];
  results: AuctionResult[];
  /** partId → 배정 거래처 정보 · `/api/delivery/assignments` 응답 */
  assignments: Record<string, AssignmentInfo>;
  isLoading: boolean;
  onChanged: () => void;
}

type DailyRow =
  | {
      kind: "active";
      id: string;
      /** cattle_parts.id · 거래처 배정 조회용 */
      partId: string;
      dateStr: string;
      time: string;
      slaughterHouse: string;
      companyName: string;
      /** 개체 상장번호 (예: 260720-101) · 라우팅용 */
      entityListingNo: string;
      /** 부위번호까지 포함된 전체 상장번호 (예: 260720-101-01) · 표시용 */
      listingNo: string;
      partName: string;
      grade: string;
      marblingScore: number | null;
      weight: number;
      myBid: number;
      totalAmount: number;
      minPrice: number;
      /** 경매 회차 (1, 2, 3) */
      roundNo: number | null;
      bid: MyBidItem;
    }
  | {
      kind: "result";
      id: string;
      partId: string;
      dateStr: string;
      time: string;
      slaughterHouse: string;
      companyName: string;
      entityListingNo: string;
      listingNo: string;
      partName: string;
      grade: string;
      marblingScore: number | null;
      weight: number;
      myBid: number;
      winningBid: number | null;
      totalAmount: number;
      minPrice: number;
      /** 경매 회차 (1, 2, 3) */
      roundNo: number | null;
      result: "won" | "lost";
    };

/**
 * 상태 필터 옵션 · CompactFilterPill 은 `전체` sentinel 을 자동 제공하므로 3가지만 지정.
 */
const STATUS_FILTER_OPTIONS = ["진행중", "낙찰", "미낙찰"] as const;

/**
 * 활성 입찰 `MyBidItem.time` ("yy.MM.dd HH:mm:ss") 에서 날짜 부분(yy.MM.dd) 을
 * "yyyy-MM-dd" 로 변환한다.
 */
function activeBidDateStr(bid: MyBidItem): string {
  const match = bid.time.match(/^(\d{2})\.(\d{2})\.(\d{2})/);
  if (!match) return "";
  return `20${match[1]}-${match[2]}-${match[3]}`;
}

/**
 * 캘린더 패널.
 *
 * - 상단: 월간 캘린더 · 일자별 낙찰/미낙찰/낙찰금액
 * - 하단: 선택 일자의 경매이력 테이블 (진행중 + 낙찰 + 미낙찰 통합)
 * - 테이블 디자인: 직각/얇은 border, 화이트 배경, 최소한의 강조
 */
export function HistoryCalendarPanel({
  activeBids,
  results,
  assignments,
  isLoading,
}: HistoryCalendarPanelProps) {
  const { data: session } = useSession();
  const dealerId =
    session?.dealer?.id ?? session?.employee?.dealerId ?? null;

  const [cursor, setCursor] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [partFilter, setPartFilter] = useState<string>("");
  const [gradeFilter, setGradeFilter] = useState<string>("");
  const [companyFilter, setCompanyFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [roundFilter, setRoundFilter] = useState<string>("");

  const [detailTarget, setDetailTarget] = useState<{
    listingNo: string;
    partNo: number | null;
  } | null>(null);

  useEffect(() => {
    setPartFilter("");
    setGradeFilter("");
    setCompanyFilter("");
    setStatusFilter("");
    setRoundFilter("");
  }, [selectedDate]);

  const dailyStats = useMemo<Record<string, CalendarDayStat>>(() => {
    const map: Record<string, CalendarDayStat> = {};
    for (const r of results) {
      const key = r.listingDate || "";
      if (!key) continue;
      if (!map[key]) {
        map[key] = {
          dateStr: key,
          wonCount: 0,
          lostCount: 0,
          wonAmount: 0,
        };
      }
      if (r.result === "won") {
        map[key].wonCount++;
        map[key].wonAmount += r.totalAmount;
      } else {
        map[key].lostCount++;
      }
    }
    return map;
  }, [results]);

  const dailyRows = useMemo<DailyRow[]>(() => {
    if (!selectedDate) return [];

    const active: DailyRow[] = activeBids
      .filter((b) => activeBidDateStr(b) === selectedDate)
      .map((b) => ({
        kind: "active" as const,
        id: b.id,
        partId: b.partId,
        dateStr: selectedDate,
        time: b.time,
        slaughterHouse: b.slaughterHouse,
        companyName: b.companyName,
        entityListingNo: b.entityListingNo,
        listingNo: b.listingNo,
        partName: b.partName,
        grade: b.grade,
        marblingScore: b.marblingScore,
        weight: b.weight,
        myBid: b.myBid,
        totalAmount: b.totalAmount,
        minPrice: b.minPrice,
        roundNo: b.roundNo,
        bid: b,
      }));

    const resultRows: DailyRow[] = results
      .filter((r) => r.listingDate === selectedDate)
      .map((r) => ({
        kind: "result" as const,
        id: r.id,
        partId: r.partId,
        dateStr: selectedDate,
        time: r.time,
        slaughterHouse: r.slaughterHouse,
        companyName: r.companyName,
        entityListingNo: r.entityListingNo,
        listingNo: r.listingNo,
        partName: r.partName,
        grade: r.grade,
        marblingScore: r.marblingScore,
        weight: r.weight,
        myBid: r.myBid,
        winningBid: r.winningBid,
        totalAmount: r.totalAmount,
        minPrice: r.minPrice,
        roundNo: r.roundNo,
        result: r.result,
      }));

    // 상장번호 오름차순 (101 → 201 → 301 …) · numeric 옵션으로 자연수 정렬
    // 부위번호까지 포함된 전체 상장번호(예: 260720-101-01) 기준으로 정렬해
    // 같은 개체 안의 부위들은 인접하게 배치.
    return [...active, ...resultRows].sort((a, b) =>
      a.listingNo.localeCompare(b.listingNo, undefined, { numeric: true }),
    );
  }, [activeBids, results, selectedDate]);

  const partOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of dailyRows) {
      if (row.partName) set.add(row.partName);
    }
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, "ko", { numeric: true }),
    );
  }, [dailyRows]);

  const gradeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of dailyRows) {
      const g = formatGradeLabel(row.grade, row.marblingScore);
      if (g) set.add(g);
    }
    return Array.from(set).sort();
  }, [dailyRows]);

  const companyOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of dailyRows) {
      if (row.companyName) set.add(row.companyName);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ko"));
  }, [dailyRows]);

  const roundOptions = useMemo(() => {
    const set = new Set<number>();
    for (const row of dailyRows) {
      if (row.roundNo != null) set.add(row.roundNo);
    }
    return Array.from(set)
      .sort((a, b) => a - b)
      .map((n) => `${n}차`);
  }, [dailyRows]);

  const filteredRows = useMemo(() => {
    return dailyRows.filter((row) => {
      if (partFilter && row.partName !== partFilter) return false;
      if (
        gradeFilter &&
        formatGradeLabel(row.grade, row.marblingScore) !== gradeFilter
      ) {
        return false;
      }
      if (companyFilter && row.companyName !== companyFilter) return false;
      if (statusFilter) {
        const rowStatus =
          row.kind === "active"
            ? "진행중"
            : row.result === "won"
              ? "낙찰"
              : "미낙찰";
        if (rowStatus !== statusFilter) return false;
      }
      if (roundFilter) {
        const rowRound = row.roundNo != null ? `${row.roundNo}차` : "";
        if (rowRound !== roundFilter) return false;
      }
      return true;
    });
  }, [
    dailyRows,
    partFilter,
    gradeFilter,
    companyFilter,
    statusFilter,
    roundFilter,
  ]);

  const hasActiveFilter =
    partFilter !== "" ||
    gradeFilter !== "" ||
    companyFilter !== "" ||
    statusFilter !== "" ||
    roundFilter !== "";

  const dailySummary = useMemo(() => {
    let activeCount = 0;
    let wonCount = 0;
    let lostCount = 0;
    let wonAmount = 0;
    for (const row of filteredRows) {
      if (row.kind === "active") {
        activeCount++;
      } else if (row.result === "won") {
        wonCount++;
        wonAmount += row.totalAmount;
      } else {
        lostCount++;
      }
    }
    return { activeCount, wonCount, lostCount, wonAmount };
  }, [filteredRows]);

  return (
    <div className="grid gap-4">
      <HistoryCalendar
        cursor={cursor}
        onChangeCursor={setCursor}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        stats={dailyStats}
      />

      <div className="border border-slate-200 bg-white">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-extrabold tabular-nums text-slate-900">
              {selectedDate
                ? format(new Date(selectedDate), "yyyy.MM.dd (EEE)", {
                    locale: ko,
                  })
                : "일자 선택"}
            </span>
            <span className="text-[11px] text-slate-400">·</span>
            <span className="text-[11px] tabular-nums text-slate-500">
              총 {filteredRows.length}
              {hasActiveFilter ? (
                <span className="text-slate-400"> / {dailyRows.length}</span>
              ) : null}
              건
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] tabular-nums">
            <SummaryPill
              label="진행중"
              value={`${dailySummary.activeCount}건`}
              tone="active"
            />
            <SummaryPill
              label="낙찰"
              value={`${dailySummary.wonCount}건`}
              tone="won"
            />
            <SummaryPill
              label="미낙찰"
              value={`${dailySummary.lostCount}건`}
              tone="lost"
            />
            <SummaryPill
              label="낙찰금액"
              value={
                dailySummary.wonAmount > 0
                  ? formatWon(dailySummary.wonAmount)
                  : "-"
              }
              tone="amount"
            />
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50/50 px-4 py-2">
          <CompactFilterPill
            label="상태"
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_FILTER_OPTIONS}
          />
          <CompactFilterPill
            label="회차"
            value={roundFilter}
            onChange={setRoundFilter}
            options={roundOptions}
          />
          <CompactFilterPill
            label="부위"
            value={partFilter}
            onChange={setPartFilter}
            options={partOptions}
          />
          <CompactFilterPill
            label="등급"
            value={gradeFilter}
            onChange={setGradeFilter}
            options={gradeOptions}
          />
          <CompactFilterPill
            label="가공업체"
            value={companyFilter}
            onChange={setCompanyFilter}
            options={companyOptions}
          />
          {hasActiveFilter ? (
            <button
              type="button"
              onClick={() => {
                setPartFilter("");
                setGradeFilter("");
                setCompanyFilter("");
                setStatusFilter("");
                setRoundFilter("");
              }}
              className="ml-1 inline-flex h-7 items-center rounded-md border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
            >
              초기화
            </button>
          ) : null}

          {/* 우측 · 가격열 단위 캡션 · ml-auto 로 필터 그룹과 시각 분리 */}
          <span className="ml-auto whitespace-nowrap text-[10.5px] font-medium tabular-nums text-slate-400">
            단위 : 원/kg
            <span className="mx-1 text-slate-300">·</span>
            총 금액은 원
          </span>
        </div>

        <div className="overflow-x-auto">
          {/*
           * 컬럼 폭 · 컨테이너 가용 폭(≈1176px) 안에 자연스럽게 맞도록 재분배.
           * 원칙:
           * - 등급 `1++A(9)` · 중량 `100.5kg` 처럼 실제 최악 콘텐츠 폭 이상을 확보.
           * - 총금액/가공업체 등 이전에 과잉 배정되었던 컬럼을 축소해 균형화.
           * - 가격열은 단위 접미어를 헤더로 이전한 뒤 숫자만 표시 → 컴팩트 유지.
           * fixed 열 합계 ≈ 1012px · 거래처(auto) ≈ 164px 확보.
           */}
          <table className="w-full table-fixed text-[12px]">
            <colgroup>
              <col className="w-[60px]" />
              <col className="w-[44px]" />
              <col className="w-[124px]" />
              <col className="w-[124px]" />
              <col className="w-[82px]" />
              <col className="w-[82px]" />
              <col className="w-[66px]" />
              <col className="w-[84px]" />
              <col className="w-[84px]" />
              <col className="w-[86px]" />
              <col className="w-[100px]" />
              <col className="w-[100px]" />
              <col className="w-auto" />
            </colgroup>
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="whitespace-nowrap border-b border-slate-200 px-3 py-2.5 text-center">
                  상태
                </th>
                <th className="whitespace-nowrap border-b border-slate-200 px-3 py-2.5 text-center">
                  회차
                </th>
                <th className="whitespace-nowrap border-b border-slate-200 px-3 py-2.5 text-center">
                  입찰시간
                </th>
                <th className="whitespace-nowrap border-b border-slate-200 px-3 py-2.5 text-center">
                  상장번호
                </th>
                <th className="whitespace-nowrap border-b border-slate-200 px-3 py-2.5 text-center">
                  부위
                </th>
                <th className="whitespace-nowrap border-b border-slate-200 px-3 py-2.5 text-center">
                  등급
                </th>
                <th className="whitespace-nowrap border-b border-slate-200 px-3 py-2.5 text-center">
                  중량
                </th>
                <th className="whitespace-nowrap border-b border-slate-200 px-3 py-2.5 text-center">
                  최저단가
                </th>
                <th className="whitespace-nowrap border-b border-slate-200 px-3 py-2.5 text-center">
                  낙찰가
                </th>
                <th className="whitespace-nowrap border-b border-slate-200 px-3 py-2.5 text-center">
                  내 입찰가
                </th>
                <th className="whitespace-nowrap border-b border-slate-200 px-3 py-2.5 text-center">
                  총 금액
                </th>
                <th className="whitespace-nowrap border-b border-slate-200 px-3 py-2.5 text-center">
                  가공업체
                </th>
                <th className="whitespace-nowrap border-b border-slate-200 px-3 py-2.5 text-center">
                  거래처
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows colSpan={13} rows={4} />
              ) : filteredRows.length === 0 ? (
                <EmptyRow
                  colSpan={13}
                  message={
                    hasActiveFilter
                      ? "필터 조건에 해당하는 내역이 없습니다."
                      : "선택한 일자의 경매이력이 없습니다."
                  }
                />
              ) : (
                filteredRows.map((row) => (
                  <DailyRowView
                    key={`${row.kind}-${row.id}`}
                    row={row}
                    assignment={assignments[row.partId] ?? null}
                    onOpenDetail={() =>
                      setDetailTarget({
                        listingNo: row.entityListingNo,
                        partNo: parsePartNo(row.listingNo),
                      })
                    }
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EntityDetailDialog
        open={!!detailTarget}
        onOpenChange={(open) => {
          if (!open) setDetailTarget(null);
        }}
        listingNo={detailTarget?.listingNo ?? null}
        focusPartNo={detailTarget?.partNo ?? null}
        dealerId={dealerId}
      />
    </div>
  );
}

function DailyRowView({
  row,
  assignment,
  onOpenDetail,
}: {
  row: DailyRow;
  assignment: AssignmentInfo | null;
  onOpenDetail: () => void;
}) {
  const gradeLabel = formatGradeLabel(row.grade, row.marblingScore);
  const isActive = row.kind === "active";
  const isWon = !isActive && row.result === "won";

  return (
    <tr
      className={cn(
        "border-b border-slate-100 hover:bg-slate-50/60",
        !isActive && !isWon && "text-slate-500",
      )}
    >
      <td className="px-3 py-2.5 text-center align-middle">
        <div className="flex justify-center">
          <StatusBadge
            status={isActive ? "active" : row.result}
          />
        </div>
      </td>
      <td className="px-1 py-2.5 text-center align-middle">
        <div className="flex justify-center">
          <RoundBadge roundNo={row.roundNo} />
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-center align-middle text-[11px] tabular-nums text-slate-500">
        {row.time}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-center align-middle">
        <button
          type="button"
          onClick={onOpenDetail}
          className="text-[12px] font-bold -tracking-[0.02em] tabular-nums text-sky-700 hover:underline"
        >
          {row.listingNo || row.entityListingNo}
        </button>
      </td>
      <td
        className={cn(
          "px-3 py-2.5 text-center align-middle text-[13px] font-semibold",
          isActive || isWon ? "text-slate-900" : "text-slate-500",
        )}
        title={row.partName}
      >
        <span className="block truncate">{row.partName}</span>
      </td>
      <td
        className={cn(
          "whitespace-nowrap px-3 py-2.5 text-center align-middle text-[12px] font-semibold tabular-nums",
          isActive || isWon ? "text-slate-800" : "text-slate-400",
        )}
      >
        {gradeLabel}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-center align-middle text-[11px] tabular-nums text-slate-700">
        {formatWeightKg(row.weight)}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-center align-middle text-[12px] tabular-nums text-slate-500">
        {row.minPrice > 0 ? formatKrw(row.minPrice) : "-"}
      </td>
      <td
        className={cn(
          "whitespace-nowrap px-3 py-2.5 text-center align-middle text-[12px] font-bold tabular-nums",
          isActive
            ? "text-slate-400"
            : isWon
              ? "text-sky-700"
              : "text-slate-400",
        )}
      >
        {isActive ? "-" : formatKrw(row.winningBid ?? null)}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-center align-middle text-[12px] tabular-nums text-slate-700">
        {formatKrw(row.myBid)}
      </td>
      <td
        className={cn(
          "whitespace-nowrap px-3 py-2.5 text-center align-middle text-[12px] font-bold tabular-nums",
          isActive
            ? "text-slate-900"
            : isWon
              ? "text-sky-700"
              : "text-slate-400",
        )}
      >
        {isActive || isWon ? formatKrw(row.totalAmount) : "-"}
      </td>
      <td
        className={cn(
          "whitespace-nowrap px-3 py-2.5 text-center align-middle text-[12px]",
          isActive || isWon ? "text-slate-700" : "text-slate-400",
        )}
        title={row.companyName || undefined}
      >
        <span className="block max-w-full truncate">
          {row.companyName || "-"}
        </span>
      </td>
      <td className="px-3 py-2.5 text-center align-middle">
        <div className="flex justify-center">
          <PartnerCell assignment={assignment} eligible={isWon} />
        </div>
      </td>
    </tr>
  );
}

/**
 * 거래처 셀.
 *
 * - 배정된 거래처가 있으면 이름 + 거래처번호 (small)
 * - 낙찰인데 미배정 → "미배정" 뱃지 (배정 필요를 상기)
 * - 진행중 → 아직 낙찰 확정 전이므로 "-"
 * - 미낙찰 → 배정 대상 아님 "-"
 */
function PartnerCell({
  assignment,
  eligible,
}: {
  assignment: AssignmentInfo | null;
  eligible: boolean;
}) {
  if (assignment) {
    return (
      <div className="flex min-w-0 flex-col items-center leading-tight">
        <span className="truncate text-[12px] font-bold text-slate-900">
          {assignment.partnerName || "-"}
        </span>
        {assignment.partnerNo ? (
          <span className="truncate text-[10.5px] tabular-nums text-slate-400">
            {assignment.partnerNo}
          </span>
        ) : null}
      </div>
    );
  }
  if (eligible) {
    return (
      <span className="inline-flex h-5 items-center bg-slate-100 px-1.5 text-[10px] font-bold leading-none text-slate-500">
        미배정
      </span>
    );
  }
  return <span className="text-[11px] text-slate-300">-</span>;
}

/**
 * 회차 배지 · 1차/2차/3차 를 색 톤으로 시각 구분.
 *
 * 회차가 진행될수록 톤이 진해지도록 3단 위계 구성:
 * - 1차: slate-50  · 초기 · 가장 옅음
 * - 2차: slate-200 · 중간
 * - 3차: slate-800 · 확정 · 가장 진함
 * - 없음: "-" 텍스트만
 */
function RoundBadge({ roundNo }: { roundNo: number | null }) {
  if (roundNo == null) {
    return <span className="text-[11px] text-slate-300">-</span>;
  }
  const styleMap: Record<number, string> = {
    1: "bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200",
    2: "bg-slate-200 text-slate-700",
    3: "bg-slate-800 text-white",
  };
  const cls = styleMap[roundNo] ?? "bg-slate-100 text-slate-600";
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center whitespace-nowrap px-1.5 text-[10px] font-bold leading-none tabular-nums",
        cls,
      )}
    >
      {roundNo}차
    </span>
  );
}

function SummaryPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "active" | "won" | "lost" | "amount";
}) {
  const dotClass =
    tone === "active"
      ? "bg-slate-800"
      : tone === "won"
        ? "bg-sky-500"
        : tone === "lost"
          ? "bg-slate-300"
          : "bg-slate-900";
  const valueColor =
    tone === "won"
      ? "text-sky-700"
      : tone === "amount"
        ? "text-slate-900"
        : tone === "lost"
          ? "text-slate-500"
          : "text-slate-800";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2 w-2", dotClass)} aria-hidden />
      <span className="text-slate-500">{label}</span>
      <span className={cn("font-bold", valueColor)}>{value}</span>
    </span>
  );
}

function EmptyRow({
  colSpan,
  message = "선택한 일자의 경매이력이 없습니다.",
}: {
  colSpan: number;
  message?: string;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-4 py-16 text-center text-[13px] text-slate-400"
      >
        {message}
      </td>
    </tr>
  );
}

function SkeletonRows({
  colSpan,
  rows,
}: {
  colSpan: number;
  rows: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-slate-100">
          <td colSpan={colSpan} className="px-3 py-3">
            <div className="h-4 w-full animate-pulse bg-slate-100" />
          </td>
        </tr>
      ))}
    </>
  );
}
