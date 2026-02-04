import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: 경매 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 경매 정보 조회
    const { data: auction, error } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: '경매를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 경매에 포함된 상장 목록 조회
    const { data: auctionListings } = await supabase
      .from('auction_listings')
      .select(`
        id,
        display_order,
        listing_id,
        cattle_listings (
          id,
          listing_no,
          listing_date,
          company_id,
          breed,
          gender,
          grade,
          marbling_score,
          trace_no,
          carcass_weight,
          status,
          companies (
            id,
            name
          )
        )
      `)
      .eq('auction_id', id)
      .order('display_order', { ascending: true });

    // 입찰 현황 조회
    const { data: bids } = await supabase
      .from('bids')
      .select(`
        id,
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
          part_name,
          listing_id,
          weight,
          min_price
        )
      `)
      .eq('auction_id', id)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      ...auction,
      listings: auctionListings || [],
      bids: bids || [],
    });
  } catch (error) {
    console.error('경매 상세 조회 오류:', error);
    return NextResponse.json(
      { error: '경매 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// PATCH: 경매 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, startTime, endTime, status } = body;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (startTime !== undefined) updateData.start_time = startTime;
    if (endTime !== undefined) updateData.end_time = endTime;
    if (status !== undefined) updateData.status = status;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: '수정할 내용이 없습니다.' },
        { status: 400 }
      );
    }

    const { data: auction, error } = await supabase
      .from('auctions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('경매 수정 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(auction);
  } catch (error) {
    console.error('경매 수정 오류:', error);
    return NextResponse.json(
      { error: '경매 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE: 경매 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 경매 상태 확인
    const { data: auction } = await supabase
      .from('auctions')
      .select('status')
      .eq('id', id)
      .single();

    if (auction?.status === 'open') {
      return NextResponse.json(
        { error: '진행 중인 경매는 삭제할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 연결된 상장들의 상태를 approved로 복원
    const { data: linkedListings } = await supabase
      .from('auction_listings')
      .select('listing_id')
      .eq('auction_id', id);

    if (linkedListings && linkedListings.length > 0) {
      const listingIds = linkedListings.map((l) => l.listing_id);
      await supabase
        .from('cattle_listings')
        .update({ status: 'approved' })
        .in('id', listingIds);
    }

    // 경매 삭제 (CASCADE로 auction_listings, bids도 삭제됨)
    const { error } = await supabase
      .from('auctions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('경매 삭제 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('경매 삭제 오류:', error);
    return NextResponse.json(
      { error: '경매 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
