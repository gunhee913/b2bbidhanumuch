import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: 중도매인 목록 조회
export async function GET() {
  try {
    const { data: dealers, error } = await supabase
      .from('dealers')
      .select('id, dealer_no, name, phone, status')
      .eq('status', 'active')
      .order('dealer_no', { ascending: true });

    if (error) {
      console.error('Dealers fetch error:', error);
      return NextResponse.json(
        { error: '중도매인 목록 조회 실패' },
        { status: 500 }
      );
    }

    const formattedDealers = (dealers || []).map(d => ({
      id: d.id,
      dealerNo: d.dealer_no,
      name: d.name,
      phone: d.phone,
      status: d.status,
    }));

    return NextResponse.json({ dealers: formattedDealers });
  } catch (error) {
    console.error('Dealers API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
