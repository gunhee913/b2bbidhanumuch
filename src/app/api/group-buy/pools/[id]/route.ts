import { NextRequest, NextResponse } from 'next/server';
import { getConsumerPool } from '@/features/group-buy/server/pools';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const pool = await getConsumerPool(id);
    if (!pool) return NextResponse.json({ error: '찾을 수 없습니다.' }, { status: 404 });
    return NextResponse.json(pool);
  } catch (error) {
    console.error('[group-buy] pool detail error:', error);
    return NextResponse.json({ error: '불러오지 못했습니다.' }, { status: 500 });
  }
}
