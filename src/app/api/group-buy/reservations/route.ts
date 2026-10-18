import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveConsumer } from '@/lib/resolve-auth';
import { createReservation, listConsumerReservations } from '@/features/group-buy/server/pools';
import type { CreateReservationInput } from '@/features/group-buy/types';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  poolId: z.string().uuid(),
  kg: z.number().int().min(1).max(100),
  trimAndSlice: z.boolean().optional().default(false),
  receiveMethod: z.enum(['delivery', 'dine_in']).optional().default('delivery'),
  // 매장 수령일 때 필수 · 매장·시간 규칙 검증은 서버 생성 함수가 한다
  pickup: z.object({ storeId: z.string().uuid(), pickupAt: z.string().min(10) }).optional(),
  // 주소는 매장 수령이면 비어도 된다 · 택배 여부에 따른 검사는 createReservation 이 한다
  shipping: z.object({
    name: z.string().min(1),
    phone: z.string().min(9),
    zipcode: z.string().optional().default(''),
    address: z.string().optional().default(''),
    addressDetail: z.string().optional().default(''),
    memo: z.string().optional(),
  }),
});

/** GET: 내 kg 예약 목록 */
export async function GET(request: NextRequest) {
  const consumer = await resolveConsumer(request);
  if (!consumer) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  try {
    return NextResponse.json(await listConsumerReservations(consumer.consumerId));
  } catch (error) {
    console.error('[group-buy] reservations list error:', error);
    return NextResponse.json({ error: '예약 내역을 불러오지 못했습니다.' }, { status: 500 });
  }
}

/** POST: kg 참여 생성 · kg × 단가 결제 → 즉시 매칭 시도 */
export async function POST(request: NextRequest) {
  const consumer = await resolveConsumer(request);
  if (!consumer) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: '입력값이 올바르지 않습니다.', issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await createReservation(
      { id: consumer.consumerId, name: consumer.name, phone: consumer.phone },
      parsed.data as CreateReservationInput,
    );
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    return NextResponse.json({ reservation: result.reservation, matched: result.matched ?? false }, { status: 201 });
  } catch (error) {
    console.error('[group-buy] reservation create error:', error);
    return NextResponse.json({ error: '예약 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
