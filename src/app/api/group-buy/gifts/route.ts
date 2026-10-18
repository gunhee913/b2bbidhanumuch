import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveConsumer } from '@/lib/resolve-auth';
import { createGiftSet, listConsumerGiftSets } from '@/features/group-buy/server/gifts';
import type { CreateGiftSetInput } from '@/features/group-buy/types';

export const dynamic = 'force-dynamic';

const shippingSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(9),
  zipcode: z.string().optional().default(''),
  address: z.string().optional().default(''),
  addressDetail: z.string().optional().default(''),
  memo: z.string().optional(),
});

const schema = z.object({
  cellCount: z.union([z.literal(2), z.literal(3), z.literal(4), z.literal(6)]),
  quantity: z.number().int().min(1),
  cells: z
    .array(
      z
        .object({
          cellNo: z.number().int().min(1).max(6),
          productId: z.string().uuid().nullable().optional(),
          poolId: z.string().uuid().nullable().optional(),
          kg: z.number().int().min(0).max(99).optional(),
        })
        .refine((cell) => !!cell.productId || !!cell.poolId, { message: '칸마다 상품이 필요해요.' }),
    )
    .min(2)
    .max(6),
  supplies: z
    .array(
      z.object({
        cellNos: z.array(z.number().int().min(1).max(6)).min(1),
        bulks: z.array(z.object({ productId: z.string().uuid(), slotNos: z.array(z.number().int().min(1).max(12)).min(1) })),
        poolId: z.string().uuid().nullable().optional(),
        kg: z.number().int().min(0).max(99),
        leftoverMode: z.enum(['pack', 'separate']).optional(),
      }),
    )
    .optional(),
  recipientMode: z.enum(['batch', 'split']),
  recipients: z.array(z.object({ shipping: shippingSchema, message: z.string().optional() })).min(1),
  leftoverReceiveMethod: z.enum(['delivery', 'dine_in']),
  leftoverPickup: z.object({ storeId: z.string().uuid(), pickupAt: z.string().min(10) }).optional(),
  leftoverShipping: shippingSchema,
});

export async function GET(request: NextRequest) {
  const consumer = await resolveConsumer(request);
  if (!consumer) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  return NextResponse.json(await listConsumerGiftSets(consumer.consumerId));
}

export async function POST(request: NextRequest) {
  const consumer = await resolveConsumer(request);
  if (!consumer) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '입력값을 확인해주세요.' }, { status: 400 });

  const result = await createGiftSet(
    { id: consumer.consumerId, name: consumer.name, phone: consumer.phone },
    parsed.data as CreateGiftSetInput,
  );
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
  return NextResponse.json(result.gift, { status: 201 });
}
