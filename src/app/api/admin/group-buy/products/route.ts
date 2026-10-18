import { NextRequest, NextResponse } from 'next/server';
import { resolveAdmin } from '@/lib/resolve-auth';
import { listAdminProducts } from '@/features/group-buy/server/products';
import type { GroupBuyStatus } from '@/features/group-buy/types';

export const dynamic = 'force-dynamic';

/** GET: 관리자 상품 목록 · draft 포함 · 내부 상태 그대로 */
export async function GET(request: NextRequest) {
  const admin = await resolveAdmin(request);
  if (!admin) return NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 });

  try {
    const sp = request.nextUrl.searchParams;
    const status = (sp.get('status') || 'all') as GroupBuyStatus | 'all';
    const products = await listAdminProducts({ status, listingDate: sp.get('date') || undefined });
    return NextResponse.json(products);
  } catch (error) {
    console.error('[group-buy] admin products error:', error);
    return NextResponse.json({ error: '상품 목록을 불러오지 못했습니다.' }, { status: 500 });
  }
}
