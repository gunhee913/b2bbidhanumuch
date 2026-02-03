import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CreateBidInput, toFrontendBid } from '@/features/auctions/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: 특정 경매의 입찰 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const partId = searchParams.get('partId');
    const dealerId = searchParams.get('dealerId');

    let query = supabase
      .from('bids')
      .select(`
        *,
        dealers:dealer_id (name, dealer_no),
        cattle_parts:part_id (part_name, listing_part_no, weight)
      `)
      .eq('auction_id', id)
      .order('bid_price', { ascending: false })
      .order('created_at', { ascending: true });

    if (partId) {
      query = query.eq('part_id', partId);
    }
    if (dealerId) {
      query = query.eq('dealer_id', dealerId);
    }

    const { data: bids, error } = await query;

    if (error) {
      console.error('입찰 목록 조회 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = (bids || []).map((bid: unknown) => {
      const item = bid as Record<string, unknown> & { 
        dealers: { name: string; dealer_no: string } | null;
        cattle_parts: { part_name: string; listing_part_no: string; weight: number } | null;
      };
      return {
        ...toFrontendBid(item as never),
        dealerName: item.dealers?.name || '',
        dealerNo: item.dealers?.dealer_no || '',
        partName: item.cattle_parts?.part_name || '',
        listingPartNo: item.cattle_parts?.listing_part_no || '',
        weight: item.cattle_parts?.weight || 0,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('입찰 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '입찰 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 입찰 등록
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: CreateBidInput = await request.json();

    // 경매 상태 확인
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select('status')
      .eq('id', id)
      .single();

    if (auctionError) {
      return NextResponse.json({ error: '경매를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (auction.status !== 'open') {
      return NextResponse.json(
        { error: '진행 중인 경매에만 입찰할 수 있습니다.' },
        { status: 400 }
      );
    }

    // 부위가 해당 경매에 포함되어 있는지 확인
    const { data: part, error: partError } = await supabase
      .from('cattle_parts')
      .select(`
        id,
        listing_id,
        weight,
        min_price,
        is_included,
        cattle_listings!inner (id)
      `)
      .eq('id', body.partId)
      .single();

    if (partError || !part) {
      return NextResponse.json({ error: '부위를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (!part.is_included) {
      return NextResponse.json({ error: '상장에 포함되지 않은 부위입니다.' }, { status: 400 });
    }

    // 해당 상장이 이 경매에 포함되어 있는지 확인
    const { data: auctionListing } = await supabase
      .from('auction_listings')
      .select('id')
      .eq('auction_id', id)
      .eq('listing_id', part.listing_id)
      .single();

    if (!auctionListing) {
      return NextResponse.json(
        { error: '해당 부위는 이 경매에 포함되어 있지 않습니다.' },
        { status: 400 }
      );
    }

    // 최저가 체크
    if (part.min_price && body.bidPrice < part.min_price) {
      return NextResponse.json(
        { error: `최저가(${part.min_price.toLocaleString()}원) 이상으로 입찰해야 합니다.` },
        { status: 400 }
      );
    }

    // 입찰금액 계산
    const bidAmount = Math.round(body.bidPrice * (part.weight || body.weight));

    // 기존 입찰 확인 (같은 경매, 같은 부위, 같은 중도매인)
    const { data: existingBid } = await supabase
      .from('bids')
      .select('id, bid_price')
      .eq('auction_id', id)
      .eq('part_id', body.partId)
      .eq('dealer_id', body.dealerId)
      .single();

    let result;

    if (existingBid) {
      // 기존 입찰이 있으면 업데이트 (더 높은 가격으로만)
      if (body.bidPrice <= existingBid.bid_price) {
        return NextResponse.json(
          { error: '기존 입찰가보다 높은 금액으로만 수정할 수 있습니다.' },
          { status: 400 }
        );
      }

      const { data, error } = await supabase
        .from('bids')
        .update({
          bid_price: body.bidPrice,
          bid_amount: bidAmount,
        })
        .eq('id', existingBid.id)
        .select()
        .single();

      if (error) {
        console.error('입찰 수정 오류:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      result = data;
    } else {
      // 새 입찰 등록
      const { data, error } = await supabase
        .from('bids')
        .insert({
          auction_id: id,
          part_id: body.partId,
          dealer_id: body.dealerId,
          bid_price: body.bidPrice,
          bid_amount: bidAmount,
        })
        .select()
        .single();

      if (error) {
        console.error('입찰 등록 오류:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      result = data;
    }

    return NextResponse.json(toFrontendBid(result));
  } catch (error) {
    console.error('입찰 등록 오류:', error);
    return NextResponse.json(
      { error: '입찰 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
