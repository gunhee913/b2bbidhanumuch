import { HOUSE_QUERY_KEY } from "@/features/entry/constants";

/** 경매장 상장표 · 공판장 컨텍스트만 유지 */
export function liveRoomHref(houseKey?: string | null): string {
  if (!houseKey) return "/auction/live";
  const params = new URLSearchParams({ [HOUSE_QUERY_KEY]: houseKey });
  return `/auction/live?${params.toString()}`;
}

/**
 * 개체 페이지 · `/auction/live/listing/260929-101?house=음성&part=03`.
 * 고정 경로 `listing` 이 동적 `[slug]` 보다 먼저 잡히므로 공판장 슬러그 라우트와 겹치지 않는다.
 */
export function listingDetailHref(
  listingNo: string,
  opts: { houseKey?: string | null; part?: string | null } = {},
): string {
  const params = new URLSearchParams();
  if (opts.houseKey) params.set(HOUSE_QUERY_KEY, opts.houseKey);
  if (opts.part) params.set("part", opts.part);
  const qs = params.toString();
  return `/auction/live/listing/${encodeURIComponent(listingNo)}${qs ? `?${qs}` : ""}`;
}

/**
 * 관심 페이지 · `/auction/live/favorites?house=음성&part=<부위 UUID>`.
 *
 * 다른 두 축과 달리 주소에 세울 대상이 없다 — 관심 목록 자체가 화면의 전부라 고정축이
 * 없다. `part` 는 처음 고를 행이고, 부위축에서 넘어올 때 보던 행을 들고 오는 데 쓴다.
 * 개체 페이지의 `part`(두 자리 부위번호)와 이름만 같고 값이 다르다 — 거기는 한 개체
 * 안에서 몇 번째냐를 묻지만, 여기는 어느 개체의 것인지까지 가려야 해서 UUID 여야 한다.
 */
export function favoritesHref(
  opts: { houseKey?: string | null; partId?: string | null } = {},
): string {
  const params = new URLSearchParams();
  if (opts.houseKey) params.set(HOUSE_QUERY_KEY, opts.houseKey);
  if (opts.partId) params.set("part", opts.partId);
  const qs = params.toString();
  return `/auction/live/favorites${qs ? `?${qs}` : ""}`;
}

/**
 * 부위 페이지 · `/auction/live/part/등심?house=음성&listing=260929-101`.
 *
 * 개체 페이지와 같은 화면을 쓰되 고정축만 뒤집는다 — 부위 하나를 세우고
 * 그 부위를 가진 개체들이 표의 행이 된다. `listing` 은 표에서 처음 고를 행.
 */
export function partDetailHref(
  group: string,
  opts: { houseKey?: string | null; listingNo?: string | null } = {},
): string {
  const params = new URLSearchParams();
  if (opts.houseKey) params.set(HOUSE_QUERY_KEY, opts.houseKey);
  if (opts.listingNo) params.set("listing", opts.listingNo);
  const qs = params.toString();
  return `/auction/live/part/${encodeURIComponent(group)}${qs ? `?${qs}` : ""}`;
}
