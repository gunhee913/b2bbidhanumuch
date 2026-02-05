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
      .select('id, status, listing_no, listing_date')
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

    // 해당 날짜보다 이후에 마감된 날짜가 있는지 확인
    if (listing.listing_date) {
      const { data: laterClosedDates } = await supabase
        .from('auction_close_dates')
        .select('close_date')
        .gt('close_date', listing.listing_date)
        .limit(1);

      if (laterClosedDates && laterClosedDates.length > 0) {
        return NextResponse.json(
          { error: `${laterClosedDates[0].close_date} 이후 날짜가 마감되어 있어 취소할 수 없습니다. 최근 날짜부터 취소해주세요.` },
          { status: 400 }
        );
      }
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

    // 5. 해당 날짜에 다른 마감된 상장이 없으면 auction_close_dates에서 삭제
    if (listing.listing_date) {
      // 같은 날짜에 아직 마감된 다른 상장이 있는지 확인
      const { data: otherClosedListings } = await supabase
        .from('cattle_listings')
        .select('id')
        .eq('listing_date', listing.listing_date)
        .eq('status', 'closed')
        .neq('id', listingId)
        .limit(1);

      // 다른 마감된 상장이 없으면 해당 날짜 삭제
      if (!otherClosedListings || otherClosedListings.length === 0) {
        await supabase
          .from('auction_close_dates')
          .delete()
          .eq('close_date', listing.listing_date);
      }
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
