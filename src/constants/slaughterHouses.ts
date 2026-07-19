/**
 * 부분육 온라인경매를 운영하는 농협 공판장 마스터 상수.
 *
 * - 실시간 경매 필터, 상장등록 화면 등 여러 곳에서 동일한 정의를 공유하기 위해
 *   단일 소스로 관리한다.
 * - 순서는 지역/운영 우선순위 기준으로 유지한다.
 */
export const SLAUGHTER_HOUSES = [
  "농협 음성",
  "농협 부천",
  "농협 고령",
  "농협 나주",
] as const;

export type SlaughterHouse = (typeof SLAUGHTER_HOUSES)[number];
