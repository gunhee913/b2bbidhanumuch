import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: 여러 부위의 최고 입찰가 조회
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
    
    // 각 부위별 최고 입찰가 조회
    const { data: bids, error } = await supabase
      .from('bids')
      .select('part_id, bid_price')
      .in('part_id', partIds)
      .order('bid_price', { ascending: false });
    
    if (error) {
      console.error('최고 입찰가 조회 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // 부위별 최고가 매핑
    const highestBids: Record<string, number> = {};
    (bids || []).forEach((bid: any) => {
      if (!highestBids[bid.part_id] || bid.bid_price > highestBids[bid.part_id]) {
        highestBids[bid.part_id] = bid.bid_price;
      }
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
