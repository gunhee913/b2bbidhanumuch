import { getAdminClient } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { format } from 'date-fns';

const supabase = getAdminClient();

// GET: 경매 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const auctionDateFrom = searchParams.get('auctionDateFrom');
    const auctionDateTo = searchParams.get('auctionDateTo');
    const auctionDate = searchParams.get('auctionDate'); // 단일 날짜

    let query = supabase
      .from('auctions')
      .select('*')
      .order('auction_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (auctionDate) {
      query = query.eq('auction_date', auctionDate);
    } else {
      if (auctionDateFrom) {
        query = query.gte('auction_date', auctionDateFrom);
      }
      if (auctionDateTo) {
        query = query.lte('auction_date', auctionDateTo);
      }
    }

    const { data: auctions, error } = await query;

    if (error) {
      console.error('경매 목록 조회 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 각 경매별 상장 수, 입찰 수 조회
    const auctionsWithCounts = await Promise.all(
      (auctions || []).map(async (auction) => {
        const [listingCountResult, bidCountResult] = await Promise.all([
          supabase
            .from('auction_listings')
            .select('id', { count: 'exact', head: true })
            .eq('auction_id', auction.id),
          supabase
            .from('bids')
            .select('id', { count: 'exact', head: true })
            .eq('auction_id', auction.id),
        ]);

        return {
          ...auction,
          listing_count: listingCountResult.count || 0,
          bid_count: bidCountResult.count || 0,
        };
      })
    );

    return NextResponse.json(auctionsWithCounts);
  } catch (error) {
    console.error('경매 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '경매 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 경매 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { auctionDate, title, startTime, endTime, listingIds } = body;

    if (!auctionDate) {
      return NextResponse.json(
        { error: '경매일은 필수입니다.' },
        { status: 400 }
      );
    }

    // 경매번호 생성 (YYMMDD-001 형식)
    const dateCode = auctionDate.replace(/-/g, '').slice(2); // 260205
    
    // 같은 날짜의 마지막 경매번호 조회
    const { data: lastAuction } = await supabase
      .from('auctions')
      .select('auction_no')
      .like('auction_no', `${dateCode}-%`)
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
    const { data: auction, error } = await supabase
      .from('auctions')
      .insert({
        auction_date: auctionDate,
        auction_no: auctionNo,
        title: title || `${format(new Date(auctionDate), 'yyyy년 MM월 dd일')} 경매`,
        start_time: startTime || '09:00',
        end_time: endTime || '12:00',
        status: 'scheduled',
      })
      .select()
      .single();

    if (error) {
      console.error('경매 생성 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 상장 연결 (listingIds가 있는 경우)
    if (listingIds && listingIds.length > 0) {
      const auctionListings = listingIds.map((listingId: string, index: number) => ({
        auction_id: auction.id,
        listing_id: listingId,
        display_order: index,
      }));

      const { error: linkError } = await supabase
        .from('auction_listings')
        .insert(auctionListings);

      if (linkError) {
        console.error('경매-상장 연결 오류:', linkError);
        // 경매는 생성됐으나 연결 실패 - 에러 반환하지 않고 경고만
      }

      // 연결된 상장들의 상태를 auction으로 변경
      await supabase
        .from('cattle_listings')
        .update({ status: 'auction' })
        .in('id', listingIds);
    }

    return NextResponse.json(auction, { status: 201 });
  } catch (error) {
    console.error('경매 생성 오류:', error);
    return NextResponse.json(
      { error: '경매 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
