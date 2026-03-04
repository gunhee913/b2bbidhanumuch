import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. 오늘 날짜에 진행 중(approved/auction) 상장이 있는지 확인
    const { data: activeToday } = await supabase
      .from('cattle_listings')
      .select('id')
      .eq('listing_date', today)
      .in('status', ['approved', 'auction'])
      .limit(1);

    if (activeToday && activeToday.length > 0) {
      return NextResponse.json({ date: today });
    }

    // 2. 오늘 날짜에 마감된(closed/completed) 상장이 있는지 확인
    const { data: closedToday } = await supabase
      .from('cattle_listings')
      .select('id')
      .eq('listing_date', today)
      .in('status', ['closed', 'completed'])
      .limit(1);

    const hasTodayListings = closedToday && closedToday.length > 0;

    // 3. 오늘 이후 날짜에 approved 상장이 있는 가장 가까운 날짜 조회
    const { data: nextApproved } = await supabase
      .from('cattle_listings')
      .select('listing_date')
      .gt('listing_date', today)
      .eq('status', 'approved')
      .order('listing_date', { ascending: true })
      .limit(1);

    if (nextApproved && nextApproved.length > 0) {
      return NextResponse.json({ date: nextApproved[0].listing_date });
    }

    // 4. 미래 approved가 없으면 → 오늘 마감 상장이 있었어도 오늘 반환
    if (hasTodayListings) {
      return NextResponse.json({ date: today });
    }

    // 5. 오늘 상장도 없고 미래도 없으면 → 가장 가까운 미래 날짜의 상장
    const { data: nextAny } = await supabase
      .from('cattle_listings')
      .select('listing_date')
      .gt('listing_date', today)
      .order('listing_date', { ascending: true })
      .limit(1);

    if (nextAny && nextAny.length > 0) {
      return NextResponse.json({ date: nextAny[0].listing_date });
    }

    return NextResponse.json({ date: today });
  } catch {
    return NextResponse.json({ date: new Date().toISOString().split('T')[0] });
  }
}
