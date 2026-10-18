import { NextRequest, NextResponse } from 'next/server';
import { resolveConsumer } from '@/lib/resolve-auth';
import { getConsumerGiftSet } from '@/features/group-buy/server/gifts';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const consumer = await resolveConsumer(request);
  if (!consumer) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const { id } = await params;
  const gift = await getConsumerGiftSet(id, consumer.consumerId);
  if (!gift) return NextResponse.json({ error: '선물세트를 찾을 수 없습니다.' }, { status: 404 });
  return NextResponse.json(gift);
}
