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
 */
export function useStickySheetOffsets() {
  const [filterRef, { height: filterHeight }] = useMeasure<HTMLDivElement>();
  const filterStickyTop = HEADER_HEIGHT;
  const headStickyTop =
    filterStickyTop + (filterHeight || FILTER_FALLBACK_HEIGHT);
  return { filterRef, filterStickyTop, headStickyTop };
}
