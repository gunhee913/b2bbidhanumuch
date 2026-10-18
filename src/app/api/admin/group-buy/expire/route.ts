import { NextRequest, NextResponse } from 'next/server';
import { resolveAdmin } from '@/lib/resolve-auth';
import { expireRecruitingProducts } from '@/features/group-buy/server/settle';

/** POST: 모집 마감 지난 상품 즉시 정리 (미달 취소 + 환불) */
export async function POST(request: NextRequest) {
  const admin = await resolveAdmin(request);
  if (!admin) return NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 });

  const result = await expireRecruitingProducts(new Date(), admin.name);
  return NextResponse.json(result);
}
