import type { DealerAccountType } from '../types';

/** 거래 구분·총 한도 입력 검사 · 틀리면 오류 문구, 맞으면 null */
export function validateAccount(accountType: unknown, creditLimit: unknown): string | null {
  if (accountType !== undefined && accountType !== 'prepaid' && accountType !== 'credit') {
    return '거래 구분은 선수 또는 외상이어야 합니다.';
  }
  if (creditLimit !== undefined && creditLimit !== null && creditLimit !== '') {
    const n = Number(creditLimit);
    if (!Number.isFinite(n) || n < 0) return '총 한도는 0 이상의 숫자여야 합니다.';
  }
  return null;
}

/** 저장할 한도 · 선수는 늘 0, 외상만 입력값 */
export function normalizeCreditLimit(accountType: DealerAccountType | undefined, creditLimit: unknown): number {
  if (accountType !== 'credit') return 0;
  const n = Number(creditLimit || 0);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}
