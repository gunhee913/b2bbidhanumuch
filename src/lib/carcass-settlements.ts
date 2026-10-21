/**
 * 지육(枝肉) 경매 정산 — 농협 내부망 연동 자리.
 *
 * 부분육 낙찰대금은 우리 bids 테이블에서 나오지만, 지육 경락대금은 농협 지육 경매 시스템에서
 * 넘어와야 한다. 연동 전까지는 중도매인이 부분육을 낙찰받은 날 중 최근 며칠에 대해
 * 결정적(deterministic) 더미 정산을 만들어 돌려준다 → 새로고침해도 금액이 흔들리지 않는다.
 *
 * TODO(농협 연동): fetchCarcassSettlements 본문만 실제 조회로 바꾸면 된다.
 *   dealer-balances · dealer-transactions 두 API 가 모두 이 함수를 쓰므로 잔고와 내역이 같이 바뀐다.
 */

export interface CarcassSettlement {
  dealerId: string;
  /** 경매일 YYYY-MM-DD */
  date: string;
  /** 정산 시각 ISO */
  settledAt: string;
  headCount: number;
  amount: number;
}

/** 더미를 만들 최근 경매일 수 (중도매인별) */
const DUMMY_RECENT_DAYS = 3;

/** 문자열 → 0 이상 정수 해시 (FNV-1a 32bit) */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** [lo, hi] 사이 정수, step 단위로 반올림 */
function pick(seed: number, lo: number, hi: number, step = 1): number {
  const span = Math.floor((hi - lo) / step) + 1;
  return lo + (seed % span) * step;
}

function buildDummy(dealerId: string, date: string): CarcassSettlement {
  const h = hash(`${dealerId}|${date}`);
  // 지육 1두 ≈ 380~460kg × 15,500~19,500원/kg
  const headCount = 1;
  const weight = pick(h >>> 3, 380, 460, 5);
  const unitPrice = pick(h >>> 11, 15500, 19500, 100);
  const amount = weight * unitPrice * headCount;
  // 지육 경매는 오전에 끝나 오후에 정산이 넘어오는 흐름 → 17:40 KST 로 고정
  const settledAt = `${date}T17:40:00+09:00`;
  return { dealerId, date, settledAt, headCount, amount };
}

/**
 * 중도매인별 경매일 목록을 받아 지육 정산을 돌려준다.
 * - 경매일은 그 중도매인이 부분육을 낙찰받은 날들 (호출측이 bids 에서 뽑아 넘긴다)
 * - 최근 DUMMY_RECENT_DAYS 일만 더미로 만든다
 */
export async function fetchCarcassSettlements(
  datesByDealer: Record<string, Iterable<string>>,
): Promise<CarcassSettlement[]> {
  const out: CarcassSettlement[] = [];
  for (const [dealerId, dates] of Object.entries(datesByDealer)) {
    const recent = [...new Set([...dates].filter(Boolean))].sort().slice(-DUMMY_RECENT_DAYS);
    for (const date of recent) out.push(buildDummy(dealerId, date));
  }
  return out;
}

/** 거래 내역 한 줄로 쓸 설명문 · 「261021 지육 경락대금 (1두)」 */
export function carcassDescription(s: CarcassSettlement): string {
  const dateLabel = s.date.replace(/-/g, '').slice(2);
  return `${dateLabel} 지육 경락대금 (${s.headCount}두)`;
}
