import { NextRequest, NextResponse } from 'next/server';
import { resolveAdmin } from '@/lib/resolve-auth';
import { syncDraftProducts } from '@/features/group-buy/server/products';

/** POST: 승인된 상장 중 상품이 없는 부위를 draft 로 생성 */
export async function POST(request: NextRequest) {
  const admin = await resolveAdmin(request);
  if (!admin) return NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 });

  const result = await syncDraftProducts();
  return NextResponse.json(result);
}
