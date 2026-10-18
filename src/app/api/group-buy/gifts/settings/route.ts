import { NextResponse } from 'next/server';
import { getGiftSettings } from '@/features/group-buy/server/gifts';

export const dynamic = 'force-dynamic';

/** GET: 세트당 포장비 · 공개 */
export async function GET() {
  return NextResponse.json(await getGiftSettings(), { headers: { 'Cache-Control': 'public, max-age=60' } });
}
