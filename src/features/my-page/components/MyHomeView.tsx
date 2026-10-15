"use client";

import Link from "next/link";
import { format, parseISO, startOfMonth } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronRight, Gavel, History, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { SURFACE_SHELL_CLASS } from "@/features/live-auction/constants/surface";
import type { MyPageView } from "../constants/views";
import {
  useDealerNotices,
  useMyDashboard,
  useMyDealer,
  useMyTransactions,
} from "../hooks/useMyPageData";
import {
  TRANSACTION_TYPE_LABEL,
  formatTransactionDate,
  type BalanceRow,
} from "../lib/balance";
import {
  MY_TABLE_CLASS,
  MyPanel,
  MyPanelEmpty,
  PANEL_ACTION_CLASS,
  StatValue,
  formatSignedWon,
  formatWon,
} from "./MyPageParts";

const RECENT_TRANSACTION_COUNT = 5;
const NOTICE_COUNT = 5;
const TOP_PART_COUNT = 3;

/** 홈 바로가기 · 마이페이지에 들어왔다가 되돌아갈 가장 흔한 곳 셋 */
const SHORTCUTS = [
  { label: "경매장", href: "/auction/live", icon: Gavel },
  { label: "배송지시", href: "/delivery", icon: Truck },
  { label: "경매내역", href: "/history", icon: History },
];

/**
 * 홈 · 「이달 어땠나」 와 「돈이 어떻게 움직였나」 를 한눈에.
 *
 * 토스증권 PC 첫 화면처럼 요약 카드 몇 장이다. 각 카드 머리의 「전체 보기」 가 왼쪽
 * 메뉴의 해당 화면으로 보낸다 — 홈은 들여다보는 곳이지 일하는 곳이 아니다.
 */
export function MyHomeView({
  onNavigate,
  onOpenNotice,
}: {
  onNavigate: (view: MyPageView) => void;
  onOpenNotice: (id: string) => void;
}) {
  const { dealerId } = useMyDealer();
  const today = new Date();
  const monthStart = format(startOfMonth(today), "yyyy-MM-dd");
  const todayKey = format(today, "yyyy-MM-dd");

  const dashboard = useMyDashboard(dealerId, monthStart, todayKey);
  const transactions = useMyTransactions(dealerId);
  const notices = useDealerNotices(NOTICE_COUNT);

  const summary = dashboard.data?.summary;
  const topParts = (dashboard.data?.byPart ?? [])
    .slice()
    .sort((a, b) => b.wonAmount - a.wonAmount)
    .slice(0, TOP_PART_COUNT);
  const recentRows = transactions.rows.slice(0, RECENT_TRANSACTION_COUNT);

  return (
    <>
      <MyPanel
        title={`${format(today, "M월", { locale: ko })} 낙찰 요약`}
        description={`${format(startOfMonth(today), "M.d", { locale: ko })} ~ ${format(today, "M.d", { locale: ko })} · 낙찰이 확정된 것만`}
        bodyClassName="px-4 py-4"
      >
        {dashboard.isLoading ? (
          <div className="h-16 animate-pulse bg-surface-accent" />
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">
            <StatValue
              label="낙찰대금"
              value={formatWon(summary?.wonAmount ?? 0)}
            />
            <StatValue
              label="낙찰"
              value={String(summary?.wonCount ?? 0)}
              unit="건"
            />
            <StatValue
              label="응찰"
              value={String(summary?.bidCount ?? 0)}
              unit="건"
              tone="muted"
            />
            <StatValue
              label="낙찰률"
              value={String(Math.round(summary?.wonRate ?? 0))}
              unit="%"
              tone="muted"
            />
          </div>
        )}

        {topParts.length > 0 ? (
          <ul className="mt-5 flex flex-wrap gap-2">
            {topParts.map((part) => (
              <li
                key={part.name}
                className="flex items-baseline gap-2 rounded-md bg-surface-muted px-3 py-1.5 text-[12.5px]"
              >
                <span className="font-semibold text-content">{part.name}</span>
                <span className="tabular-nums text-content-mid">
                  {part.wonCount}건 · {formatWon(part.wonAmount)}원
                </span>
                <span className="tabular-nums text-content-faint">
                  {Math.round(part.ratio)}%
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </MyPanel>

      <div className="grid grid-cols-1 gap-2 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <MyPanel
          title="최근 거래"
          description="입금 · 출금 · 낙찰대금 차감"
          action={
            <button
              type="button"
              className={PANEL_ACTION_CLASS}
              onClick={() => onNavigate("balance")}
            >
              전체 보기
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          }
        >
          {transactions.isLoading ? (
            <div className="m-4 h-40 animate-pulse bg-surface-accent" />
          ) : recentRows.length === 0 ? (
            <MyPanelEmpty text="아직 거래가 없습니다" />
          ) : (
            <RecentTransactionTable rows={recentRows} />
          )}
        </MyPanel>

        <MyPanel
          title="공지사항"
          action={
            <button
              type="button"
              className={PANEL_ACTION_CLASS}
              onClick={() => onNavigate("notice")}
            >
              전체 보기
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          }
        >
          {notices.isLoading ? (
            <div className="m-4 h-40 animate-pulse bg-surface-accent" />
          ) : (notices.data ?? []).length === 0 ? (
            <MyPanelEmpty text="등록된 공지가 없습니다" />
          ) : (
            <ul className="divide-y divide-line-soft">
              {(notices.data ?? []).map((notice) => (
                <li key={notice.id}>
                  <button
                    type="button"
                    onClick={() => onOpenNotice(notice.id)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-muted"
                  >
                    {notice.isPinned ? (
                      <span className="shrink-0 rounded bg-inverse px-1.5 py-0.5 text-[10.5px] font-bold text-inverse-content">
                        필독
                      </span>
                    ) : null}
                    <span className="min-w-0 flex-1 truncate text-[13px] text-content">
                      {notice.title}
                    </span>
                    <span className="shrink-0 text-[11.5px] tabular-nums text-content-faint">
                      {format(parseISO(notice.createdAt), "M.d")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </MyPanel>
      </div>

      <nav aria-label="바로가기" className="grid grid-cols-3 gap-2">
        {SHORTCUTS.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-muted",
              SURFACE_SHELL_CLASS,
            )}
          >
            <span className="flex items-center gap-2.5 text-[13px] font-semibold text-content">
              <Icon
                className="h-4 w-4 text-content-faint"
                strokeWidth={1.9}
                aria-hidden
              />
              {label}
            </span>
            <ChevronRight className="h-4 w-4 text-content-ghost" aria-hidden />
          </Link>
        ))}
      </nav>
    </>
  );
}

function RecentTransactionTable({ rows }: { rows: BalanceRow[] }) {
  return (
    <table className={MY_TABLE_CLASS}>
      <colgroup>
        <col className="w-[88px]" />
        <col className="w-[76px]" />
        <col />
        <col className="w-[120px]" />
      </colgroup>
      <thead>
        <tr>
          <th className="text-left">일시</th>
          <th className="text-left">구분</th>
          <th className="text-left">내용</th>
          <th className="text-right">금액</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const isDeposit = row.type === "deposit";
          return (
            <tr key={row.id}>
              <td className="tabular-nums text-content-mid">
                {formatTransactionDate(row.createdAt, "M.d (EEE)")}
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
              <td className="truncate text-content-mid">{row.description}</td>
              <td
                className={cn(
                  "text-right font-semibold tabular-nums",
                  isDeposit ? "text-won" : "text-content",
                )}
              >
                {formatSignedWon(row.amount, isDeposit)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
