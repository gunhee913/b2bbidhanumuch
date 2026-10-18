import { NextRequest, NextResponse } from 'next/server';
import { resolveAdmin } from '@/lib/resolve-auth';
import { unpublishProduct } from '@/features/group-buy/server/products';

/** POST: recruiting → draft · 참여자가 없을 때만 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await resolveAdmin(request);
  if (!admin) return NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 });

  const { id } = await params;
  const result = await unpublishProduct(id, admin.name);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
  return NextResponse.json({ ok: true });
}
