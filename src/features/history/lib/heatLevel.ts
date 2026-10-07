/**
 * 캘린더 칸 히트맵 · 다섯 단.
 *
 * 단계는 `inverse` 한 색의 투명도 사다리로만 만든다. slate-300/500 처럼 팔레트를 박아
 * 두면 라이트에서만 「바탕에서 멀어지는」 방향이 맞고 다크에서는 거꾸로 밝은 회색
 * 덩어리가 떠서 적게 먹은 날이 더 눈에 띄었다. `inverse` 는 두 모드에서 바탕의
 * 반대편이라 어느 쪽이든 짙어지는 방향이 같다 — 라이트는 흰→검정, 다크는 검정→흰.
 *
 * **사다리는 25% 에서 멈춘다.** 전에는 10 → 25 → 75 → 100 으로 뛰어 위 두 단이
 * 먹색 덩어리가 됐다. 그러면 칸 안 글자를 뒤집어야 하고(`text-inverse-content`),
 * 한 달 판에 흰 칸·연회색 칸·검은 칸이 섞여 달력이 체크무늬처럼 얼룩덜룩해진다 —
 * 많이 먹은 날을 짚으려고 켠 색이 정작 달 전체의 흐름을 못 읽게 만든다.
 *
 * 25% 를 천장으로 두면 어느 단에서도 같은 글자색이 4.5 를 넘겨 글자를 뒤집을 일이
 * 없고, 칸들은 한 색의 농담으로만 갈려 판이 조용해진다. 네 단의 간격을 고르게
 * 둔 덕에 단 수를 줄이지 않고도 「짙을수록 많이 먹은 날」 은 그대로 읽힌다.
 *
 * 경매내역 캘린더(`HistoryCalendar`)와 경매통계 캘린더(`StatsCalendar`)가 같이 쓴다.
 * 칸 크기는 400px 레일과 1100px 한 열로 갈리지만 「짙을수록 많이 먹은 날」 이라는
 * 약속은 하나여야 한다 — 두 벌로 두면 한쪽만 고쳐져 같은 색이 다른 뜻이 된다.
 */
export type HeatLevel = 0 | 1 | 2 | 3 | 4;

export const HEAT_STYLE: Record<HeatLevel, { bg: string; hover: string }> = {
  0: { bg: "bg-surface", hover: "hover:bg-surface-muted" },
  1: { bg: "bg-inverse/[0.05]", hover: "hover:bg-inverse/[0.09]" },
  2: { bg: "bg-inverse/[0.11]", hover: "hover:bg-inverse/[0.15]" },
  3: { bg: "bg-inverse/[0.18]", hover: "hover:bg-inverse/[0.22]" },
  4: { bg: "bg-inverse/[0.25]", hover: "hover:bg-inverse/[0.29]" },
};

/** 이 달 최대 낙찰금액 대비 비율을 0~4 단으로 민다 */
export function computeHeatLevel(amount: number, monthMax: number): HeatLevel {
  if (amount <= 0 || monthMax <= 0) return 0;
  const ratio = amount / monthMax;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}
