"use client";

import { useMeasure } from "react-use";

/** 전역 헤더 · 항상 붙어 있다 */
const HEADER_HEIGHT = 48;
/** 필터 패널을 아직 못 쟀을 때의 기본 높이 */
const FILTER_FALLBACK_HEIGHT = 46;

/**
 * 경매장 상장표의 고정 위치 · 전역 헤더 → 필터 → 표 머리글.
 *
 * 위 칸에 빈틈이 생기면 그 틈으로 행이 지나가므로, 줄바꿈으로 높이가 변하는 필터를
 * 실측해 머리글을 필터 바로 아래에 붙인다.
 * (필터와 표 패널 사이 8px 간격까지 머리글이 덮는다)
 *
 * `useMeasure` 가 읽는 값은 `contentRect` — 테두리와 안쪽 여백이 빠진 높이다.
 * 그래서 여기서 재는 래퍼에는 테두리를 달면 안 된다. 1px 이 빠진 만큼 머리글이 덜 내려와
 * 그 틈으로 행이 지나간다. 필터의 테두리는 래퍼가 아니라 `SheetFilterBar` 안쪽에 있다.
 */
export function useStickySheetOffsets() {
  const [filterRef, { height: filterHeight }] = useMeasure<HTMLDivElement>();
  const filterStickyTop = HEADER_HEIGHT;
  const headStickyTop =
    filterStickyTop + (filterHeight || FILTER_FALLBACK_HEIGHT);
  return { filterRef, filterStickyTop, headStickyTop };
}
