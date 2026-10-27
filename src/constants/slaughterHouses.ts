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

export const DEFAULT_SLAUGHTER_HOUSE: SlaughterHouse = SLAUGHTER_HOUSES[0];

/** 사람에게 보여 줄 이름 · 「농협 음성」 → 「농협 음성공판장」 (이미 공판장으로 끝나면 그대로) */
export const slaughterHouseLabel = (name: string) => (!name || name.endsWith("공판장") ? name : `${name}공판장`);

/** 드롭다운 선택지 · 값은 마스터 문자열, 글자는 공판장 이름 */
export const SLAUGHTER_HOUSE_OPTIONS = SLAUGHTER_HOUSES.map((name) => ({ value: name, label: slaughterHouseLabel(name) }));

/**
 * 손으로 적은 도축장 이름을 마스터 값으로 · 「음성」 「농협 음성공판장」 「음성축산물공판장」 전부 「농협 음성」.
 * 못 알아보면 null 을 돌려주고 부르는 쪽이 기본값을 정한다.
 */
export const normalizeSlaughterHouse = (raw: string): SlaughterHouse | null => {
  const compact = raw.replace(/\s/g, "");
  if (!compact) return null;
  return SLAUGHTER_HOUSES.find((name) => compact.includes(name.replace(/^농협\s*/, ""))) ?? null;
};
