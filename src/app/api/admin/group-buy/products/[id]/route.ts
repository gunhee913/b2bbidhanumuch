import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveAdmin } from '@/lib/resolve-auth';
import { getAdminProductDetail, updateProductSettings } from '@/features/group-buy/server/products';

export const dynamic = 'force-dynamic';

const nullablePositiveInt = z.number().int().positive().nullable().optional();

const settingsSchema = z.object({
  slotCount: z.number().int().min(1).max(100).nullable().optional(),
  pricePerKg: nullablePositiveInt,
  referenceRetailPrice: nullablePositiveInt,
  positional: z.boolean().optional(),
  bidPriceCap: nullablePositiveInt,
  recruitDeadline: z.string().datetime({ offset: true }).nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await resolveAdmin(request);
  if (!admin) return NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 });

  const { id } = await params;
  const detail = await getAdminProductDetail(id);
  if (!detail) return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 });
  return NextResponse.json(detail);
}

/** PATCH: 판매 조건 저장 (분할 수 · 단가 · 참고가 · 위치 선택 · 응찰 상한 · 마감) */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await resolveAdmin(request);
  if (!admin) return NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 });

  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: '입력값이 올바르지 않습니다.', issues: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const result = await updateProductSettings(id, parsed.data, admin.name);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
  return NextResponse.json(result.product);
}
