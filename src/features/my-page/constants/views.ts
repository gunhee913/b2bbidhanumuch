import type { ComponentType } from "react";
import {
  Bell,
  LayoutDashboard,
  Megaphone,
  UserRound,
  Wallet,
  type LucideProps,
} from "lucide-react";

export type MyPageView = "home" | "balance" | "notify" | "notice" | "account";

export const MY_PAGE_PATH = "/my";
export const MY_PAGE_VIEW_PARAM = "view";
/** 공지 상세 · `?view=notice&notice=<id>` */
export const MY_PAGE_NOTICE_PARAM = "notice";
export const MY_PAGE_DEFAULT_VIEW: MyPageView = "home";

/**
 * 왼쪽 메뉴 차례 · 자주 보는 것부터.
 *
 * 잔고가 홈 바로 다음이다 — 마이페이지에 들어오는 가장 흔한 까닭이 「입금됐나」 다.
 * 알림·공지는 읽는 것, 계정은 한 번 맞춰 두면 다시 올 일이 드물어 맨 아래.
 * 약관·개인정보처리방침은 바닥글에, 로그아웃은 머리 계정 메뉴에 있어 여기 두지 않는다.
 */
export const MY_PAGE_VIEWS: {
  key: MyPageView;
  label: string;
  icon: ComponentType<LucideProps>;
}[] = [
  { key: "home", label: "홈", icon: LayoutDashboard },
  { key: "balance", label: "잔고·거래내역", icon: Wallet },
  { key: "notify", label: "알림", icon: Bell },
  { key: "notice", label: "공지사항", icon: Megaphone },
  { key: "account", label: "계정·보안", icon: UserRound },
];

export function isMyPageView(value: string | null): value is MyPageView {
  return MY_PAGE_VIEWS.some((v) => v.key === value);
}

/** `/my` 안 주소 · 홈은 `?view=` 없이, 공지 상세는 `notice` 를 덧붙인다 */
export function myPageHref(view: MyPageView, noticeId?: string): string {
  const params = new URLSearchParams();
  if (view !== MY_PAGE_DEFAULT_VIEW) params.set(MY_PAGE_VIEW_PARAM, view);
  if (noticeId) params.set(MY_PAGE_NOTICE_PARAM, noticeId);
  const qs = params.toString();
  return qs ? `${MY_PAGE_PATH}?${qs}` : MY_PAGE_PATH;
}
