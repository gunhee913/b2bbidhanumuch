import { NextRequest, NextResponse } from 'next/server';
import { getConsumerProductCerts } from '@/features/group-buy/server/products';

export const dynamic = 'force-dynamic';

/**
 * GET: 등급판정확인서 · 도축검사증명서 스캔본 (data URL).
 * 부분육 경매 플랫폼에 등록된 파일을 그대로 내려준다 · 파일이 커서 상세 본문과 따로 지연 로드한다.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const certs = await getConsumerProductCerts(id);
    if (!certs) return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 });
    return NextResponse.json(certs, { headers: { 'Cache-Control': 'private, max-age=600' } });
  } catch (error) {
    console.error('[group-buy] product certs error:', error);
    return NextResponse.json({ error: '증명서를 불러오지 못했습니다.' }, { status: 500 });
  }
}
