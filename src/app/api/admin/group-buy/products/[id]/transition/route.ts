import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveAdmin } from '@/lib/resolve-auth';
import { forceTransition } from '@/features/group-buy/server/settle';

const schema = z.object({
  to: z.enum(['recruiting', 'full', 'bidding', 'won', 'lost', 'cancelled', 'processing', 'shipped', 'completed']),
  note: z.string().max(200).optional(),
});

/** POST: 관리자 강제 상태 전이 · lost/cancelled 는 환불 포함 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await resolveAdmin(request);
  if (!admin) return NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '입력값이 올바르지 않습니다.' }, { status: 400 });

  const { id } = await params;
  const result = await forceTransition(id, parsed.data.to, admin.name, parsed.data.note);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
  return NextResponse.json({ ok: true });
}
