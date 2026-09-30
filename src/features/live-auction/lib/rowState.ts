import { cn } from "@/lib/utils";

/** 마감 후 내 결과 · won(내가 낙찰) · lost(입찰했으나 밀림) · noBid(참여 안 함) */
export type SettlementCase = "won" | "lost" | "noBid";

export function getSettlementCase(
  myBid: { isWinning?: boolean } | null,
): SettlementCase {
  if (myBid?.isWinning) return "won";
  if (myBid) return "lost";
  return "noBid";
}

export interface RowStateInput {
  isSettled: boolean;
  settlementCase: SettlementCase;
  /** 진행 중 · 내 입찰 존재 */
  hasMyBid: boolean;
  isSelected: boolean;
  bulkMode?: boolean;
  bulkChecked?: boolean;
}

/**
 * 경매 테이블 행 배경 · "상태" 와 "위치" 를 색 계열로 분리.
 *
 *  - 마감 행은 옅은 slate-50 판 위로 가라앉는다 · 입찰 중인 흰 행과 "끝난 행" 을 묶음으로 가른다.
 *  - 선택 · 일괄 체크는 한 단계 더 진한 slate-100.
 *  - 낙찰 행은 흐리게 물리지 않는다. 팔린 부위가 오히려 가장 먼저 찾는 정보라
 *    배경은 진행 행과 같게 두고, 결과 열의 칩이 표시를 맡는다.
 *
 * 상장표 · 상세 화면의 부위 미니표 공용.
 */
export function getRowBgClass({
  isSettled,
  isSelected,
  bulkMode = false,
  bulkChecked = false,
}: RowStateInput): string {
  if (isSelected || (!isSettled && bulkMode && bulkChecked)) {
    return "bg-surface-accent hover:bg-surface-accent";
  }
  if (isSettled) return "bg-surface-muted hover:bg-surface-accent";
  return "bg-surface hover:bg-surface-muted";
}

/*
 * 좌측 accent bar 는 두지 않는다.
 *
 * 한때 내 행 왼쪽에 3px 먹색 바를 그었는데, 다크에서 `bg-inverse` 는 거의 순백이라
 * 스무 행 중 열넷에 순백 막대가 서서 표에서 가장 밝은 것이 데이터가 아니라 여백의
 * 장식이 됐다. 게다가 「내가 가져갔다」 는 이미 세 번 적혀 있다 — 내 입찰가에 값이
 * 있고, 결과 열에 「내 낙찰」 칩이 있고, 낙찰자 열에 내 번호가 있다.
 *
 * 바가 있었던 건 한동안 결과 칩을 칠하지 않고 굵은 글자로만 뒀기 때문이다. 칩이
 * 색을 되찾은 뒤로는 자리를 대신 맡아 줄 것이 없어 중복만 남았다.
 */
