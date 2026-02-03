import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { toFrontendAuction } from '@/features/auctions/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST: 경매 시작
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
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: '경매를 찾을 수 없습니다.' }, { status: 404 });
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (auction.status !== 'scheduled') {
      return NextResponse.json(
        { error: '예정 상태인 경매만 시작할 수 있습니다.' },
        { status: 400 }
      );
    }

    // 경매에 상장이 있는지 확인
    const { count } = await supabase
      .from('auction_listings')
      .select('*', { count: 'exact', head: true })
      .eq('auction_id', id);

    if (!count || count === 0) {
      return NextResponse.json(
        { error: '상장이 없는 경매는 시작할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 경매 시작
    const { data, error } = await supabase
      .from('auctions')
      .update({ status: 'open' })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('경매 시작 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(toFrontendAuction(data));
  } catch (error) {
    console.error('경매 시작 오류:', error);
    return NextResponse.json(
      { error: '경매 시작 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
