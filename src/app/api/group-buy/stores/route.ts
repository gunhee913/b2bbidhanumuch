import { NextResponse } from 'next/server';
import { listStores } from '@/features/group-buy/server/stores';

export const dynamic = 'force-dynamic';

/** GET: 매장 수령 가능한 매장 목록 · 공개 */
export async function GET() {
  const stores = await listStores();
  return NextResponse.json(stores, { headers: { 'Cache-Control': 'public, max-age=60' } });
}
