import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  AuctionRow,
  CreateAuctionInput,
  toFrontendAuction,
  AuctionFilter,
} from '@/features/auctions/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: 경매 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const auctionDateFrom = searchParams.get('auctionDateFrom');
    const auctionDateTo = searchParams.get('auctionDateTo');

    let query = supabase
      .from('auctions')
      .select('*')
      .order('auction_date', { ascending: false })
      .order('auction_no', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (auctionDateFrom) {
      query = query.gte('auction_date', auctionDateFrom);
    }
    if (auctionDateTo) {
      query = query.lte('auction_date', auctionDateTo);
    }

    const { data: auctions, error } = await query;

    if (error) {
      console.error('경매 목록 조회 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 각 경매의 상장 수, 입찰 수 조회
    const result = await Promise.all(
      auctions.map(async (auction: AuctionRow) => {
        const [{ count: listingCount }, { count: bidCount }] = await Promise.all([
          supabase
            .from('auction_listings')
            .select('*', { count: 'exact', head: true })
            .eq('auction_id', auction.id),
          supabase
            .from('bids')
            .select('*', { count: 'exact', head: true })
            .eq('auction_id', auction.id),
        ]);

        return {
          ...toFrontendAuction(auction),
          listingCount: listingCount || 0,
          bidCount: bidCount || 0,
        };
      })
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('경매 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '경매 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 경매 생성
export async function POST(request: NextRequest) {
  try {
    const body: CreateAuctionInput = await request.json();
    const { listingIds, ...auctionData } = body;

    // 경매번호 생성 (YYMMDD-XXX)
    const dateCode = auctionData.auctionDate.replace(/-/g, '').slice(2);
    
    // 해당 날짜의 마지막 경매번호 조회
    const { data: lastAuction } = await supabase
      .from('auctions')
      .select('auction_no')
      .eq('auction_date', auctionData.auctionDate)
      .order('auction_no', { ascending: false })
      .limit(1)
      .single();

    let nextSeq = 1;
    if (lastAuction?.auction_no) {
      const lastSeq = parseInt(lastAuction.auction_no.split('-')[1]);
      nextSeq = lastSeq + 1;
    }

    const auctionNo = `${dateCode}-${String(nextSeq).padStart(3, '0')}`;

    // 경매 생성
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .insert({
        auction_date: auctionData.auctionDate,
        auction_no: auctionNo,
        title: auctionData.title,
        start_time: auctionData.startTime,
        end_time: auctionData.endTime,
        status: 'scheduled',
        created_by: auctionData.createdBy,
      })
      .select()
      .single();

    if (auctionError) {
      console.error('경매 생성 오류:', auctionError);
      return NextResponse.json({ error: auctionError.message }, { status: 500 });
    }

    // 상장 연결
    if (listingIds && listingIds.length > 0) {
      const auctionListings = listingIds.map((listingId, index) => ({
        auction_id: auction.id,
        listing_id: listingId,
        display_order: index,
      }));

      const { error: linkError } = await supabase
        .from('auction_listings')
        .insert(auctionListings);

      if (linkError) {
        console.error('경매-상장 연결 오류:', linkError);
      }

      // 상장 상태를 auction으로 변경
      await supabase
        .from('cattle_listings')
        .update({ status: 'auction' })
        .in('id', listingIds);
    }

    return NextResponse.json({
      ...toFrontendAuction(auction),
      listingCount: listingIds?.length || 0,
      bidCount: 0,
    });
  } catch (error) {
    console.error('경매 생성 오류:', error);
    return NextResponse.json(
      { error: '경매 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
