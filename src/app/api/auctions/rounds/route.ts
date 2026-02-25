import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getToken } from 'next-auth/jwt';
import { format } from 'date-fns';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function calcRoundTimes(round: any) {
  const startTime = round.startTime || '08:30';
  const [h, m] = startTime.split(':').map(Number);
  const roundStartMin = h * 60 + m;
  const roundEndMin = roundStartMin + (round.durationMin || 20);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    start_time: `${pad(Math.floor(roundStartMin / 60))}:${pad(roundStartMin % 60)}:00`,
    end_time: `${pad(Math.floor(roundEndMin / 60))}:${pad(roundEndMin % 60)}:00`,
  };
}

// POST: 회차별 경매 세션 생성
// 관리자가 상장 배정 후 경매 시작 버튼을 눌렀을 때 호출
// body: { auctionDate, title, rounds: [{ listingIds: string[] }], roundDurationMin, termDurationMin }
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    if (!token || token.userType !== 'admin_user') {
      return NextResponse.json({ error: '관리자만 접근 가능합니다.' }, { status: 403 });
    }

    const body = await request.json();
    const { auctionDate, title, rounds } = body;

    if (!auctionDate || !rounds || rounds.length === 0) {
      return NextResponse.json(
        { error: '경매일과 회차 정보는 필수입니다.' },
        { status: 400 }
      );
    }

    // 기존 해당 날짜의 scheduled(저장만 된) 회차가 있으면 삭제 후 새로 생성
    const { data: existingScheduled } = await supabase
      .from('auctions')
      .select('id')
      .eq('auction_date', auctionDate)
      .eq('status', 'scheduled')
      .not('round_no', 'is', null);

    if (existingScheduled && existingScheduled.length > 0) {
      const existingIds = existingScheduled.map(r => r.id);
      await supabase.from('auction_listings').delete().in('auction_id', existingIds);
      await supabase.from('auctions').delete().in('id', existingIds);
    }

    // 경매번호 생성용 date code
    const dateCode = auctionDate.replace(/-/g, '').slice(2);

    const { data: lastAuction } = await supabase
      .from('auctions')
      .select('auction_no')
      .like('auction_no', `${dateCode}-%`)
      .order('auction_no', { ascending: false })
      .limit(1)
      .single();

    let nextSeq = 1;
    if (lastAuction?.auction_no) {
      const lastSeq = parseInt(lastAuction.auction_no.split('-')[1]);
      nextSeq = lastSeq + 1;
    }

    const createdRounds: any[] = [];
    let sessionId: string | null = null;

    for (let i = 0; i < rounds.length; i++) {
      const round = rounds[i];
      const roundNo = i + 1;
      const auctionNo = `${dateCode}-${String(nextSeq + i).padStart(3, '0')}`;

      const roundDuration = round.durationMin || 20;
      const roundTerm = round.termDurationMin ?? 10;
      const times = calcRoundTimes(round);

      const insertData: Record<string, any> = {
        auction_date: auctionDate,
        auction_no: auctionNo,
        title: title || `${format(new Date(auctionDate), 'yyyy년 MM월 dd일')} 경매`,
        status: roundNo === 1 ? 'open' : 'scheduled',
        round_no: roundNo,
        round_duration_min: roundDuration,
        term_duration_min: roundTerm,
        auto_next_round: true,
        ...(roundNo === 1 ? { started_at: new Date().toISOString() } : {}),
        ...times,
      };

      if (sessionId) {
        insertData.session_id = sessionId;
      }

      const { data: auction, error } = await supabase
        .from('auctions')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error(`회차 ${roundNo} 생성 오류:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // 1회차의 id를 session_id로 사용
      if (roundNo === 1) {
        sessionId = auction.id;
        await supabase
          .from('auctions')
          .update({ session_id: auction.id })
          .eq('id', auction.id);
        auction.session_id = auction.id;
      }

      // 상장 연결
      if (round.listingIds && round.listingIds.length > 0) {
        const auctionListings = round.listingIds.map(
          (listingId: string, idx: number) => ({
            auction_id: auction.id,
            listing_id: listingId,
            display_order: idx,
          })
        );

        await supabase.from('auction_listings').insert(auctionListings);

        await supabase
          .from('cattle_listings')
          .update({ status: 'auction' })
          .in('id', round.listingIds);
      }

      createdRounds.push(auction);
    }

    return NextResponse.json({
      sessionId,
      rounds: createdRounds,
      message: `${rounds.length}개 회차가 생성되었습니다. 1회차가 시작됩니다.`,
    }, { status: 201 });
  } catch (error) {
    console.error('회차별 경매 생성 오류:', error);
    return NextResponse.json(
      { error: '회차별 경매 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// PUT: 회차 배정만 저장 (경매 시작 없이, scheduled 상태)
export async function PUT(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    if (!token || token.userType !== 'admin_user') {
      return NextResponse.json({ error: '관리자만 접근 가능합니다.' }, { status: 403 });
    }

    const body = await request.json();
    const { auctionDate, rounds } = body;

    if (!auctionDate || !rounds || rounds.length === 0) {
      return NextResponse.json({ error: '경매일과 회차 정보는 필수입니다.' }, { status: 400 });
    }

    // 기존 해당 날짜의 scheduled 회차 삭제 (open/closed는 건드리지 않음)
    const { data: existingRounds } = await supabase
      .from('auctions')
      .select('id')
      .eq('auction_date', auctionDate)
      .eq('status', 'scheduled')
      .not('round_no', 'is', null);

    if (existingRounds && existingRounds.length > 0) {
      const existingIds = existingRounds.map(r => r.id);
      await supabase.from('auction_listings').delete().in('auction_id', existingIds);
      await supabase.from('auctions').delete().in('id', existingIds);
    }

    const dateCode = auctionDate.replace(/-/g, '').slice(2);

    const { data: lastAuction } = await supabase
      .from('auctions')
      .select('auction_no')
      .like('auction_no', `${dateCode}-%`)
      .order('auction_no', { ascending: false })
      .limit(1)
      .single();

    let nextSeq = 1;
    if (lastAuction?.auction_no) {
      const lastSeq = parseInt(lastAuction.auction_no.split('-')[1]);
      nextSeq = lastSeq + 1;
    }

    const createdRounds: any[] = [];
    let sessionId: string | null = null;

    for (let i = 0; i < rounds.length; i++) {
      const round = rounds[i];
      const roundNo = i + 1;
      const auctionNo = `${dateCode}-${String(nextSeq + i).padStart(3, '0')}`;

      const roundDuration = round.durationMin || 20;
      const roundTerm = round.termDurationMin ?? 10;
      const putTimes = calcRoundTimes(round);

      const insertData: Record<string, any> = {
        auction_date: auctionDate,
        auction_no: auctionNo,
        title: `${format(new Date(auctionDate), 'yyyy년 MM월 dd일')} 경매`,
        status: 'scheduled',
        round_no: roundNo,
        round_duration_min: roundDuration,
        term_duration_min: roundTerm,
        auto_next_round: true,
        ...putTimes,
      };

      if (sessionId) {
        insertData.session_id = sessionId;
      }

      const { data: auction, error } = await supabase
        .from('auctions')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error(`회차 ${roundNo} 저장 오류:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (roundNo === 1) {
        sessionId = auction.id;
        await supabase.from('auctions').update({ session_id: auction.id }).eq('id', auction.id);
        auction.session_id = auction.id;
      }

      if (round.listingIds && round.listingIds.length > 0) {
        const auctionListings = round.listingIds.map(
          (listingId: string, idx: number) => ({
            auction_id: auction.id,
            listing_id: listingId,
            display_order: idx,
          })
        );
        await supabase.from('auction_listings').insert(auctionListings);
      }

      createdRounds.push(auction);
    }

    return NextResponse.json({
      sessionId,
      rounds: createdRounds,
      message: `${rounds.length}개 회차 배정이 저장되었습니다.`,
    });
  } catch (error) {
    console.error('회차 배정 저장 오류:', error);
    return NextResponse.json(
      { error: '회차 배정 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// GET: 세션별 회차 목록 조회 (배정 상장 포함)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const auctionDate = searchParams.get('auctionDate');

    let query = supabase
      .from('auctions')
      .select('*')
      .not('round_no', 'is', null)
      .order('round_no', { ascending: true });

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    if (auctionDate) {
      query = query.eq('auction_date', auctionDate);
    }

    const { data: rounds, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!rounds || rounds.length === 0) {
      return NextResponse.json([]);
    }

    const roundIds = rounds.map((r: any) => r.id);
    const { data: auctionListings, error: listingsError } = await supabase
      .from('auction_listings')
      .select('auction_id, listing_id, display_order')
      .in('auction_id', roundIds)
      .order('display_order', { ascending: true });

    if (listingsError) {
      return NextResponse.json({ error: listingsError.message }, { status: 500 });
    }

    const listingsByAuction = new Map<string, string[]>();
    for (const al of auctionListings || []) {
      const list = listingsByAuction.get(al.auction_id) || [];
      list.push(al.listing_id);
      listingsByAuction.set(al.auction_id, list);
    }

    const result = rounds.map((r: any) => ({
      ...r,
      listingIds: listingsByAuction.get(r.id) || [],
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('회차 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '회차 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE: 해당 날짜의 경매 초기화 (회차 삭제 + 상장 상태 복원)
export async function DELETE(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    if (!token || token.userType !== 'admin_user') {
      return NextResponse.json({ error: '관리자만 접근 가능합니다.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const auctionDate = searchParams.get('auctionDate');

    if (!auctionDate) {
      return NextResponse.json({ error: '경매일이 필요합니다.' }, { status: 400 });
    }

    const { data: existingRounds } = await supabase
      .from('auctions')
      .select('id')
      .eq('auction_date', auctionDate)
      .not('round_no', 'is', null);

    if (!existingRounds || existingRounds.length === 0) {
      return NextResponse.json({ message: '초기화할 경매가 없습니다.' });
    }

    const roundIds = existingRounds.map((r) => r.id);

    // 배정된 상장 ID 수집
    const { data: auctionListings } = await supabase
      .from('auction_listings')
      .select('listing_id')
      .in('auction_id', roundIds);

    const listingIds = [...new Set((auctionListings || []).map((al) => al.listing_id))];

    // 입찰 데이터 삭제
    const { data: partIds } = await supabase
      .from('cattle_parts')
      .select('id')
      .in('listing_id', listingIds.length > 0 ? listingIds : ['__none__']);

    if (partIds && partIds.length > 0) {
      await supabase
        .from('bids')
        .delete()
        .in('part_id', partIds.map((p) => p.id));
    }

    // auction_listings 삭제
    await supabase.from('auction_listings').delete().in('auction_id', roundIds);

    // auctions 삭제
    await supabase.from('auctions').delete().in('id', roundIds);

    // 상장 상태를 approved로 복원
    if (listingIds.length > 0) {
      await supabase
        .from('cattle_listings')
        .update({ status: 'approved' })
        .in('id', listingIds);

      // cattle_parts의 낙찰 정보도 초기화
      await supabase
        .from('cattle_parts')
        .update({
          bid_price: null,
          bid_amount: null,
          winning_dealer_id: null,
          bid_at: null,
        })
        .in('listing_id', listingIds);
    }

    return NextResponse.json({
      message: `${auctionDate} 경매가 초기화되었습니다. (${existingRounds.length}개 회차 삭제, ${listingIds.length}개 상장 복원)`,
    });
  } catch (error) {
    console.error('경매 초기화 오류:', error);
    return NextResponse.json(
      { error: '경매 초기화 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
