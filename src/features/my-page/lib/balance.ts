/**
 * 예치금 셈 · 거래내역(`/api/dealer-transactions`) 한 줄기에서 잔고와 표 줄을 만든다.
 *
 * 서버는 수기 거래(입금·출금)와 경락대금(회차별 합산)을 섞어 내려보내는데, 수기 거래의
 * `balance` 는 그 시점 값이고 경락 줄은 0 이라 그대로 못 쓴다. 관리자 잔액 화면
 * (`/api/dealer-balances`)과 같은 식으로 처음부터 다시 더한다 — 입금은 더하고 나머지는
 * 뺀다. 취소된 줄은 서버에서 거른다(`status=active`).
 */

import { format, isValid, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

export type TransactionType = "deposit" | "withdraw" | "auction_deduct";

export interface DealerTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  status: "active" | "cancelled";
  createdAt: string;
  /** `auction` 은 회차 마감으로 생긴 경락대금 줄 · `manual` 은 사무실에서 적은 입출금 */
  source: "manual" | "auction";
}

export const TRANSACTION_TYPE_LABEL: Record<TransactionType, string> = {
  deposit: "입금",
  withdraw: "출금",
  auction_deduct: "낙찰대금",
};

export interface BalanceRow extends DealerTransaction {
  /** 이 줄까지 더한 잔고 */
  runningBalance: number;
}

export interface BalanceSummary {
  /** 지금 쓸 수 있는 예치금 */
  available: number;
  totalDeposit: number;
  totalWithdraw: number;
  totalAuction: number;
  todayDeposit: number;
  /** 오늘 빠져나간 것 · 출금 + 낙찰대금 */
  todayDeduct: number;
}

const signedAmount = (tx: DealerTransaction) =>
  tx.type === "deposit" ? tx.amount : -tx.amount;

/**
 * 거래 시각 · 못 읽으면 `null`.
 *
 * 경락대금 줄은 서버가 회차 `ended_at` 으로 합성하는데, 회차가 안 닫혔거나 상장 연결이
 * 끊긴 줄은 `''` 이나 `T00:00:00` 처럼 날짜 없는 값으로 온다. 그대로 `format` 에 넣으면
 * 페이지가 통째로 죽으므로 여기서 걸러 「-」 로 보여 준다.
 */
export const parseTransactionDate = (iso: string): Date | null => {
  if (!iso) return null;
  const date = parseISO(iso);
  return isValid(date) ? date : null;
};

export const formatTransactionDate = (iso: string, pattern: string) => {
  const date = parseTransactionDate(iso);
  return date ? format(date, pattern, { locale: ko }) : "-";
};

/**
 * 거래가 일어난 날 · 보는 사람의 시간대 기준 `yyyy-MM-dd` · 날짜 없으면 `''`.
 *
 * 서버가 주는 `createdAt` 은 UTC ISO 라 앞 열 글자를 그냥 자르면 밤 9시 이후 입금이
 * 전날로 잡힌다. 「오늘 입금」 과 기간 필터가 사무실 달력과 같아야 한다.
 */
export const transactionDay = (tx: Pick<DealerTransaction, "createdAt">) => {
  const date = parseTransactionDate(tx.createdAt);
  return date ? format(date, "yyyy-MM-dd") : "";
};

/** 날짜 없는 줄은 맨 뒤(= 표에서 맨 위) · 잔고 흐름 가운데 끼어들어 중간 잔고를 흐리지 않게 */
const createdTime = (tx: DealerTransaction) =>
  parseTransactionDate(tx.createdAt)?.getTime() ?? Number.POSITIVE_INFINITY;

const byCreatedAsc = (a: DealerTransaction, b: DealerTransaction) => {
  const ta = createdTime(a);
  const tb = createdTime(b);
  if (ta === tb) return 0;
  return ta < tb ? -1 : 1;
};

/**
 * 오래된 것부터 더해 잔고를 붙이고, 최근 것이 위로 오게 뒤집는다.
 * 표는 최근 줄을 먼저 보여 주지만 잔고는 과거에서 현재로만 셀 수 있다.
 */
export function buildBalanceRows(txs: DealerTransaction[]): BalanceRow[] {
  const rows: BalanceRow[] = [];
  let running = 0;
  for (const tx of [...txs].sort(byCreatedAsc)) {
    running += signedAmount(tx);
    rows.push({ ...tx, runningBalance: running });
  }
  return rows.reverse();
}

export function summarizeBalance(
  txs: DealerTransaction[],
  today: string,
): BalanceSummary {
  return txs.reduce<BalanceSummary>(
    (acc, tx) => {
      const isToday = transactionDay(tx) === today;
      if (tx.type === "deposit") {
        acc.totalDeposit += tx.amount;
        if (isToday) acc.todayDeposit += tx.amount;
      } else {
        if (tx.type === "withdraw") acc.totalWithdraw += tx.amount;
        else acc.totalAuction += tx.amount;
        if (isToday) acc.todayDeduct += tx.amount;
      }
      acc.available += signedAmount(tx);
      return acc;
    },
    {
      available: 0,
      totalDeposit: 0,
      totalWithdraw: 0,
      totalAuction: 0,
      todayDeposit: 0,
      todayDeduct: 0,
    },
  );
}

/**
 * 기간(둘 다 `yyyy-MM-dd` · 양 끝 포함)과 종류로 거른다 · 빈 종류는 전부.
 *
 * 날짜 없는 줄은 기간에 상관없이 남긴다 — 돈이 오간 줄을 날짜가 없다고 숨기면 잔고와
 * 표가 안 맞는 까닭을 찾을 길이 없다.
 */
export function filterBalanceRows(
  rows: BalanceRow[],
  {
    startDate,
    endDate,
    type,
  }: { startDate: string; endDate: string; type: TransactionType | "" },
): BalanceRow[] {
  return rows.filter((row) => {
    if (type && row.type !== type) return false;
    const day = transactionDay(row);
    if (!day) return true;
    return day >= startDate && day <= endDate;
  });
}

/** 걸러진 줄의 합 · 표 머리 요약과 엑셀 바닥줄이 같은 수를 적게 */
export function sumBalanceRows(rows: BalanceRow[]) {
  return rows.reduce(
    (acc, row) => {
      if (row.type === "deposit") acc.deposit += row.amount;
      else if (row.type === "withdraw") acc.withdraw += row.amount;
      else acc.auction += row.amount;
      return acc;
    },
    { deposit: 0, withdraw: 0, auction: 0 },
  );
}
