import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_PASSWORD = process.env.ADMIN_BID_PASSWORD || '1234';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const dealerId = searchParams.get('dealerId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const date = searchParams.get('date');

    let query = supabase
      .from('dealer_transactions')
      .select(`
        *,
        dealers (
          id,
          dealer_no,
          name,
          phone
        )
      `)
      .order('created_at', { ascending: false });

    if (dealerId) {
      query = query.eq('dealer_id', dealerId);
    }
    if (type && type !== 'all') {
      query = query.eq('type', type);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (date) {
      query = query.gte('created_at', `${date}T00:00:00`)
                    .lt('created_at', `${date}T23:59:59.999`);
    }
    if (startDate) {
      query = query.gte('created_at', `${startDate}T00:00:00`);
    }
    if (endDate) {
      query = query.lte('created_at', `${endDate}T23:59:59.999`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const editIds = (data || []).map((tx: any) => tx.id);
    let editsMap: Record<string, any[]> = {};

    if (editIds.length > 0) {
      const { data: edits } = await supabase
        .from('dealer_transaction_edits')
        .select('*')
        .in('transaction_id', editIds)
        .order('created_at', { ascending: true });

      (edits || []).forEach((e: any) => {
        if (!editsMap[e.transaction_id]) editsMap[e.transaction_id] = [];
        editsMap[e.transaction_id].push({
          editedAt: e.created_at,
          editedBy: e.edited_by,
          previousAmount: Number(e.previous_amount),
          newAmount: Number(e.new_amount),
        });
      });
    }

    const transactions: any[] = (data || []).map((tx: any) => ({
      id: tx.id,
      dealerId: tx.dealer_id,
      dealerNo: tx.dealers?.dealer_no || '',
      dealerName: tx.dealers?.name || '',
      type: tx.type,
      amount: Number(tx.amount),
      balance: Number(tx.balance),
      description: tx.description || '',
      status: tx.status,
      createdBy: tx.created_by || '',
      createdAt: tx.created_at,
      cancelledAt: tx.cancelled_at,
      cancelledBy: tx.cancelled_by,
      cancelReason: tx.cancel_reason,
      editHistory: editsMap[tx.id] || [],
      source: 'manual',
    }));

    // 낙찰(경락)대금 조회 - is_winning 입찰
    let winningBidsQuery = supabase
      .from('bids')
      .select('id, part_id, dealer_id, bid_amount, created_at')
      .eq('is_winning', true)
      .not('bid_amount', 'is', null);

    if (dealerId) {
      winningBidsQuery = winningBidsQuery.eq('dealer_id', dealerId);
    }

    const { data: winningBidsRaw } = await winningBidsQuery;
    const winningBids = winningBidsRaw || [];

    // part_id → listing 정보 매핑
    const partIds = [...new Set(winningBids.map((b: any) => b.part_id))];
    let partListingMap: Record<string, { listingId: string; listingDate: string }> = {};
    if (partIds.length > 0) {
      const { data: partsData } = await supabase
        .from('cattle_parts')
        .select('id, listing_id, cattle_listings(listing_date)')
        .in('id', partIds);
      (partsData || []).forEach((p: any) => {
        partListingMap[p.id] = {
          listingId: p.listing_id,
          listingDate: (p.cattle_listings as any)?.listing_date || '',
        };
      });
    }

    // listing_id → 해당 listing이 속한 모든 회차 정보 (auction_listings 경유)
    const allListingIds = [...new Set(Object.values(partListingMap).map(p => p.listingId).filter(Boolean))];
    // listingDate별로 해당 날짜의 모든 회차 조회
    const allListingDates = [...new Set(Object.values(partListingMap).map(p => p.listingDate).filter(Boolean))];

    interface RoundInfo { roundNo: number; endedAt: string; startedAt: string; }
    let dateRoundsMap: Record<string, RoundInfo[]> = {};

    if (allListingDates.length > 0) {
      const { data: auctionsData } = await supabase
        .from('auctions')
        .select('id, round_no, started_at, ended_at, status, auction_date')
        .eq('status', 'closed')
        .in('auction_date', allListingDates)
        .order('round_no', { ascending: true });

      (auctionsData || []).forEach((a: any) => {
        const aDate = a.auction_date;
        if (!dateRoundsMap[aDate]) dateRoundsMap[aDate] = [];
        dateRoundsMap[aDate].push({
          roundNo: a.round_no || 0,
          startedAt: a.started_at || '',
          endedAt: a.ended_at || '',
        });
      });
    }

    // bid.created_at을 기준으로 어떤 회차에 속하는지 매핑
    const getBidRound = (bidCreatedAt: string, listingDate: string): RoundInfo | null => {
      const rounds = dateRoundsMap[listingDate];
      if (!rounds || rounds.length === 0) return null;

      const bidTime = new Date(bidCreatedAt).getTime();
      for (const round of rounds) {
        const start = new Date(round.startedAt).getTime();
        const end = new Date(round.endedAt).getTime();
        if (bidTime >= start && bidTime <= end) return round;
      }
      // 폴백: bid가 어떤 회차 종료 이전에 생성되었으면 그 회차로 매핑
      for (const round of [...rounds].reverse()) {
        const end = new Date(round.endedAt).getTime();
        if (bidTime <= end) return round;
      }
      // 최종 폴백: 마지막 회차
      return rounds[rounds.length - 1];
    };

    // 딜러 정보 매핑
    const winnerIds = [...new Set(winningBids.map((b: any) => b.dealer_id))];
    let dealerMap: Record<string, any> = {};
    if (winnerIds.length > 0) {
      const { data: dealerRows } = await supabase
        .from('dealers')
        .select('id, dealer_no, name')
        .in('id', winnerIds);
      (dealerRows || []).forEach((d: any) => { dealerMap[d.id] = d; });
    }

    // 딜러 + 상장일 + 회차별로 경락대금 합산
    const dailyMap: Record<string, { dealerId: string; endedAt: string; listingDate: string; roundNo: number; total: number; count: number }> = {};
    winningBids.forEach((bid: any) => {
      const partInfo = partListingMap[bid.part_id] || { listingId: '', listingDate: '' };
      const roundInfo = getBidRound(bid.created_at, partInfo.listingDate);
      const did = bid.dealer_id;
      const listingDate = partInfo.listingDate;
      const roundNo = roundInfo?.roundNo || 0;
      const endedAt = roundInfo?.endedAt || `${listingDate}T00:00:00`;
      const key = `${did}_${listingDate}_${roundNo}`;

      if (!dailyMap[key]) {
        dailyMap[key] = { dealerId: did, endedAt, listingDate, roundNo, total: 0, count: 0 };
      }
      dailyMap[key].total += Number(bid.bid_amount || 0);
      dailyMap[key].count += 1;
    });

    const auctionTxs = Object.entries(dailyMap).map(([key, info]) => {
      const dealer = dealerMap[info.dealerId];
      const dateLabel = info.listingDate.replace(/-/g, '').slice(2);
      const roundLabel = info.roundNo > 0 ? `${info.roundNo}차` : '';
      return {
        id: `auction-${key}`,
        dealerId: info.dealerId,
        dealerNo: dealer?.dealer_no || '',
        dealerName: dealer?.name || '',
        type: 'auction_deduct' as const,
        amount: info.total,
        balance: 0,
        description: `${dateLabel} ${roundLabel} 경락대금 (${info.count}건)`.replace(/\s+/g, ' ').trim(),
        status: 'active',
        createdBy: '시스템',
        createdAt: info.endedAt,
        cancelledAt: null,
        cancelledBy: null,
        cancelReason: null,
        editHistory: [],
        source: 'auction',
      };
    });

    let filteredAuction = auctionTxs;
    if (type && type !== 'all' && type !== 'auction_deduct') {
      filteredAuction = [];
    }
    if (date) {
      filteredAuction = filteredAuction.filter((tx: any) => tx.createdAt.startsWith(date));
    }
    if (startDate) {
      filteredAuction = filteredAuction.filter((tx: any) => tx.createdAt >= `${startDate}T00:00:00`);
    }
    if (endDate) {
      filteredAuction = filteredAuction.filter((tx: any) => tx.createdAt <= `${endDate}T23:59:59.999`);
    }

    const allTransactions = [...transactions, ...filteredAuction]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ transactions: allTransactions });
  } catch (error) {
    return NextResponse.json({ error: '거래 내역 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dealerId, type, amount, description, createdBy, adminPassword } = body;

    if (adminPassword !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: '비밀번호가 일치하지 않습니다.' }, { status: 403 });
    }

    if (!dealerId || !type || !amount) {
      return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 });
    }

    const { data: latestTx } = await supabase
      .from('dealer_transactions')
      .select('balance')
      .eq('dealer_id', dealerId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const currentBalance = latestTx ? Number(latestTx.balance) : 0;
    const newBalance = type === 'deposit'
      ? currentBalance + amount
      : currentBalance - amount;

    if (type === 'withdraw' && newBalance < 0) {
      return NextResponse.json({ error: '잔액이 부족합니다.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('dealer_transactions')
      .insert({
        dealer_id: dealerId,
        type,
        amount,
        balance: newBalance,
        description: description || (type === 'deposit' ? '입금' : '출금'),
        created_by: createdBy || '',
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ transaction: data });
  } catch (error) {
    return NextResponse.json({ error: '거래 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
