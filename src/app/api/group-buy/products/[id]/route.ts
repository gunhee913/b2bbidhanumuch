import { NextRequest, NextResponse } from 'next/server';
import { getConsumerProduct } from '@/features/group-buy/server/products';

export const dynamic = 'force-dynamic';

/** GET: 소비자용 상품 상세 + 같은 개체의 다른 부위 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await getConsumerProduct(id);
    if (!result) return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[group-buy] product detail error:', error);
    return NextResponse.json({ error: '상품 정보를 불러오지 못했습니다.' }, { status: 500 });
  }
}
