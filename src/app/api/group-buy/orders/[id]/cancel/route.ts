import { NextRequest, NextResponse } from 'next/server';
import { resolveConsumer } from '@/lib/resolve-auth';
import { cancelOrder } from '@/features/group-buy/server/orders';

/** POST: 소비자 본인 취소 · 모집중일 때만 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const consumer = await resolveConsumer(request);
  if (!consumer) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { id } = await params;
  const result = await cancelOrder(id, consumer.consumerId);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
  return NextResponse.json({ ok: true, message: '참여가 취소되고 결제 금액이 환불되었습니다.' });
}
