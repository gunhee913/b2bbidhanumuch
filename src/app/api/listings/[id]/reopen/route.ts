import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST: 상장 마감 취소 (다시 경매 상태로)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await params;

    // 1. 상장 정보 조회
    const { data: listing, error: listingError } = await supabase
      .from('cattle_listings')
      .select('id, status, listing_no')
      .eq('id', listingId)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: '상장을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 마감된 상장인지 확인
    if (listing.status !== 'closed') {
      return NextResponse.json(
        { error: '마감된 상장만 취소할 수 있습니다.' },
        { status: 400 }
      );
    }

    // 2. 해당 상장의 모든 부위 조회
    const { data: parts, error: partsError } = await supabase
      .from('cattle_parts')
      .select('id')
      .eq('listing_id', listingId);

    if (partsError) {
      console.error('부위 조회 오류:', partsError);
      return NextResponse.json({ error: partsError.message }, { status: 500 });
    }

    const partIds = (parts || []).map(p => p.id);

    // 3. 낙찰 정보 초기화
    if (partIds.length > 0) {
      // 입찰의 is_winning 초기화
      await supabase
        .from('bids')
        .update({ is_winning: false })
        .in('part_id', partIds);

      // 부위의 낙찰 정보 초기화
      await supabase
        .from('cattle_parts')
        .update({
          bid_price: null,
          bid_amount: null,
          winning_dealer_id: null,
        })
        .eq('listing_id', listingId);
    }

    // 4. 상장 상태를 'approved'로 변경
    const { error: updateError } = await supabase
      .from('cattle_listings')
      .update({ 
        status: 'approved',
        closed_at: null,
      })
      .eq('id', listingId);

    if (updateError) {
      console.error('상장 상태 변경 오류:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: '마감 취소가 완료되었습니다.',
      listingNo: listing.listing_no,
    });
  } catch (error) {
    console.error('마감 취소 오류:', error);
    return NextResponse.json(
      { error: '마감 취소 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
