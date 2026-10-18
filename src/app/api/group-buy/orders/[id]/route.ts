import { NextRequest, NextResponse } from 'next/server';
import { resolveConsumer } from '@/lib/resolve-auth';
import { getConsumerOrder } from '@/features/group-buy/server/orders';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const consumer = await resolveConsumer(request);
  if (!consumer) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { id } = await params;
  const order = await getConsumerOrder(id, consumer.consumerId);
  if (!order) return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 });
  return NextResponse.json(order);
}
