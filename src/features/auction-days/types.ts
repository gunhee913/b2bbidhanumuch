/**
 * 경매일 상태.
 * - `open`   · 관리자가 개장으로 선언
 * - `closed` · 관리자가 휴장으로 선언 (사유는 `note`)
 * - `unset`  · 아직 정해지지 않음 (행 없음)
 *
 * `closed` 와 `unset` 을 나누는 게 이 도메인의 핵심이다. 둘을 뭉뚱그리면 달력에서
 * "쉬는 날" 과 "아직 안 정한 날" 이 똑같이 빈칸으로 보여, 미리 일정을 잡을 수가 없다.
 */
export type AuctionDayStatus = "open" | "closed" | "unset";

export interface AuctionDay {
  date: string;
  status: AuctionDayStatus;
  note: string | null;
  /** 그날 등록된 회차 수 · 개장인데 0 이면 시간표가 비어 있다는 뜻 */
  roundCount: number;
  /** 그날 실제 상장 두수 · 아직 안 올렸으면 0 */
  totalListings: number;
}

export interface AuctionCalendarMonth {
  /** yyyy-MM */
  month: string;
  slaughterHouse: string | null;
  days: AuctionDay[];
}

export interface AuctionDayUpsertItem {
  date: string;
  isOpen: boolean;
  note?: string | null;
}
