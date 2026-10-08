"use client";

import { useEffect, useMemo, useState } from "react";
import { useRealtimeFavorites } from "@/hooks/useRealtimeFavorites";
import { useBidStore } from "@/stores/bidStore";

/** 하이드레이션 전에 내보내는 빈 집합 · 매번 새로 만들면 표가 통째로 다시 그려진다 */
const EMPTY: ReadonlySet<string> = new Set();

export interface AuctionFavorites {
  /**
   * 관심으로 찍은 것 전부 · 개체는 **접수번호**, 부위는 **부위 UUID** 로 한 집합에 섞여 있다.
   *
   * 섞어 둬도 헷갈릴 일이 없는 건 양쪽 다 「가진 값으로 찍어 보는」 식으로만 쓰기 때문이다.
   * 상장표는 `ids.has(listing.listingNo)`, 부위 표는 `ids.has(part.id)` 를 묻는다. 접수번호
   * (`260930-101`)와 UUID 는 생김새가 겹치지 않아 남의 열쇠에 걸리지 않는다. 굳이 둘로
   * 나누려면 스토어가 서버에서 받을 때 이미 합쳐 버린 걸 `-` 개수로 되짚어야 하는데,
   * 그 추측을 한 군데 더 늘리는 것보다 안 나누는 편이 낫다.
   */
  ids: ReadonlySet<string>;
  /** 개체면 접수번호를, 부위면 부위 UUID 를 넘긴다 */
  toggle: (id: string) => void;
  /** 그날 찍어 둔 것을 통째로 비운다 · 사이드 메뉴 「전체 삭제」 */
  clear: () => void;
}

/**
 * 경매 관심 · 개체와 부위를 같은 목록에 담는다.
 *
 * `dealer_favorites.target_id` 는 개체면 접수번호, 부위면 부위 UUID 를 담기로 되어 있고
 * (마이그레이션 주석), 스토어는 둘을 `-` 개수로 갈라 `target_type` 을 정한다. 개체를
 * UUID(`260930-...` 가 아닌 `a1b2-c3d4-...`)로 넘기면 조각 수가 셋을 넘어 부위로
 * 저장되고, 다시 읽을 때 개체 쪽에 안 잡힌다.
 *
 * 목록은 딜러 단위로 공유되고 상장일이 바뀌면 그날 것만 남는다 — 어제 찍어 둔 관심이
 * 오늘 화면에 남아 있으면 안 되기 때문이다.
 */
export function useAuctionFavorites(
  listingDate: string | null | undefined,
): AuctionFavorites {
  const favorites = useBidStore((s) => s.favorites);
  const toggle = useBidStore((s) => s.toggleFavorite);
  const clear = useBidStore((s) => s.clearFavorites);
  const loadFromServer = useBidStore((s) => s.loadFavoritesFromServer);

  /*
   * 스토어가 localStorage 에 남은 값을 첫 렌더부터 들고 들어오면 서버가 그린 HTML 과
   * 달라 하이드레이션 경고가 난다. 붙고 나서 켠다 — 진짜 값은 어차피 서버에서 다시 받고,
   * 그 사이 반 박자 동안 별이 비어 보이는 편이 표가 통째로 어긋나는 것보다 낫다.
   */
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  useEffect(() => {
    if (!listingDate) return;
    loadFromServer(listingDate);
  }, [listingDate, loadFromServer]);

  /* 같은 딜러의 다른 자리(다른 창·다른 직원)에서 찍은 것도 따라 들어온다 */
  useRealtimeFavorites({
    onFavChange: () => useBidStore.getState().reloadFavoritesDebounced(),
    enabled: !!listingDate,
  });

  const ids = useMemo(
    () => (ready ? new Set(favorites) : EMPTY),
    [ready, favorites],
  );

  return { ids, toggle, clear };
}
