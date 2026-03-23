import { getAdminClient } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { createNotificationForAllWithTemplate } from '@/lib/notifications';
import { format } from 'date-fns';

const supabase = getAdminClient();

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    if (!token || token.userType !== 'admin_user') {
      return NextResponse.json({ error: '관리자만 접근 가능합니다.' }, { status: 403 });
    }

    const body = await request.json();
    const { auctionDate, durationMin } = body;

    if (!auctionDate) {
      return NextResponse.json({ error: '경매일은 필수입니다.' }, { status: 400 });
    }

    const { data: approvedListings, error: listingsError } = await supabase
      .from('cattle_listings')
      .select('id')
      .eq('listing_date', auctionDate)
      .in('status', ['approved', 'auction', 'closed']);

    if (listingsError) {
      return NextResponse.json({ error: listingsError.message }, { status: 500 });
    }

    if (!approvedListings || approvedListings.length === 0) {
      return NextResponse.json({ error: '해당일에 승인된 상장이 없습니다.' }, { status: 400 });
    }

    const listingIds = approvedListings.map((l) => l.id);

    const { data: lastRound } = await supabase
      .from('auctions')
      .select('round_no, session_id')
      .eq('auction_date', auctionDate)
      .not('round_no', 'is', null)
      .order('round_no', { ascending: false })
      .limit(1)
      .single();

    const roundNo = (lastRound?.round_no || 0) + 1;
    const sessionId = lastRound?.session_id || null;

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
      nextSeq = parseInt(lastAuction.auction_no.split('-')[1]) + 1;
    }

    const auctionNo = `${dateCode}-${String(nextSeq).padStart(3, '0')}`;
    const now = new Date();
    const startTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;

    const insertData: Record<string, any> = {
      auction_date: auctionDate,
      auction_no: auctionNo,
      title: `${format(new Date(auctionDate), 'yyyy년 MM월 dd일')} ${roundNo}차 경매`,
      status: 'open',
      round_no: roundNo,
      started_at: now.toISOString(),
      start_time: startTime,
      auto_next_round: false,
      started_by: (token.name as string) || null,
    };

    if (durationMin) {
      insertData.round_duration_min = durationMin;
      const endMinutes = (now.getHours() * 60 + now.getMinutes() + durationMin) % 1440;
      const pad = (n: number) => String(n).padStart(2, '0');
      insertData.end_time = `${pad(Math.floor(endMinutes / 60))}:${pad(endMinutes % 60)}:00`;
    }

    if (sessionId) {
      insertData.session_id = sessionId;
    }

    const { data: auction, error: insertError } = await supabase
      .from('auctions')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    if (!sessionId) {
      await supabase
        .from('auctions')
        .update({ session_id: auction.id })
        .eq('id', auction.id);
      auction.session_id = auction.id;
    }

    const auctionListings = listingIds.map((listingId: string, idx: number) => ({
      auction_id: auction.id,
      listing_id: listingId,
      display_order: idx,
    }));

    await supabase.from('auction_listings').insert(auctionListings);

    await supabase
      .from('cattle_listings')
      .update({ status: 'auction' })
      .in('id', listingIds);

    createNotificationForAllWithTemplate(
      'auction_start',
      { roundNo: String(roundNo), count: String(listingIds.length) },
      '/'
    ).catch(() => {});

    return NextResponse.json({
      round: auction,
      listingCount: listingIds.length,
      message: `${roundNo}차 경매가 시작되었습니다. (${listingIds.length}두)`,
    }, { status: 201 });
  } catch (error) {
    console.error('경매 시작 오류:', error);
    return NextResponse.json(
      { error: '경매 시작 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
