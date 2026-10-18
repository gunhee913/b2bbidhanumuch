import { NextRequest, NextResponse } from 'next/server';
import { listConsumerProducts } from '@/features/group-buy/server/products';

export const dynamic = 'force-dynamic';

/** GET: 소비자용 공동구매 상품 목록 · 공개 상품만 · 경매 관련 필드 없음 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const products = await listConsumerProducts({
      partGroup: sp.get('partGroup') || undefined,
      grade: sp.get('grade') || undefined,
      slaughterHouse: sp.get('house') || undefined,
      status: sp.get('status') === 'all' ? 'all' : 'recruiting',
    });
    return NextResponse.json(products);
  } catch (error) {
    console.error('[group-buy] products list error:', error);
    return NextResponse.json({ error: '상품 목록을 불러오지 못했습니다.' }, { status: 500 });
  }
}
