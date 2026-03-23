import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';

const supabase = getAdminClient();

async function isDateClosed(date: string): Promise<boolean> {
  const { data } = await supabase
    .from('auction_close_dates')
    .select('id')
    .eq('close_date', date)
    .maybeSingle();
  return !!data;
}

async function areAllRoundsClosed(date: string): Promise<boolean> {
  const { data: rounds } = await supabase
    .from('auctions')
    .select('id, status')
    .eq('auction_date', date)
    .not('round_no', 'is', null);

  if (!rounds || rounds.length === 0) return false;
  return rounds.every((r) => r.status === 'closed' || r.status === 'cancelled');
}

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0];

    const todayClosed = await isDateClosed(today);

    if (!todayClosed) {
      const { data: activeToday } = await supabase
        .from('cattle_listings')
        .select('id')
        .eq('listing_date', today)
        .in('status', ['approved', 'auction'])
        .limit(1);

      if (activeToday && activeToday.length > 0) {
        return NextResponse.json({ date: today });
      }
    }

    // 전체 마감되었거나 오늘 활성 상장이 없으면 → 다음 경매일 탐색
    const { data: nextApproved } = await supabase
      .from('cattle_listings')
      .select('listing_date')
      .gt('listing_date', today)
      .in('status', ['approved', 'auction', 'pending'])
      .order('listing_date', { ascending: true })
      .limit(1);

    if (nextApproved && nextApproved.length > 0) {
      return NextResponse.json({ date: nextApproved[0].listing_date });
    }

    // 미래 상장이 없으면 → 오늘에 상장이 있었다면 결과 확인용으로 오늘 반환
    const { data: anyToday } = await supabase
      .from('cattle_listings')
      .select('id')
      .eq('listing_date', today)
      .limit(1);

    if (anyToday && anyToday.length > 0) {
      return NextResponse.json({ date: today });
    }

    // 미래 아무 상장이든 찾기
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
