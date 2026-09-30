/**
 * `/api/bids/bulk` 응답 · 건별로 성공/실패가 갈린다.
 * 20건을 한 번에 올려도 최저단가 미달·마감처럼 그 건만의 사정이 있어
 * 전체를 하나의 성패로 접지 않고 건마다 사유를 돌려받는다.
 */

export interface BulkBidFailure {
  partId: string;
  reason:
    | "not_found"
    | "not_included"
    | "invalid_status"
    | "no_open_round"
    | "closed"
    | "below_min"
    | "settled"
    | "invalid"
    | "db_error";
  message: string;
}

export interface BulkBidSuccess {
  partId: string;
  bidId: string;
  isUpdate: boolean;
}

export interface BulkBidResponse {
  successful: BulkBidSuccess[];
  failed: BulkBidFailure[];
}
