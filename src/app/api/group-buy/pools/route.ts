import { NextRequest, NextResponse } from 'next/server';
import { listConsumerPools } from '@/features/group-buy/server/pools';

export const dynamic = 'force-dynamic';

/** GET: kg 수요 풀 목록 · ?partGroup=등심&grade=1++ */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  try {
    const pools = await listConsumerPools({
      partGroup: searchParams.get('partGroup') ?? undefined,
      grade: searchParams.get('grade') ?? undefined,
    });
    return NextResponse.json(pools);
  } catch (error) {
    console.error('[group-buy] pools list error:', error);
    return NextResponse.json({ error: '목록을 불러오지 못했습니다.' }, { status: 500 });
  }
}
