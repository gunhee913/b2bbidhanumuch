"use client";

import { useMemo, useState } from "react";
import { format, subMonths } from "date-fns";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { PeriodFilter } from "@/features/history/components/PeriodFilter";
import { useMyDealer, useMyTransactions } from "../hooks/useMyPageData";
import {
  TRANSACTION_TYPE_LABEL,
  filterBalanceRows,
  formatTransactionDate,
  sumBalanceRows,
  type BalanceRow,
  type TransactionType,
} from "../lib/balance";
import {
  MY_TABLE_CLASS,
  MyPanel,
  MyPanelEmpty,
  PANEL_ACTION_CLASS,
  StatValue,
  formatWon,
} from "./MyPageParts";

const TYPE_OPTIONS: readonly { value: TransactionType | ""; label: string }[] =
  [
    { value: "", label: "전체" },
    { value: "deposit", label: TRANSACTION_TYPE_LABEL.deposit },
    { value: "withdraw", label: TRANSACTION_TYPE_LABEL.withdraw },
    { value: "auction_deduct", label: TRANSACTION_TYPE_LABEL.auction_deduct },
  ];

/** 처음 기간 · 최근 한 달 · 입금 확인하러 오는 사람이 보려는 범위 */
const DEFAULT_PERIOD = () => {
  const today = new Date();
  return {
    startDate: format(subMonths(today, 1), "yyyy-MM-dd"),
    endDate: format(today, "yyyy-MM-dd"),
  };
};

/**
 * 잔고 · 거래내역 · 은행 거래내역 조회의 짜임.
 *
 * 위에 잔고와 기간 합계, 아래 표. 잔고 열은 **그 줄까지의 잔고** 다 — 기간을 좁혀도
 * 그 줄의 잔고는 바뀌지 않는다(전체 내역에서 셈한 값을 걸러 보여 주기만 한다). 그래야
 * 「3월 10일 잔고가 얼마였나」 를 기간과 상관없이 믿을 수 있다.
 *
 * 경락대금 줄은 회차마다 합산된 한 줄이다. 낙찰서별 내역은 2단계(낙찰서·정산)에서.
 */
export function MyBalanceView() {
  const { dealerId, dealer } = useMyDealer();
  const { rows, summary, isLoading } = useMyTransactions(dealerId);
  const [period, setPeriod] = useState(DEFAULT_PERIOD);
  const [type, setType] = useState<TransactionType | "">("");

  const filtered = useMemo(
    () => filterBalanceRows(rows, { ...period, type }),
    [rows, period, type],
  );
  const periodSum = useMemo(() => sumBalanceRows(filtered), [filtered]);

  const exportExcel = () => {
    const data = filtered.map((row) => ({
      일시: formatTransactionDate(row.createdAt, "yyyy-MM-dd HH:mm"),
      구분: TRANSACTION_TYPE_LABEL[row.type],
      내용: row.description,
      입금: row.type === "deposit" ? row.amount : "",
      출금: row.type === "deposit" ? "" : row.amount,
      잔고: row.runningBalance,
    }));
    const sheet = XLSX.utils.json_to_sheet(data);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "거래내역");
    const name = dealer?.name ?? "거래내역";
    XLSX.writeFile(
      book,
      `${name}_거래내역_${period.startDate}_${period.endDate}.xlsx`,
    );
  };

  return (
    <>
      <MyPanel title="예치금" bodyClassName="px-4 py-4">
        {isLoading ? (
          <div className="h-16 animate-pulse bg-surface-accent" />
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">
            <StatValue
              label="잔고"
              size="lg"
              value={formatWon(summary.available)}
              tone={summary.available < 0 ? "lost" : "default"}
            />
            <StatValue
              label="누적 입금"
              value={formatWon(summary.totalDeposit)}
              tone="won"
            />
            <StatValue
              label="누적 출금"
              value={formatWon(summary.totalWithdraw)}
              tone="muted"
            />
            <StatValue
              label="누적 낙찰대금"
              value={formatWon(summary.totalAuction)}
              tone="muted"
            />
          </div>
        )}
      </MyPanel>

      <MyPanel
        title="거래내역"
        action={
          <button
            type="button"
            className={PANEL_ACTION_CLASS}
            onClick={exportExcel}
            disabled={filtered.length === 0}
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            엑셀
          </button>
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line-soft px-4 py-2.5">
          <PeriodFilter
            startDate={period.startDate}
            endDate={period.endDate}
            onChange={setPeriod}
          />
          <SegmentedTabs
            label="거래 종류"
            value={type}
            options={TYPE_OPTIONS}
            onChange={(v) => setType(v as TransactionType | "")}
          />
        </div>

        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 px-4 py-2.5 text-[12.5px] text-content-faint">
          <span>
            기간 내{" "}
            <b className="font-semibold tabular-nums text-content">
              {filtered.length}
            </b>
            건
          </span>
          <span>
            입금{" "}
            <b className="font-semibold tabular-nums text-won">
              {formatWon(periodSum.deposit)}
            </b>
          </span>
          <span>
            출금{" "}
            <b className="font-semibold tabular-nums text-content">
              {formatWon(periodSum.withdraw)}
            </b>
          </span>
          <span>
            낙찰대금{" "}
            <b className="font-semibold tabular-nums text-content">
              {formatWon(periodSum.auction)}
            </b>
          </span>
        </div>

        {isLoading ? (
          <div className="m-4 h-48 animate-pulse bg-surface-accent" />
        ) : filtered.length === 0 ? (
          <MyPanelEmpty text="이 기간에 거래가 없습니다" />
        ) : (
          <BalanceTable rows={filtered} />
        )}
      </MyPanel>
    </>
  );
}

function BalanceTable({ rows }: { rows: BalanceRow[] }) {
  return (
    <table className={cn(MY_TABLE_CLASS, "border-t border-line-soft")}>
      <colgroup>
        <col className="w-[132px]" />
        <col className="w-[84px]" />
        <col />
        <col className="w-[128px]" />
        <col className="w-[128px]" />
        <col className="w-[140px]" />
      </colgroup>
      <thead>
        <tr>
          <th className="text-left">일시</th>
          <th className="text-left">구분</th>
          <th className="text-left">내용</th>
          <th className="text-right">입금</th>
          <th className="text-right">출금</th>
          <th className="text-right">잔고</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const isDeposit = row.type === "deposit";
          return (
            <tr key={row.id} className="hover:bg-surface-muted">
              <td className="tabular-nums text-content-mid">
                {formatTransactionDate(row.createdAt, "yy.M.d (EEE) HH:mm")}
              </td>
              <td>
                <span
                  className={cn(
                    "text-[12px] font-semibold",
                    isDeposit ? "text-won" : "text-content-mid",
                  )}
                >
                  {TRANSACTION_TYPE_LABEL[row.type]}
                </span>
              </td>
              <td className="truncate text-content-mid" title={row.description}>
                {row.description}
              </td>
              <td className="text-right font-semibold tabular-nums text-won">
                {isDeposit ? formatWon(row.amount) : ""}
              </td>
              <td className="text-right font-semibold tabular-nums text-content">
                {isDeposit ? "" : formatWon(row.amount)}
              </td>
              <td
                className={cn(
                  "text-right font-bold tabular-nums",
                  row.runningBalance < 0 ? "text-lost" : "text-content",
                )}
              >
                {formatWon(row.runningBalance)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
