import { NextRequest, NextResponse } from 'next/server';
import { resolveConsumer } from '@/lib/resolve-auth';
import { cancelGiftSet } from '@/features/group-buy/server/gifts';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const consumer = await resolveConsumer(request);
  if (!consumer) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const { id } = await params;
  const result = await cancelGiftSet(id, consumer.consumerId);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
  return NextResponse.json({ ok: true, message: '선물세트가 취소되고 결제 금액이 환불되었습니다.' });
}
