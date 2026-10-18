import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveAdmin } from '@/lib/resolve-auth';
import { listAdminPools, upsertPool } from '@/features/group-buy/server/pools';
import type { UpsertPoolInput } from '@/features/group-buy/types';

export const dynamic = 'force-dynamic';

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  partGroup: z.string().min(1),
  gradeKey: z.string().regex(/^(1\+\+[789]?|1\+|1|2|3)$/),
  pricePerKg: z.number().int().positive(),
  bidPriceCap: z.number().int().positive().nullable(),
  referenceRetailPricePerKg: z.number().int().positive().nullable(),
  targetKg: z.number().positive(),
  minKg: z.number().int().min(1),
  maxKg: z.number().int().min(1),
  reservationTtlDays: z.number().int().min(1).max(90),
  status: z.enum(['open', 'paused']),
});

export async function GET(request: NextRequest) {
  const admin = await resolveAdmin(request);
  if (!admin) return NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 });
  try {
    return NextResponse.json(await listAdminPools());
  } catch (error) {
    console.error('[group-buy] admin pools error:', error);
    return NextResponse.json({ error: '목록을 불러오지 못했습니다.' }, { status: 500 });
  }
}

/** PUT: 풀 생성/수정 · (부위, 등급키) 가 같으면 덮어쓴다 */
export async function PUT(request: NextRequest) {
  const admin = await resolveAdmin(request);
  if (!admin) return NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 });

  const parsed = upsertSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '입력값이 올바르지 않습니다.', issues: parsed.error.flatten() }, { status: 400 });

  const result = await upsertPool(parsed.data as UpsertPoolInput, admin.name);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 500 });
  return NextResponse.json({ ok: true });
}
