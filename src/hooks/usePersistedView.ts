"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * 머리 메뉴가 페이지 안 화면을 집어 주는 통로 · `/insight?view=stats`.
 *
 * 경매내역과 시세·통계는 고른 화면을 저장소(zustand persist)에 담고 사이드 레일이
 * 그걸 바꾼다. 그런데 머리 메뉴에서 바로 그 저장소를 건드릴 수가 없다 — 두 저장소
 * 모두 `skipHydration` 이라 페이지가 뜨면서 `rehydrate()` 로 **담아 둔 값을 다시
 * 덮어쓴다**. 머리에서 먼저 넣어 둔 값은 그 덮어쓰기에 지워진다.
 *
 * 그래서 주소에 실어 보내고, 페이지가 되살리기를 **마친 뒤에** 얹는다.
 */
const VIEW_PARAM = "view";

/** 머리 메뉴가 거는 주소 · `/insight?view=stats` */
export const viewHref = (href: string, view: string) =>
  `${href}?${VIEW_PARAM}=${view}`;

/**
 * 담아 둔 화면 되살리기 + 주소가 집어 준 화면 얹기.
 *
 * **얹은 뒤에는 주소에서 뗀다.** 남겨 두면 주인이 둘이 된다 — 머리에서 「경매통계」
 * 로 들어온 사람이 레일로 「시세」 를 골라도 주소에는 `?view=stats` 가 그대로라,
 * 새로고침 한 번에 방금 고른 것이 말없이 뒤집힌다. 주소는 한 번 전하고 비켜서고,
 * 그 뒤로는 레일과 저장소만 남는다.
 *
 * 되살리기를 매번 다시 부르는 것은 괜찮다. persist 미들웨어가 바깥에서 넣은 값도
 * 곧바로 저장소에 적으므로, 다시 읽어도 방금 얹은 화면이 그대로 나온다.
 */
export function usePersistedView<T extends string>({
  rehydrate,
  setView,
  isView,
}: {
  /**
   * `store.persist.rehydrate` · 저장소가 동기면 바로 끝난다.
   *
   * 셋 다 **모듈 바깥에 세워 둔 것**을 받아야 한다. 부르는 자리에서 화살표를 바로
   * 적으면 매 그림마다 새 함수가 되어 아래 effect 가 쉬지 않고 돈다.
   */
  rehydrate: () => Promise<void> | void;
  setView: (view: T) => void;
  /** 모르는 이름은 버린다 · 손으로 고친 주소가 빈 화면을 만들지 않게 */
  isView: (value: unknown) => value is T;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => {
    void (async () => {
      await rehydrate();

      const rest = new URLSearchParams(search);
      const requested = rest.get(VIEW_PARAM);
      if (!isView(requested)) return;
      setView(requested);

      /* `view` 만 떼고 나머지 쿼리는 지킨다 · 통째로 밀면 남의 값까지 없어진다 */
      rest.delete(VIEW_PARAM);
      const query = rest.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    })();
  }, [search, pathname, router, rehydrate, setView, isView]);
}
