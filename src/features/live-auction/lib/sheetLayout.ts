import { sum } from "es-toolkit";
import { COMPACT_COLUMN_PX } from "@/features/listings/lib/sheetColumns";

/**
 * 상장표 바닥 폭 (826) · 열 바닥 폭의 합이라 한 글자도 잘리지 않는다.
 *
 * 낙찰 · 총 낙찰대금 열은 없다. 경매가 도는 동안 대부분 비어 있는 칸이고, 결과는
 * 경매내역 상장표가 같은 열로 보여 준다 (`SheetResultCells`).
 */
export const SHEET_TABLE_MIN_WIDTH = sum(COMPACT_COLUMN_PX);

/** 상장표 카드 바닥 폭 · 표 바닥 폭 + 카드 테두리 좌우 1px */
export const TABLE_CARD_MIN_WIDTH = SHEET_TABLE_MIN_WIDTH + 2;

/** 옆으로 굴리지 않아도 늘 보이는 열 · 접수번호 ~ 근내지방 (개체를 고르는 데 쓰는 열) */
const ALWAYS_VISIBLE_COLUMN_COUNT = 7;

/**
 * 표 카드가 버티는 끝 (521) · 요약이 바닥 폭에 닿은 뒤로는 표가 여기까지 좁아지며
 * 나머지 판정 열을 옆으로 굴린다.
 */
export const TABLE_CARD_SCROLL_MIN_WIDTH =
  sum(COMPACT_COLUMN_PX.slice(0, ALWAYS_VISIBLE_COLUMN_COUNT)) + 2;

/**
 * 요약(사진 · 시세) 카드 폭 (테두리 포함) · px 는 요약이 쥐고 표는 남는 폭을 가져간다.
 *
 * 쥐는 쪽이 요약인 건 배송지시와 같은 까닭이다 — 사이드 메뉴를 펴면 줄어든 몫을 표가
 * 먼저 떠안아 열 사이 틈만 좁아지고, 사진은 그대로 남는다. 표가 바닥 폭에 닿은 뒤에야
 * 요약이 줄기 시작한다 (1728 화면에서 메뉴를 펴면 본문 1320 − 표 카드 828 − 눈금 8 = 484).
 *
 *  - 최소 480 · 요약은 여기서 멈추고, 그보다 좁은 창에서는 표가 좁아지며 옆으로 구른다.
 *    사진이 이보다 작아지면 곁눈질로 마블링이 읽히지 않는다 (끌어서 줄일 때도 같은 바닥)
 *  - 기본 560 · 메뉴를 접은 1728 화면에서 표가 열 사이 틈 ≈ 30px 로 서는 폭
 *  - 최대 760 · 노트북 한 화면에서 사진(4:3)이 높이 상한에 닿는 폭 · 더 넓히면 옆만 잘려 나간다
 */
export const SUMMARY_PANEL_MIN_WIDTH = 480;
export const SUMMARY_PANEL_DEFAULT_WIDTH = 560;
export const SUMMARY_PANEL_MAX_WIDTH = 760;

/** 두 카드 사이 틈 · 이 자리를 눈금(`RoomSplitter`)이 그대로 쓴다 (개체 상세 방과 같은 8px) */
export const SUMMARY_SPLITTER_WIDTH = 8;

/**
 * 표 카드와 요약을 나란히 세울 수 있는 본문 최소 폭 (1009) · 이보다 좁으면 요약을 숨긴다.
 * 요약을 바닥 폭 아래로 줄여 가며 붙들지 않는다 — 좁은 사진은 없느니만 못하다.
 */
export const SUMMARY_PANEL_MIN_ROOM =
  TABLE_CARD_SCROLL_MIN_WIDTH +
  SUMMARY_SPLITTER_WIDTH +
  SUMMARY_PANEL_MIN_WIDTH;

/** 표 카드 바닥 폭과 눈금을 뺀 나머지 · 요약이 커질 수 있는 끝 */
const SUMMARY_ROOM_OFFSET = TABLE_CARD_MIN_WIDTH + SUMMARY_SPLITTER_WIDTH;

/**
 * 그릴 요약 폭 (CSS 격자 칸) · 잡아 둔 폭을 줄 폭 안으로 깎는다 (`%` 는 두 카드를 담은 줄).
 *
 * 줄 폭을 재기 전 첫 그림부터 맞는 폭이 서도록 CSS 로 깎는다 — 재고 나서 고치면 한 박자
 * 동안 요약이 잡아 둔 폭으로 섰다가 줄어들며 표를 밀어낸다.
 */
export function summaryPanelWidthCss(storedWidth: number): string {
  return `clamp(${SUMMARY_PANEL_MIN_WIDTH}px, calc(100% - ${SUMMARY_ROOM_OFFSET}px), ${storedWidth}px)`;
}

/** 줄 폭 안에서 요약이 가질 수 있는 가장 큰 폭 · 끌어서 넓힐 때 여기서 멈춘다 */
export function maxSummaryPanelWidth(rowWidth: number): number {
  return Math.max(SUMMARY_PANEL_MIN_WIDTH, rowWidth - SUMMARY_ROOM_OFFSET);
}

/** 지금 그려진 요약 폭 · 잡아 둔 값이 예전 바닥(300)으로 남아 있어도 바닥 폭 아래로 그리지 않는다 */
export function shownSummaryPanelWidth(
  storedWidth: number,
  rowWidth: number,
): number {
  return Math.max(
    SUMMARY_PANEL_MIN_WIDTH,
    Math.min(storedWidth, maxSummaryPanelWidth(rowWidth)),
  );
}
