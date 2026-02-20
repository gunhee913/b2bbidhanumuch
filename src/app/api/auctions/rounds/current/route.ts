import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function buildRoundListingMap(allRounds: any[]) {
  const roundIds = allRounds.map((r: any) => r.id);
  const roundListingMap: Record<string, number> = {};
  if (roundIds.length === 0) return roundListingMap;

  const { data: allAuctionListings } = await supabase
    .from('auction_listings')
    .select('auction_id, listing_id')
    .in('auction_id', roundIds);

  const auctionToRound = new Map<string, number>();
  allRounds.forEach((r: any) => auctionToRound.set(r.id, r.round_no));

  (allAuctionListings || []).forEach((al: any) => {
    const roundNo = auctionToRound.get(al.auction_id);
    if (roundNo) roundListingMap[al.listing_id] = roundNo;
  });

  return roundListingMap;
}

// GET: 현재 진행 중인 회차 조회 (딜러/관리자 공용)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    let query = supabase
      .from('auctions')
      .select('*')
      .eq('status', 'open')
      .not('round_no', 'is', null)
      .order('round_no', { ascending: true })
      .limit(1);

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    const { data: currentRound, error } = await query.maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 진행중인 회차가 없는 경우: 오늘 날짜의 회차 정보를 반환
    if (!currentRound) {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data: todayRounds } = await supabase
        .from('auctions')
        .select('id, round_no, status, started_at, ended_at, session_id')
        .eq('auction_date', today)
        .not('round_no', 'is', null)
        .order('round_no', { ascending: true });

      if (!todayRounds || todayRounds.length === 0) {
        return NextResponse.json({
          currentRound: null,
          allRounds: [],
          totalRounds: 0,
          roundListingMap: {},
        });
      }

      const roundListingMap = await buildRoundListingMap(todayRounds);
      return NextResponse.json({
        currentRound: null,
        allRounds: todayRounds,
        totalRounds: todayRounds.length,
        roundListingMap,
      });
    }

    // 해당 회차에 배정된 상장 목록 조회
    const { data: auctionListings } = await supabase
      .from('auction_listings')
      .select(`
        id,
        display_order,
        listing_id,
        cattle_listings (
          id,
          listing_no,
          listing_date,
          company_id,
          breed,
          gender,
          grade,
          marbling_score,
          trace_no,
          carcass_weight,
          status,
          companies (
            id,
            name
          )
        )
      `)
      .eq('auction_id', currentRound.id)
      .order('display_order', { ascending: true });

    // 같은 세션의 전체 회차 정보 조회 (진행 상황 파악용)
    const { data: allRounds } = await supabase
      .from('auctions')
      .select('id, round_no, status, started_at, ended_at')
      .eq('session_id', currentRound.session_id)
      .order('round_no', { ascending: true });

    const roundListingMap = await buildRoundListingMap(allRounds || []);

    return NextResponse.json({
      currentRound: {
        ...currentRound,
        listings: auctionListings || [],
      },
      allRounds: allRounds || [],
      totalRounds: allRounds?.length || 0,
      roundListingMap,
    });
  } catch (error) {
    console.error('현재 회차 조회 오류:', error);
    return NextResponse.json(
      { error: '현재 회차 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
