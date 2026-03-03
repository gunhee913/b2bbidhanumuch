import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // 1. 활성 중도매인 목록
    const { data: dealers, error: dealerError } = await supabase
      .from('dealers')
      .select('id, dealer_no, name, phone')
      .eq('status', 'active')
      .order('dealer_no', { ascending: true });

    if (dealerError) {
      return NextResponse.json({ error: dealerError.message }, { status: 500 });
    }

    // 2. 거래 내역 — 누적(잔고용) + 당일분 분리
    const { data: txAll } = await supabase
      .from('dealer_transactions')
      .select('dealer_id, type, amount, created_at')
      .eq('status', 'active')
      .lte('created_at', `${date}T23:59:59.999`);

    const cumDepositMap: Record<string, number> = {};
    const cumWithdrawMap: Record<string, number> = {};
    const todayDepositMap: Record<string, number> = {};
    const todayWithdrawMap: Record<string, number> = {};

    (txAll || []).forEach((tx: any) => {
      const did = tx.dealer_id;
      const amt = Number(tx.amount);
      const txDate = tx.created_at?.slice(0, 10);

      if (tx.type === 'deposit') {
        cumDepositMap[did] = (cumDepositMap[did] || 0) + amt;
        if (txDate === date) todayDepositMap[did] = (todayDepositMap[did] || 0) + amt;
      } else {
        cumWithdrawMap[did] = (cumWithdrawMap[did] || 0) + amt;
        if (txDate === date) todayWithdrawMap[did] = (todayWithdrawMap[did] || 0) + amt;
      }
    });

    // 3. 낙찰대금 — 누적(잔고용) + 당일분(listing_date 기준) 분리
    const { data: winningParts } = await supabase
      .from('cattle_parts')
      .select(`
        winning_dealer_id,
        bid_amount,
        listing_id
      `)
      .not('winning_dealer_id', 'is', null)
      .not('bid_amount', 'is', null);

    const listingIds = [...new Set((winningParts || []).map((p: any) => p.listing_id))];
    let listingDateMap: Record<string, string> = {};
    if (listingIds.length > 0) {
      const { data: listings } = await supabase
        .from('cattle_listings')
        .select('id, listing_date')
        .in('id', listingIds);
      (listings || []).forEach((l: any) => { listingDateMap[l.id] = l.listing_date; });
    }

    const cumAuctionMap: Record<string, number> = {};
    const todayAuctionMap: Record<string, number> = {};
    (winningParts || []).forEach((part: any) => {
      const did = part.winning_dealer_id;
      const amt = Number(part.bid_amount || 0);
      cumAuctionMap[did] = (cumAuctionMap[did] || 0) + amt;
      if (listingDateMap[part.listing_id] === date) {
        todayAuctionMap[did] = (todayAuctionMap[did] || 0) + amt;
      }
    });

    // 4. 결과 구성
    const balances = (dealers || []).map((dealer: any) => {
      const cumDeposit = cumDepositMap[dealer.id] || 0;
      const cumWithdraw = cumWithdrawMap[dealer.id] || 0;
      const cumAuction = cumAuctionMap[dealer.id] || 0;
      const availableAmount = cumDeposit - cumWithdraw - cumAuction;

      const todayDeposit = todayDepositMap[dealer.id] || 0;
      const todayWithdraw = todayWithdrawMap[dealer.id] || 0;
      const todayAuction = todayAuctionMap[dealer.id] || 0;
      const todayDeduct = todayWithdraw + todayAuction;

      return {
        id: dealer.id,
        dealerNo: dealer.dealer_no,
        dealerName: dealer.name,
        phone: dealer.phone,
        todayDeposit,
        todayDeduct,
        availableAmount,
        totalDeposit: cumDeposit,
        totalWithdraw: cumWithdraw,
        auctionDeduct: cumAuction,
        totalDeduct: cumWithdraw + cumAuction,
      };
    });

    const summary = {
      totalDealers: balances.length,
      totalDeposit: balances.reduce((s: number, b: any) => s + b.totalDeposit, 0),
      totalDeduct: balances.reduce((s: number, b: any) => s + b.totalDeduct, 0),
      totalAvailable: balances.reduce((s: number, b: any) => s + b.availableAmount, 0),
      todayDeposit: balances.reduce((s: number, b: any) => s + b.todayDeposit, 0),
      todayDeduct: balances.reduce((s: number, b: any) => s + b.todayDeduct, 0),
    };

    return NextResponse.json({ balances, summary });
  } catch (error) {
    console.error('잔액 조회 오류:', error);
    return NextResponse.json({ error: '잔액 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
