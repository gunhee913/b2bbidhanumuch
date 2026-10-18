import { NextResponse } from 'next/server';
import { getStore } from '@/features/group-buy/server/stores';

export const dynamic = 'force-dynamic';

/** GET: 매장 하나 · slug 또는 id */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStore(slug);
  if (!store) return NextResponse.json({ error: '매장을 찾을 수 없습니다.' }, { status: 404 });
  return NextResponse.json(store);
}
