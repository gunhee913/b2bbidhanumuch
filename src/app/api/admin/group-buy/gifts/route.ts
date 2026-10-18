import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveAdmin } from '@/lib/resolve-auth';
import { getGiftSettings, listAdminGiftSets, updateGiftSettings } from '@/features/group-buy/server/gifts';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const admin = await resolveAdmin(request);
  if (!admin) return NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 });
  const [settings, gifts] = await Promise.all([getGiftSettings(), listAdminGiftSets()]);
  return NextResponse.json({ ...settings, gifts });
}

export async function PATCH(request: NextRequest) {
  const admin = await resolveAdmin(request);
  if (!admin) return NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 });
  const parsed = z.object({ packagingFee: z.number().int().min(0).max(200_000) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '포장비를 확인해주세요.' }, { status: 400 });
  const result = await updateGiftSettings(parsed.data.packagingFee);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(await getGiftSettings());
}
