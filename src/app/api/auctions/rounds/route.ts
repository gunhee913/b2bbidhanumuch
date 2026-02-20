import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getToken } from 'next-auth/jwt';
import { format } from 'date-fns';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    const {
      auctionDate,
      title,
      rounds,
      roundDurationMin = 5,
      termDurationMin = 2,
    } = body;

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

      const insertData: Record<string, any> = {
        auction_date: auctionDate,
        auction_no: auctionNo,
        title: title || `${format(new Date(auctionDate), 'yyyy년 MM월 dd일')} 경매`,
        status: roundNo === 1 ? 'open' : 'scheduled',
        round_no: roundNo,
        round_duration_min: roundDurationMin,
        term_duration_min: termDurationMin,
        auto_next_round: true,
        ...(roundNo === 1 ? { started_at: new Date().toISOString() } : {}),
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
    const { auctionDate, rounds, roundDurationMin = 5, termDurationMin = 2 } = body;

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

      const insertData: Record<string, any> = {
        auction_date: auctionDate,
        auction_no: auctionNo,
        title: `${format(new Date(auctionDate), 'yyyy년 MM월 dd일')} 경매`,
        status: 'scheduled',
        round_no: roundNo,
        round_duration_min: roundDurationMin,
        term_duration_min: termDurationMin,
        auto_next_round: true,
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

// GET: 세션별 회차 목록 조회
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

    return NextResponse.json(rounds || []);
  } catch (error) {
    console.error('회차 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '회차 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
