import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getToken } from 'next-auth/jwt';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST: 재경매 취소 (라운드 삭제 + 상장 상태 복원)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getToken({ req: request });
    if (!token || token.userType !== 'admin_user') {
      return NextResponse.json({ error: '관리자만 접근 가능합니다.' }, { status: 403 });
    }

    const { id } = await params;

    const { data: auction, error: fetchError } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !auction) {
      return NextResponse.json({ error: '경매를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (auction.status !== 'open') {
      return NextResponse.json({ error: 'open 상태의 경매만 취소할 수 있습니다.' }, { status: 400 });
    }

    const { data: auctionListings } = await supabase
      .from('auction_listings')
      .select('listing_id')
      .eq('auction_id', id);

    const listingIds = (auctionListings || []).map((al: any) => al.listing_id);

    if (listingIds.length > 0) {
      await supabase
        .from('cattle_listings')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .in('id', listingIds);
    }

    await supabase.from('auction_listings').delete().eq('auction_id', id);
    await supabase.from('auctions').delete().eq('id', id);

    return NextResponse.json({
      message: `재경매가 취소되었습니다. ${listingIds.length}개 상장이 유찰 처리되었습니다.`,
    });
  } catch (error) {
    console.error('재경매 취소 오류:', error);
    return NextResponse.json({ error: '재경매 취소 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
