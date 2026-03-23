import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';

const supabase = getAdminClient();

// GET: 경매에 포함된 상장 목록
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: listings, error } = await supabase
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
          ),
          cattle_parts (
            id,
            part_no,
            part_name,
            listing_part_no,
            weight,
            min_price,
            is_included,
            bid_price,
            bid_amount,
            winning_dealer_id,
            bid_at
          )
        )
      `)
      .eq('auction_id', id)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('경매 상장 목록 조회 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(listings || []);
  } catch (error) {
    console.error('경매 상장 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '상장 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 경매에 상장 추가
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { listingIds } = body;

    if (!listingIds || listingIds.length === 0) {
      return NextResponse.json(
        { error: '추가할 상장을 선택해주세요.' },
        { status: 400 }
      );
    }

    // 경매 상태 확인
    const { data: auction } = await supabase
      .from('auctions')
      .select('status')
      .eq('id', id)
      .single();

    if (auction?.status !== 'scheduled') {
      return NextResponse.json(
        { error: '예정 상태의 경매에만 상장을 추가할 수 있습니다.' },
        { status: 400 }
      );
    }

    // 현재 최대 display_order 조회
    const { data: maxOrder } = await supabase
      .from('auction_listings')
      .select('display_order')
      .eq('auction_id', id)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    let nextOrder = (maxOrder?.display_order || 0) + 1;

    // 상장 연결
    const auctionListings = listingIds.map((listingId: string) => ({
      auction_id: id,
      listing_id: listingId,
      display_order: nextOrder++,
    }));

    const { error: insertError } = await supabase
      .from('auction_listings')
      .insert(auctionListings);

    if (insertError) {
      console.error('상장 추가 오류:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // 상장 상태를 auction으로 변경
    await supabase
      .from('cattle_listings')
      .update({ status: 'auction' })
      .in('id', listingIds);

    return NextResponse.json({ success: true, added: listingIds.length });
  } catch (error) {
    console.error('상장 추가 오류:', error);
    return NextResponse.json(
      { error: '상장 추가 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE: 경매에서 상장 제거
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get('listingId');

    if (!listingId) {
      return NextResponse.json(
        { error: '제거할 상장 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 경매 상태 확인
    const { data: auction } = await supabase
      .from('auctions')
      .select('status')
      .eq('id', id)
      .single();

    if (auction?.status !== 'scheduled') {
      return NextResponse.json(
        { error: '예정 상태의 경매에서만 상장을 제거할 수 있습니다.' },
        { status: 400 }
      );
    }

    // 연결 제거
    const { error } = await supabase
      .from('auction_listings')
      .delete()
      .eq('auction_id', id)
      .eq('listing_id', listingId);

    if (error) {
      console.error('상장 제거 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 상장 상태를 approved로 복원
    await supabase
      .from('cattle_listings')
      .update({ status: 'approved' })
      .eq('id', listingId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('상장 제거 오류:', error);
    return NextResponse.json(
      { error: '상장 제거 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
