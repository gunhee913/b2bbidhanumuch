import { chunk } from 'es-toolkit';
import { getAdminClient } from '@/lib/supabase-admin';

/**
 * `.in()` 한 번에 넣는 id 수 · PostgREST 는 조건을 URL 에 싣는다.
 * UUID 수백 개면 URL 이 한계를 넘어 400 이 나고, 그 오류를 삼키면 모든 낙찰이
 * 「상장일 없음」 으로 뭉친다.
 */
const IN_CHUNK_SIZE = 200;
/** PostgREST 기본 max-rows · 이 수를 넘는 결과는 말없이 잘린다 */
const PAGE_SIZE = 1000;

/** 큰 id 목록을 `.in()` 으로 조회 · 묶음으로 나눠 부르고 합친다 */
export async function selectIn<T>(
  table: string,
  columns: string,
  column: string,
  values: string[],
): Promise<T[]> {
  const supabase = getAdminClient();
  const pages = await Promise.all(
    chunk(values, IN_CHUNK_SIZE).map(async (ids) => {
      const { data, error } = await supabase.from(table).select(columns).in(column, ids);
      if (error) throw new Error(`${table} 조회 실패: ${error.message}`);
      return (data || []) as T[];
    }),
  );
  return pages.flat();
}

export interface WinningBidRow {
  id: string;
  part_id: string;
  dealer_id: string;
  bid_amount: number | string;
  created_at: string;
}

/**
 * 낙찰 입찰 전부 · 쪽을 넘기며 끝까지 읽는다.
 *
 * 잔액(`/api/dealer-balances`)과 거래내역(`/api/dealer-transactions`)이 반드시 이 함수로
 * 읽어야 두 화면의 낙찰대금이 맞는다. 한쪽만 1000줄에서 잘리면 그 중도매인의 잔고가
 * 잘린 만큼 많게 나온다.
 */
export async function fetchWinningBids(dealerId: string | null = null): Promise<WinningBidRow[]> {
  const supabase = getAdminClient();
  const rows: WinningBidRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase
      .from('bids')
      .select('id, part_id, dealer_id, bid_amount, created_at')
      .eq('is_winning', true)
      .not('bid_amount', 'is', null)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (dealerId) query = query.eq('dealer_id', dealerId);
    const { data, error } = await query;
    if (error) throw new Error(`bids 조회 실패: ${error.message}`);
    rows.push(...((data || []) as WinningBidRow[]));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}
