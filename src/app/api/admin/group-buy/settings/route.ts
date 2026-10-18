import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveAdmin } from '@/lib/resolve-auth';
import { getSettings, updateSettings } from '@/features/group-buy/server/settings';
import { supabase } from '@/features/group-buy/server/db';

export const dynamic = 'force-dynamic';

const schema = z.object({
  platformDealerId: z.string().uuid().nullable().optional(),
  deadlineOffsetMin: z.number().int().min(0).max(24 * 60).optional(),
});

/** GET: 플랫폼 설정 + 선택 가능한 중도매인 목록 */
export async function GET(request: NextRequest) {
  const admin = await resolveAdmin(request);
  if (!admin) return NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 });

  const [settings, { data: dealers }] = await Promise.all([
    getSettings(),
    supabase.from('dealers').select('id, dealer_no, name').eq('status', 'active').order('dealer_no'),
  ]);
  return NextResponse.json({
    ...settings,
    dealers: (dealers ?? []).map((d: { id: string; dealer_no: string; name: string }) => ({
      id: d.id,
      dealerNo: d.dealer_no,
      name: d.name,
    })),
  });
}

export async function PATCH(request: NextRequest) {
  const admin = await resolveAdmin(request);
  if (!admin) return NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '입력값이 올바르지 않습니다.' }, { status: 400 });

  const result = await updateSettings({ ...parsed.data, updatedBy: admin.name });
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json(await getSettings());
}
