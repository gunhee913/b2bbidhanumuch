/**
 * 회차 예정 시간표 · 공판장·일자별로 관리자가 등록하는 계획 시간.
 * 실 실행 이력(auctions) 과 분리된 별도 도메인.
 */
export interface RoundSchedule {
  id: string;
  slaughterHouse: string;
  auctionDate: string;
  roundNo: number;
  plannedStart: string;
  plannedEnd: string;
  note: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface RoundScheduleUpsertItem {
  roundNo: number;
  plannedStart: string;
  plannedEnd: string;
  note?: string | null;
}

export interface RoundSchedulesResponse {
  slaughterHouse: string;
  auctionDate: string;
  schedules: RoundSchedule[];
}
