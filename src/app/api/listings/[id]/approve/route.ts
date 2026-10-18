import { getAdminClient } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { toFrontendListing } from '@/features/listings/types';
import { createDraftProductsForListing } from '@/features/group-buy/server/products';
import { matchAllPools } from '@/features/group-buy/server/pools';

const supabase = getAdminClient();

// POST: 상장 승인
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { approvedBy } = body;

    // 상장 상태 확인
    const { data: listing, error: fetchError } = await supabase
      .from('cattle_listings')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: '상장을 찾을 수 없습니다.' }, { status: 404 });
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (listing.status !== 'pending') {
      return NextResponse.json(
        { error: '대기 상태인 상장만 승인할 수 있습니다.' },
        { status: 400 }
      );
    }

    // 승인 처리
    const { data, error } = await supabase
      .from('cattle_listings')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: approvedBy || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('상장 승인 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 공동구매 상품 초안 자동 생성 · 실패해도 승인은 유지 (관리자 동기화로 복구 가능)
    try {
      await createDraftProductsForListing(id);
      // 새 부위가 kg 수요 풀의 예약으로 바로 채워지는지 확인
      await matchAllPools(approvedBy || null);
    } catch (e) {
      console.error('[group-buy] draft 생성/풀 매칭 실패:', e);
    }

    return NextResponse.json(toFrontendListing(data));
  } catch (error) {
    console.error('상장 승인 오류:', error);
    return NextResponse.json(
      { error: '상장 승인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
