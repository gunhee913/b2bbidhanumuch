import { NextRequest, NextResponse } from 'next/server';
import { getStore, getStoreSlots } from '@/features/group-buy/server/stores';

export const dynamic = 'force-dynamic';

/** GET ?date=YYYY-MM-DD: 그날 픽업 슬롯과 잔여 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const date = request.nextUrl.searchParams.get('date') ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: '날짜 형식이 올바르지 않습니다.' }, { status: 400 });
  const store = await getStore(slug);
  if (!store) return NextResponse.json({ error: '매장을 찾을 수 없습니다.' }, { status: 404 });
  return NextResponse.json(await getStoreSlots(store, date));
}
