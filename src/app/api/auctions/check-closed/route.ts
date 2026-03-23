import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';

const supabase = getAdminClient();

// GET: 특정 날짜의 마감 여부 확인
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { error: '날짜를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 해당 날짜가 마감되었는지 확인
    const { data, error } = await supabase
      .from('auction_close_dates')
      .select('id, close_date, closed_at')
      .eq('close_date', date)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116: no rows returned (마감되지 않은 경우)
      console.error('마감 여부 확인 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const isClosed = !!data;

    return NextResponse.json({
      date,
      isClosed,
      closedAt: data?.closed_at || null,
    });
  } catch (error) {
    console.error('마감 여부 확인 오류:', error);
    return NextResponse.json(
      { error: '마감 여부 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
