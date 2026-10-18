import { NextRequest, NextResponse } from 'next/server';
import { resolveAdmin } from '@/lib/resolve-auth';
import { expireRecruitingProducts } from '@/features/group-buy/server/settle';
import { expireReservations, matchAllPools } from '@/features/group-buy/server/pools';

export const dynamic = 'force-dynamic';

/**
 * GET: 모집 마감이 지난 상품을 미달 취소 + 환불.
 * Vercel Cron(Authorization: Bearer CRON_SECRET) 또는 관리자 세션으로 호출.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const isCron = !!secret && bearer === secret;
  const admin = isCron ? null : await resolveAdmin(request);

  if (!isCron && !admin) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });

  const by = admin?.name ?? 'cron';
  const now = new Date();
  const [products, reservations, matched] = await Promise.all([
    expireRecruitingProducts(now, by),
    expireReservations(now, by),
    matchAllPools(by),
  ]);
  return NextResponse.json({ ...products, reservationsExpired: reservations.expired, poolsMatched: matched.matched });
}
