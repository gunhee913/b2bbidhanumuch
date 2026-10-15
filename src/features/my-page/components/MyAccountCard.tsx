"use client";

import { cn } from "@/lib/utils";
import { SURFACE_SHELL_CLASS } from "@/features/live-auction/constants/surface";
import { useCurrentHouse } from "@/features/entry/hooks/useCurrentHouse";
import { useMyDealer, useMyTransactions } from "../hooks/useMyPageData";
import { StatValue, formatSignedWon, formatWon } from "./MyPageParts";

/**
 * 맨 위 계정 카드 · 왼쪽은 누구인지, 오른쪽은 **예치금 하나**.
 *
 * 토스증권 「내 계좌」 머리와 같은 짜임이다 — 큰 숫자는 하나(총 자산 ↔ 예치금)고,
 * 오늘 들어오고 나간 것은 그 아래 작은 글자로만. 숫자를 여럿 세우면 어느 것이 「내 돈」
 * 인지 다시 읽어야 한다.
 *
 * 직원으로 들어왔으면 소속 중도매인 이름 옆에 직원 이름을 붙인다. 잔고는 중도매인 것이지
 * 직원 것이 아니라서, 누구 돈을 보고 있는지 적어 둔다. 직급·구분·연락처는 적지 않는다 —
 * 계정·보안 화면에 다 있고, 머리 카드는 「누구의 얼마」 만 말하면 된다.
 */
export function MyAccountCard() {
  const { dealer, employee, user, dealerId } = useMyDealer();
  const { dealerHouse } = useCurrentHouse();
  const { summary, isLoading } = useMyTransactions(dealerId);

  const dealerNo = dealer?.dealerNo ?? "";
  const dealerName = dealer?.name ?? user?.name ?? "";

  return (
    <section
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-10 gap-y-4 px-6 py-5",
        SURFACE_SHELL_CLASS,
      )}
    >
      <div className="flex min-w-0 items-center gap-4">
        {/* 번호는 머리와 같이 그대로 적는다 · 동그라미에 일곱 자리를 넣으면 양끝이 잘린다 */}
        <span className="flex h-12 shrink-0 items-center rounded-lg bg-inverse px-3.5 text-[17px] font-bold tabular-nums text-inverse-content">
          {dealerNo || "-"}
        </span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-baseline gap-x-2 text-[17px] font-bold text-content">
            <span className="truncate">{dealerName || "중도매인"}</span>
            {employee ? (
              <span className="text-[13px] font-semibold text-content-mid">
                {employee.name}
              </span>
            ) : null}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 text-[12.5px] text-content-faint">
            {dealerNo ? (
              <span className="tabular-nums">거래인번호 {dealerNo}</span>
            ) : null}
            {dealerHouse ? <span>{dealerHouse.fullName}</span> : null}
          </p>
        </div>
      </div>

      <div className="flex items-end gap-10">
        <StatValue
          label="예치금 잔고"
          size="lg"
          value={isLoading ? "…" : formatWon(summary.available)}
          tone={summary.available < 0 ? "lost" : "default"}
          hint={
            isLoading ? null : (
              <span className="flex items-center gap-2">
                <span>
                  오늘 입금{" "}
                  <b className="font-semibold text-content-mid">
                    {summary.todayDeposit > 0
                      ? formatSignedWon(summary.todayDeposit, true)
                      : "0"}
                  </b>
                </span>
                <span className="text-content-ghost">·</span>
                <span>
                  오늘 차감{" "}
                  <b className="font-semibold text-content-mid">
                    {summary.todayDeduct > 0
                      ? formatSignedWon(summary.todayDeduct, false)
                      : "0"}
                  </b>
                </span>
              </span>
            )
          }
        />
      </div>
    </section>
  );
}
