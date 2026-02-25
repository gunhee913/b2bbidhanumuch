import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: 입찰 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const auctionId = searchParams.get('auctionId');
    const partId = searchParams.get('partId');
    const dealerId = searchParams.get('dealerId');
    const isWinning = searchParams.get('isWinning');
    const listingId = searchParams.get('listingId');

    let query = supabase
      .from('bids')
      .select(`
        id,
        auction_id,
        part_id,
        dealer_id,
        bid_price,
        bid_amount,
        rank,
        is_winning,
        created_at,
        dealers (
          id,
          name
        ),
        cattle_parts (
          id,
          part_no,
          part_name,
          listing_id,
          weight,
          min_price,
          bid_price,
          winning_dealer_id,
          listing_part_no,
          cattle_listings (
            id,
            listing_no,
            listing_date,
            grade,
            gender,
            status,
            closed_at,
            marbling_score
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (auctionId) {
      query = query.eq('auction_id', auctionId);
    }

    if (partId) {
      query = query.eq('part_id', partId);
    }

    if (dealerId) {
      query = query.eq('dealer_id', dealerId);
    }

    if (isWinning !== null) {
      query = query.eq('is_winning', isWinning === 'true');
    }

    const { data: bids, error } = await query;

    if (error) {
      console.error('입찰 목록 조회 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // listingId로 필터링 (cattle_parts를 통해)
    let filteredBids = bids || [];
    if (listingId) {
      filteredBids = filteredBids.filter(
        (bid: any) => bid.cattle_parts?.listing_id === listingId
      );
    }

    return NextResponse.json(filteredBids);
  } catch (error) {
    console.error('입찰 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '입찰 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 입찰 등록
// auctionId는 이제 optional - 상장이 approved 상태면 바로 입찰 가능
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { auctionId, partId, dealerId, bidPrice, weight } = body;

    // 필수 값 검증 (auctionId는 이제 optional)
    if (!partId || !dealerId || !bidPrice) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 부위 정보 조회 (최저가, 중량, 상장 정보 포함)
    const { data: part, error: partError } = await supabase
      .from('cattle_parts')
      .select(`
        id,
        min_price, 
        weight, 
        is_included,
        listing_id,
        cattle_listings (
          id,
          status
        )
      `)
      .eq('id', partId)
      .single();

    if (partError || !part) {
      return NextResponse.json(
        { error: '부위 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (!part.is_included) {
      return NextResponse.json(
        { error: '상장에 포함되지 않은 부위입니다.' },
        { status: 400 }
      );
    }

    // 상장 상태 확인 (approved 또는 auction 상태만 입찰 가능)
    const listingStatus = (part.cattle_listings as any)?.status;
    if (!['approved', 'auction'].includes(listingStatus)) {
      return NextResponse.json(
        { error: '입찰 가능한 상태가 아닙니다. 승인된 상장에만 입찰할 수 있습니다.' },
        { status: 400 }
      );
    }

    // 회차별 경매 검증: 해당 상장이 배정된 open 상태 회차가 있는지 확인
    const { data: auctionLinks } = await supabase
      .from('auction_listings')
      .select('auction_id, auctions(id, status, round_no, started_at, round_duration_min)')
      .eq('listing_id', part.listing_id);

    if (!auctionLinks || auctionLinks.length === 0) {
      return NextResponse.json(
        { error: '아직 경매가 시작되지 않았습니다.' },
        { status: 400 }
      );
    }

    const openLink = auctionLinks.find((al: any) => al.auctions?.status === 'open');
    if (!openLink) {
      return NextResponse.json(
        { error: '현재 진행 중인 회차가 아닙니다. 해당 회차가 시작될 때까지 기다려주세요.' },
        { status: 400 }
      );
    }

    const linkedAuction = (openLink as any).auctions;
    if (linkedAuction?.started_at && linkedAuction?.round_duration_min) {
      const startedAt = new Date(linkedAuction.started_at).getTime();
      const durationMs = linkedAuction.round_duration_min * 60 * 1000;
      if (Date.now() > startedAt + durationMs) {
        return NextResponse.json(
          { error: '해당 회차의 경매 시간이 종료되었습니다.' },
          { status: 400 }
        );
      }
    }

    // auctionId가 있으면 경매 상태도 확인
    if (auctionId) {
      const { data: auction, error: auctionError } = await supabase
        .from('auctions')
        .select('status')
        .eq('id', auctionId)
        .single();

      if (auctionError || !auction) {
        console.log('경매를 찾을 수 없지만 상장이 approved 상태이므로 입찰 진행');
      } else if (auction.status !== 'open') {
        return NextResponse.json(
          { error: '진행 중인 경매에만 입찰할 수 있습니다.' },
          { status: 400 }
        );
      }
    }

    // 최저가 확인
    if (part.min_price && bidPrice < part.min_price) {
      return NextResponse.json(
        { error: `최저가(${part.min_price.toLocaleString()}원) 이상으로 입찰해주세요.` },
        { status: 400 }
      );
    }

    // 입찰금액 계산
    const partWeight = weight || part.weight || 0;
    const bidAmount = Math.round(bidPrice * partWeight);

    const { data: existingBid } = await supabase
      .from('bids')
      .select('id, bid_price, bid_amount, auction_id')
      .eq('part_id', partId)
      .eq('dealer_id', dealerId)
      .single();

    if (existingBid) {
      const { data: updatedBid, error: updateError } = await supabase
        .from('bids')
        .update({
          bid_price: bidPrice,
          bid_amount: bidAmount,
          auction_id: auctionId || null,
        })
        .eq('id', existingBid.id)
        .select()
        .single();

      if (updateError) {
        console.error('입찰 수정 오류:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      await supabase.from('bid_audit_logs').insert({
        bid_id: existingBid.id,
        auction_id: auctionId || existingBid.auction_id || null,
        part_id: partId,
        dealer_id: dealerId,
        action_type: 'dealer_update',
        old_bid_price: existingBid.bid_price,
        new_bid_price: bidPrice,
        old_bid_amount: existingBid.bid_amount,
        new_bid_amount: bidAmount,
        performed_by: null,
      });

      return NextResponse.json({
        ...updatedBid,
        isUpdate: true,
        message: '입찰가가 수정되었습니다.',
      });
    }

    // 새 입찰 등록
    const { data: newBid, error: insertError } = await supabase
      .from('bids')
      .insert({
        auction_id: auctionId || null,
        listing_id: part.listing_id,
        part_id: partId,
        dealer_id: dealerId,
        bid_price: bidPrice,
        bid_amount: bidAmount,
      })
      .select()
      .single();

    if (insertError) {
      console.error('입찰 등록 오류:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      ...newBid,
      isUpdate: false,
      message: '입찰이 등록되었습니다.',
    }, { status: 201 });
  } catch (error) {
    console.error('입찰 등록 오류:', error);
    return NextResponse.json(
      { error: '입찰 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
