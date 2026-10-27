const NUMBER = new Intl.NumberFormat('ko-KR');

export const formatCount = (value: number, unit: string) => `${NUMBER.format(value)}${unit}`;

export const formatWon = (value: number) => `${NUMBER.format(Math.round(value))}원`;

export const formatPercent = (value: number, digits = 1) => `${value.toFixed(digits)}%`;

/** 차트 축 · 짧게 읽히는 금액 */
export const formatCompactWon = (value: number) => {
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}억`;
  if (value >= 10_000) return `${NUMBER.format(Math.round(value / 10_000))}만`;
  return NUMBER.format(value);
};

export const bidRateOf = (won: number, total: number) => (total > 0 ? (won / total) * 100 : 0);

/** 'yyyy-MM-dd' → 'M/d' */
export const shortDate = (iso: string) => {
  const [, month, day] = iso.split('-');
  return `${Number(month)}/${Number(day)}`;
};
