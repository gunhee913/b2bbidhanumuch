import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveConsumer } from '@/lib/resolve-auth';
import { updateReservationPickup } from '@/features/group-buy/server/stores';
import type { PickupInput } from '@/features/group-buy/types';

export const dynamic = 'force-dynamic';

const schema = z.object({ storeId: z.string().uuid(), pickupAt: z.string().min(10) });

/** PATCH: 1kg 구매(모이는 중) 주문의 매장·픽업 시간 변경 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const consumer = await resolveConsumer(request);
  if (!consumer) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '매장과 픽업 시간을 확인해주세요.' }, { status: 400 });

  const { id } = await params;
  const result = await updateReservationPickup(id, consumer.consumerId, parsed.data as PickupInput);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
  return NextResponse.json({ ok: true });
}
