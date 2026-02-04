import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST: 경매 마감 (낙찰자 결정)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 경매 상태 확인
    const { data: auction, error: fetchError } = await supabase
      .from('auctions')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: '경매를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (auction.status !== 'open') {
      return NextResponse.json(
        { error: '진행 중인 경매만 마감할 수 있습니다.' },
        { status: 400 }
      );
    }

    // DB 함수 호출로 낙찰자 결정
    const { error: closeError } = await supabase.rpc('close_auction', {
      p_auction_id: id,
    });

    if (closeError) {
      console.error('경매 마감 오류:', closeError);
      return NextResponse.json({ error: closeError.message }, { status: 500 });
    }

    // 업데이트된 경매 정보 조회
    const { data: updatedAuction } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', id)
      .single();

    // 낙찰 결과 조회
    const { data: winningBids } = await supabase
      .from('bids')
      .select(`
        id,
        part_id,
        dealer_id,
        bid_price,
        bid_amount,
        dealers (
          id,
          name
        ),
        cattle_parts (
          id,
          part_name,
          listing_id
        )
      `)
      .eq('auction_id', id)
      .eq('is_winning', true);

    return NextResponse.json({
      auction: updatedAuction,
      winningBids: winningBids || [],
      message: '경매가 마감되었습니다. 낙찰자가 결정되었습니다.',
    });
  } catch (error) {
    console.error('경매 마감 오류:', error);
    return NextResponse.json(
      { error: '경매 마감 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
