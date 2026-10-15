"use client";

import { cn } from "@/lib/utils";
import { SURFACE_SHELL_CLASS } from "@/features/live-auction/constants/surface";
import { MY_PAGE_VIEWS, type MyPageView } from "../constants/views";

const NAV_ITEM_CLASS =
  "flex h-9 w-full items-center gap-2.5 rounded-md px-3 text-left text-[13px] font-semibold transition-colors";

/**
 * 왼쪽 세로 메뉴 · 토스 설정 화면의 짜임.
 *
 * 경매내역은 오른쪽 56px 아이콘 레일로 화면을 고르지만 여기는 글자 메뉴다. 그쪽은
 * 표가 폭을 통째로 써야 해서 메뉴를 아이콘으로 줄였고, 여기는 본문이 카드 몇 장이라
 * 그럴 까닭이 없다 — 「잔고·거래내역」 을 아이콘 하나로 알아보게 할 수는 없다.
 *
 * 화면 고르기만 한다. 약관·개인정보처리방침은 바닥글, 로그아웃은 머리 계정 메뉴에 이미
 * 있어 같은 것을 두 군데 두지 않는다.
 */
export function MyPageNav({
  view,
  onChange,
}: {
  view: MyPageView;
  onChange: (view: MyPageView) => void;
}) {
  return (
    <nav
      aria-label="마이페이지 메뉴"
      className={cn("flex flex-col p-2", SURFACE_SHELL_CLASS)}
    >
      <ul className="flex flex-col gap-0.5">
        {MY_PAGE_VIEWS.map((item) => {
          const active = item.key === view;
          const Icon = item.icon;
          return (
            <li key={item.key}>
              <button
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => onChange(item.key)}
                className={cn(
                  NAV_ITEM_CLASS,
                  active
                    ? "bg-surface-accent text-content"
                    : "text-content-mid hover:bg-surface-muted hover:text-content",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active ? "text-content" : "text-content-faint",
                  )}
                  strokeWidth={1.9}
                  aria-hidden
                />
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
