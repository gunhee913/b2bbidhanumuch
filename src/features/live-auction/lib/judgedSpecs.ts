/**
 * 판정사가 매긴 일곱 값 · 이름만 맞으면 어느 화면의 자료형이든 넘길 수 있다.
 *
 * 처음엔 `(l: LiveListing) => ...` 꼴로 읽어 갔는데, 그러면 경매장 자료형을 들고 있는
 * 화면만 쓸 수 있다. 배송지시는 낙찰 부위(`WinningPart`)를 들고 있고 거기선 근내지방이
 * `marbling` 이라, 이름표만 맞춰 주면 되도록 열쇠로 바꿨다.
 */
export interface JudgedSpecValues {
  marblingScore: number | string | null | undefined;
  meatColor: number | string | null | undefined;
  fatColor: number | string | null | undefined;
  texture: number | string | null | undefined;
  maturity: number | string | null | undefined;
  backFat: number | string | null | undefined;
  eyeMuscle: number | string | null | undefined;
}

/**
 * 등급판정 일곱 · 판정사가 이 단면을 보고 매긴 값들.
 *
 * 차례는 품질정보 띠를 그대로 따른다. 거기서도 이 일곱은 붙여 두는데, 하나씩 보는
 * 값이 아니라 한 덩어리로 훑는 값이라 사이에 다른 것이 끼면 경계가 사라지기 때문이다.
 *
 * 사진 위 각인(`GradeStamp`) · 상장표 요약(`SheetSummaryPanel`) · 배송지시 왼쪽 판이
 * 함께 쓴다 — 어느 쪽에서 보든 같은 일곱이 같은 차례로 서 있어야 화면을 오갈 때 눈이
 * 다시 읽지 않는다.
 */
export const JUDGED_SPECS: ReadonlyArray<{
  label: string;
  key: keyof JudgedSpecValues;
  unit?: string;
}> = [
  { label: "근내지방", key: "marblingScore" },
  { label: "육색", key: "meatColor" },
  { label: "지방색", key: "fatColor" },
  { label: "조직도", key: "texture" },
  { label: "성숙도", key: "maturity" },
  { label: "등지방두께", key: "backFat", unit: "mm" },
  { label: "등심면적", key: "eyeMuscle", unit: "㎠" },
];

/** 적히지 않은 값인가 · 빈 문자열까지 센다 (낡은 자료에 `""` 가 섞여 있다) */
export function isSpecEmpty(value: JudgedSpecValues[keyof JudgedSpecValues]) {
  return value === null || value === undefined || value === "";
}
