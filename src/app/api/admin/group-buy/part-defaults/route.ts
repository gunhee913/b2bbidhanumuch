import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveAdmin } from '@/lib/resolve-auth';
import { listPartDefaults, upsertPartDefault } from '@/features/group-buy/server/products';
import { getPartGroupOrder } from '@/features/live-auction/lib/partGrouping';

export const dynamic = 'force-dynamic';

const schema = z.object({
  partGroup: z.string().min(1),
  slotCount: z.number().int().min(1).max(100).nullable(),
  pricePerKg: z.number().int().positive().nullable(),
  referenceRetailPricePerKg: z.number().int().positive().nullable(),
  bidPriceCap: z.number().int().positive().nullable(),
  positional: z.boolean(),
});

/** GET: 대분류별 기본값 · 모든 대분류를 순서대로, 없는 건 빈 값 */
export async function GET(request: NextRequest) {
  const admin = await resolveAdmin(request);
  if (!admin) return NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 });

  const saved = await listPartDefaults();
  const map = new Map(saved.map((d) => [d.partGroup, d]));
  const rows = getPartGroupOrder().map(
    (group) =>
      map.get(group) ?? {
        partGroup: group,
        slotCount: null,
        pricePerKg: null,
        referenceRetailPricePerKg: null,
        bidPriceCap: null,
        positional: true,
      },
  );
  return NextResponse.json(rows);
}

/** PUT: 한 대분류의 기본값 저장 */
export async function PUT(request: NextRequest) {
  const admin = await resolveAdmin(request);
  if (!admin) return NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '입력값이 올바르지 않습니다.' }, { status: 400 });

  const result = await upsertPartDefault({
    ...(parsed.data as Required<z.infer<typeof schema>>),
    updatedBy: admin.name,
  });
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
