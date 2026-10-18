import { NextRequest, NextResponse } from 'next/server';
import { resolveAdmin } from '@/lib/resolve-auth';
import { expireReservations, matchAllPools } from '@/features/group-buy/server/pools';

export const dynamic = 'force-dynamic';

/** POST: 만료 예약 정리 후 열린 풀 전부 매칭 시도 · 관리자 버튼 */
export async function POST(request: NextRequest) {
  const admin = await resolveAdmin(request);
  if (!admin) return NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 });

  const expired = await expireReservations(new Date(), admin.name);
  const matched = await matchAllPools(admin.name);
  return NextResponse.json({ expired: expired.expired, matched: matched.matched });
}
