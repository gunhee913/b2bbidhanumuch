import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';
import { todayKst } from '@/lib/utils';
import { fetchWinningBids, selectIn } from '@/lib/supabase-batch';

const supabase = getAdminClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || todayKst();

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

    // 3. 낙찰대금 — bids 테이블의 is_winning=true 기준 (dealer-transactions API와 동일)
    //    cattle_parts.winning_dealer_id 와 동기화 차이가 있을 수 있어, 거래 내역 페이지와
    //    동일한 데이터 소스를 사용해야 잔액이 일치한다.
    const winningBids = await fetchWinningBids();

    // part_id → listing_date 매핑 (당일 합계용)
    const partIds = [...new Set(winningBids.map((b) => b.part_id))];
    const partListingDateMap: Record<string, string> = {};
    const partsData = await selectIn<any>(
      'cattle_parts',
      'id, cattle_listings(listing_date)',
      'id',
      partIds,
    );
    partsData.forEach((p: any) => {
      partListingDateMap[p.id] = (p.cattle_listings as any)?.listing_date || '';
    });

    const cumAuctionMap: Record<string, number> = {};
    const todayAuctionMap: Record<string, number> = {};
    winningBids.forEach((bid: any) => {
      const did = bid.dealer_id;
      const amt = Number(bid.bid_amount || 0);
      cumAuctionMap[did] = (cumAuctionMap[did] || 0) + amt;
      if (partListingDateMap[bid.part_id] === date) {
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
