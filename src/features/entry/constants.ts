import { SLAUGHTER_HOUSES, type SlaughterHouse } from "@/constants/slaughterHouses";

/**
 * 진입 화면(공판장 선택 · 로그인)에서 쓰는 공판장 표시 정보.
 * URL 에는 짧은 키(`?house=음성`)를, 데이터 조회에는 마스터 상수(`농협 음성`)를 쓴다.
 */
export interface HouseMeta {
  /** 마스터 상수 값 · 상장 데이터의 `slaughter_house` 와 동일 */
  name: SlaughterHouse;
  /** URL · 표시용 짧은 키 */
  key: string;
  /** 정식 명칭 */
  fullName: string;
  region: string;
  /** 선택 카드용 소프트 3D 건물 아이콘 (public 경로) */
  icon: string;
}

export const HOUSE_META: readonly HouseMeta[] = [
  { name: "농협 음성", key: "음성", fullName: "음성축산물공판장", region: "충북", icon: "/entry/house-eumseong.png" },
  { name: "농협 부천", key: "부천", fullName: "부천축산물공판장", region: "경기", icon: "/entry/house-bucheon.png" },
  { name: "농협 고령", key: "고령", fullName: "고령축산물공판장", region: "경북", icon: "/entry/house-goryeong.png" },
  { name: "농협 나주", key: "나주", fullName: "나주축산물공판장", region: "전남", icon: "/entry/house-naju.png" },
];

export const HOUSE_QUERY_KEY = "house";
export const HOUSE_STORAGE_KEY = "auction:house";

export function findHouseByKey(key: string | null | undefined): HouseMeta | null {
  if (!key) return null;
  return HOUSE_META.find((h) => h.key === key || h.name === key) ?? null;
}

/** 마스터 순서 보장 · 상수가 바뀌어도 메타가 빠지지 않도록 개발 시 확인용 */
export const HOUSE_META_COMPLETE = SLAUGHTER_HOUSES.every((name) =>
  HOUSE_META.some((h) => h.name === name),
);
