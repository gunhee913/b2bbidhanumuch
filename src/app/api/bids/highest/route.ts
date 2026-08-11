import { getAdminClient } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';

const supabase = getAdminClient();

/**
 * GET /api/bids/highest?partIds=uuid1,uuid2,...
 *
 * 여러 부위의 현재 최고가 조회. 오픈 최고가 경매 정책상 로그인 여부와 무관하게
 * 최고가는 공개된다. 부위별 최고가는 `is_top_bid=true` row 를 조회해 O(1) 로 얻는다.
 *
 * 응답: `{ [partId]: number }` (해당 부위에 아직 입찰이 없으면 키 자체가 빠짐)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const partIdsParam = searchParams.get('partIds');

    if (!partIdsParam) {
      return NextResponse.json({});
    }

    const partIds = partIdsParam.split(',').filter(Boolean);

    if (partIds.length === 0) {
      return NextResponse.json({});
    }

    const { data: bids, error } = await supabase
      .from('bids')
      .select('part_id, bid_price')
      .in('part_id', partIds)
      .eq('is_top_bid', true);

    if (error) {
      console.error('최고 입찰가 조회 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const highestBids: Record<string, number> = {};
    (bids || []).forEach((bid: any) => {
      highestBids[bid.part_id] = bid.bid_price;
    });

    return NextResponse.json(highestBids);
  } catch (error) {
    console.error('최고 입찰가 조회 오류:', error);
    return NextResponse.json(
      { error: '최고 입찰가 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
