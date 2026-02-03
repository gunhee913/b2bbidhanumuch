import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { toFrontendAuction } from '@/features/auctions/types';

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

    // DB 함수 호출로 경매 마감 처리
    const { error: closeError } = await supabase.rpc('close_auction', {
      p_auction_id: id,
    });

    if (closeError) {
      console.error('경매 마감 오류:', closeError);
      return NextResponse.json({ error: closeError.message }, { status: 500 });
    }

    // 업데이트된 경매 정보 조회
    const { data, error } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(toFrontendAuction(data));
  } catch (error) {
    console.error('경매 마감 오류:', error);
    return NextResponse.json(
      { error: '경매 마감 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
