import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST: 상장 마감 (낙찰 처리)
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

    // 이미 마감된 상장인지 확인
    if (listing.status === 'closed') {
      return NextResponse.json(
        { error: '이미 마감된 상장입니다.' },
        { status: 400 }
      );
    }

    // 2. 해당 상장의 모든 부위 조회
    const { data: parts, error: partsError } = await supabase
      .from('cattle_parts')
      .select('id, part_name, is_included')
      .eq('listing_id', listingId)
      .eq('is_included', true);

    if (partsError) {
      console.error('부위 조회 오류:', partsError);
      return NextResponse.json({ error: partsError.message }, { status: 500 });
    }

    if (!parts || parts.length === 0) {
      return NextResponse.json(
        { error: '상장에 포함된 부위가 없습니다.' },
        { status: 400 }
      );
    }

    const partIds = parts.map(p => p.id);

    // 3. 각 부위별 최고 입찰 조회
    const { data: bids, error: bidsError } = await supabase
      .from('bids')
      .select('id, part_id, dealer_id, bid_price, bid_amount')
      .in('part_id', partIds)
      .order('bid_price', { ascending: false });

    if (bidsError) {
      console.error('입찰 조회 오류:', bidsError);
      return NextResponse.json({ error: bidsError.message }, { status: 500 });
    }

    // 부위별 최고 입찰 그룹화
    const highestBidByPart: Record<string, any> = {};
    (bids || []).forEach((bid) => {
      if (!highestBidByPart[bid.part_id]) {
        highestBidByPart[bid.part_id] = bid;
      }
    });

    // 4. 낙찰 처리
    let successCount = 0;
    let failedCount = 0;

    for (const part of parts) {
      const highestBid = highestBidByPart[part.id];

      if (highestBid) {
        // 낙찰 처리
        // 4-1. 해당 입찰을 낙찰로 표시
        await supabase
          .from('bids')
          .update({ is_winning: true, rank: 1 })
          .eq('id', highestBid.id);

        // 4-2. 부위 테이블에 낙찰 정보 업데이트
        await supabase
          .from('cattle_parts')
          .update({
            bid_price: highestBid.bid_price,
            bid_amount: highestBid.bid_amount,
            winning_dealer_id: highestBid.dealer_id,
          })
          .eq('id', part.id);

        successCount++;
      } else {
        // 유찰 (입찰 없음)
        failedCount++;
      }
    }

    // 5. 상장 상태를 'closed'로 변경
    const { error: updateError } = await supabase
      .from('cattle_listings')
      .update({ 
        status: 'closed',
        closed_at: new Date().toISOString(),
      })
      .eq('id', listingId);

    if (updateError) {
      console.error('상장 상태 변경 오류:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 6. 해당 날짜를 마감 날짜 테이블에 추가 (중복 무시)
    if (listing.listing_date) {
      await supabase
        .from('auction_close_dates')
        .upsert(
          { close_date: listing.listing_date },
          { onConflict: 'close_date', ignoreDuplicates: true }
        );
    }

    return NextResponse.json({
      message: '마감 처리가 완료되었습니다.',
      listingNo: listing.listing_no,
      totalParts: parts.length,
      successCount,
      failedCount,
    });
  } catch (error) {
    console.error('마감 처리 오류:', error);
    return NextResponse.json(
      { error: '마감 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
