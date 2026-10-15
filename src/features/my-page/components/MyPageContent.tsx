"use client";

import type { ReactNode } from "react";
import { match } from "ts-pattern";
import { cn } from "@/lib/utils";
import {
  CANVAS_BG_CLASS,
  PAGE_GUTTER_CLASS,
} from "@/features/live-auction/constants/surface";
import { MainHeader } from "@/features/main/components/MainHeader";
import { LoginGateCard } from "@/features/main/components/LoginGateCard";
import { useMyDealer } from "../hooks/useMyPageData";
import { useMyPageView } from "../hooks/useMyPageView";
import { SiteFooter } from "@/components/SiteFooter";
import { MyAccountCard } from "./MyAccountCard";
import { MyPageNav } from "./MyPageNav";
import { MyHomeView } from "./MyHomeView";
import { MyBalanceView } from "./MyBalanceView";
import { MyNotifyView } from "./MyNotifyView";
import { MyNoticeView } from "./MyNoticeView";
import { MyAccountView } from "./MyAccountView";

/**
 * `/my` 마이페이지 · PC.
 *
 * 토스증권 PC 「내 계좌 + 설정」 의 짜임을 따른다 — 위에 계정 카드(누구인지 + 예치금 하나),
 * 아래는 왼쪽 세로 메뉴와 오른쪽 본문. 모바일 `/profile` 이 세로로 길게 늘어놓던
 * 메뉴(잔고·알림·계정·공지…)를 PC 폭에 맞춰 두 열로 다시 놓은 것이다.
 *
 * 머리는 `fluid` 다. 경매장·배송지시·경매내역이 모두 fluid 라 메뉴 글자가 같은 X 에
 * 서 있어야 하고, 본문만 1360 안에 모은다 — 설정 화면은 표가 아니라 카드 몇 장이라
 * 화면 끝까지 늘리면 오히려 읽기 힘들다.
 */
export function MyPageContent() {
  const { status, dealerId } = useMyDealer();
  const { view, setView, noticeId, openNotice } = useMyPageView();

  if (status === "loading") {
    return (
      <Shell>
        <div className="h-24 animate-pulse bg-surface-accent" />
        <div className="mt-2 grid grid-cols-[220px_1fr] gap-2">
          <div className="h-80 animate-pulse bg-surface-accent" />
          <div className="h-80 animate-pulse bg-surface-accent" />
        </div>
      </Shell>
    );
  }

  if (!dealerId) {
    return (
      <Shell>
        <LoginGateCard pageLabel="마이페이지" requireDealer />
      </Shell>
    );
  }

  return (
    <Shell>
      <MyAccountCard />
      <div className="grid grid-cols-1 gap-2 md:grid-cols-[220px_minmax(0,1fr)] md:items-start">
        <div className="md:sticky md:top-[60px]">
          <MyPageNav view={view} onChange={setView} />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          {match(view)
            .with("home", () => (
              <MyHomeView onNavigate={setView} onOpenNotice={openNotice} />
            ))
            .with("balance", () => <MyBalanceView />)
            .with("notify", () => <MyNotifyView />)
            .with("notice", () => (
              <MyNoticeView noticeId={noticeId} onOpen={openNotice} />
            ))
            .with("account", () => <MyAccountView />)
            .exhaustive()}
        </div>
      </div>
      <SiteFooter />
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className={cn("min-h-screen", CANVAS_BG_CLASS)}>
      <MainHeader fluid />
      <main
        className={cn(
          "mx-auto flex max-w-[1360px] flex-col gap-2",
          PAGE_GUTTER_CLASS,
        )}
      >
        {children}
      </main>
    </div>
  );
}
