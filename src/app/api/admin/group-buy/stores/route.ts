import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveAdmin } from '@/lib/resolve-auth';
import { listStores, upsertStore } from '@/features/group-buy/server/stores';
import type { UpsertStoreInput } from '@/features/group-buy/types';

export const dynamic = 'force-dynamic';

const TIME_RE = /^\d{2}:\d{2}$/;
const storeSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/, 'slug 는 영문 소문자·숫자·하이픈만'),
  name: z.string().min(1).max(60),
  zipcode: z.string().max(10).optional(),
  address: z.string().min(1).max(200),
  addressDetail: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  lat: z.number().min(33).max(39),
  lng: z.number().min(124).max(132),
  openTime: z.string().regex(TIME_RE),
  closeTime: z.string().regex(TIME_RE),
  closedWeekdays: z.array(z.number().int().min(0).max(6)).max(7),
  slotMinutes: z.number().int().min(10).max(120),
  slotCapacity: z.number().int().min(1).max(100),
  description: z.string().max(1000).optional(),
  directions: z.string().max(300).optional(),
  parking: z.string().max(300).optional(),
  imageUrl: z.string().url().nullable().optional().or(z.literal('')),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
});

/** GET: 매장 전체(비활성 포함) */
export async function GET(request: NextRequest) {
  const admin = await resolveAdmin(request);
  if (!admin) return NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 });
  return NextResponse.json(await listStores(true));
}

/** POST: 매장 생성·수정 (id 있으면 수정) */
export async function POST(request: NextRequest) {
  const admin = await resolveAdmin(request);
  if (!admin) return NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 });
  const parsed = storeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? '입력값을 확인해주세요.' }, { status: 400 });
  if (parsed.data.openTime >= parsed.data.closeTime) return NextResponse.json({ error: '마감 시각은 오픈 시각보다 늦어야 합니다.' }, { status: 400 });

  const result = await upsertStore({ ...(parsed.data as UpsertStoreInput), imageUrl: parsed.data.imageUrl || null });
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result.store);
}
