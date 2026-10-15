"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  isMyPageView,
  MY_PAGE_DEFAULT_VIEW,
  MY_PAGE_NOTICE_PARAM,
  MY_PAGE_VIEW_PARAM,
  type MyPageView,
} from "../constants/views";

/**
 * 보고 있는 화면 · 주소(`?view=`)가 쥔다.
 *
 * 경매내역처럼 저장소에 두지 않고 주소에 둔다 — 「잔고 화면 좀 봐 주세요」 하고
 * 주소를 넘길 수 있어야 하고, 뒤로 가기가 직전 화면으로 돌아와야 한다. 기본 화면(홈)은
 * 주소에서 지워 `/my` 한 가지로 남긴다.
 *
 * 공지 상세(`notice`)는 공지 화면 안에서만 뜻이 있어, 다른 화면으로 옮기면 함께 지운다.
 * 그 밖의 매개변수(`house` 등)는 건드리지 않는다.
 */
export function useMyPageView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const raw = searchParams.get(MY_PAGE_VIEW_PARAM);
  const view: MyPageView = isMyPageView(raw) ? raw : MY_PAGE_DEFAULT_VIEW;
  const noticeId = searchParams.get(MY_PAGE_NOTICE_PARAM);

  const navigate = useCallback(
    (next: MyPageView, nextNoticeId?: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === MY_PAGE_DEFAULT_VIEW) params.delete(MY_PAGE_VIEW_PARAM);
      else params.set(MY_PAGE_VIEW_PARAM, next);
      if (next === "notice" && nextNoticeId)
        params.set(MY_PAGE_NOTICE_PARAM, nextNoticeId);
      else params.delete(MY_PAGE_NOTICE_PARAM);
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const setView = useCallback((next: MyPageView) => navigate(next), [navigate]);

  const openNotice = useCallback(
    (id: string | null) => navigate("notice", id),
    [navigate],
  );

  return { view, setView, noticeId, openNotice };
}
