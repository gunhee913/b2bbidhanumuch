import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';
import { todayKst } from '@/lib/utils';
import { fetchWinningBids, selectIn } from '@/lib/supabase-batch';
import { fetchCarcassSettlements } from '@/lib/carcass-settlements';

const supabase = getAdminClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || todayKst();

    // 1. 활성 중도매인 목록 (+ 거래 구분 · 총 한도)
    type DealerRow = { id: string; dealer_no: string; name: string; phone: string; account_type?: string | null; credit_limit?: number | string | null };
    let dealers: DealerRow[] | null = null;
    let dealerError: { message: string } | null = null;
    {
      const r = await supabase
        .from('dealers')
        .select('id, dealer_no, name, phone, account_type, credit_limit')
        .eq('status', 'active')
        .order('dealer_no', { ascending: true });
      dealers = r.data as DealerRow[] | null;
      dealerError = r.error;
    }

    // 20261021_001 마이그레이션 전 DB · 컬럼이 없으면 모두 선수로 보고 계속 간다
    if (dealerError && /account_type|credit_limit/.test(dealerError.message)) {
      const r = await supabase
        .from('dealers')
        .select('id, dealer_no, name, phone')
        .eq('status', 'active')
        .order('dealer_no', { ascending: true });
      dealers = r.data as DealerRow[] | null;
      dealerError = r.error;
    }

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
    const auctionDatesByDealer: Record<string, Set<string>> = {};
    winningBids.forEach((bid: any) => {
      const did = bid.dealer_id;
      const amt = Number(bid.bid_amount || 0);
      const listingDate = partListingDateMap[bid.part_id] || '';
      cumAuctionMap[did] = (cumAuctionMap[did] || 0) + amt;
      if (listingDate === date) {
        todayAuctionMap[did] = (todayAuctionMap[did] || 0) + amt;
      }
      if (listingDate && listingDate <= date) {
        (auctionDatesByDealer[did] ||= new Set()).add(listingDate);
      }
    });

    // 3-b. 지육 경락대금 — 농협 내부망 (연동 전까지 더미) · 조회일 이전 것만 누적
    const carcass = await fetchCarcassSettlements(auctionDatesByDealer);
    const cumCarcassMap: Record<string, number> = {};
    const todayCarcassMap: Record<string, number> = {};
    carcass.forEach((s) => {
      if (s.date > date) return;
      cumCarcassMap[s.dealerId] = (cumCarcassMap[s.dealerId] || 0) + s.amount;
      if (s.date === date) todayCarcassMap[s.dealerId] = (todayCarcassMap[s.dealerId] || 0) + s.amount;
    });

    // 4. 결과 구성
    //    입찰 가능 = 입금 − 출금 − 부분육 낙찰 − 지육 낙찰 (원장 잔액) · 선수든 외상이든 같다
    //    외상은 이 잔액이 곧 「잔여 한도」, 사용(미결제 외상) = 총 한도 − 잔여 (0 미만이면 0)
    //    총 한도는 천장일 뿐 잔액에 더하지 않는다 → 잔여 한도가 총 한도를 넘지 않는다
    const balances = (dealers || []).map((dealer: any) => {
      const accountType: 'prepaid' | 'credit' = dealer.account_type === 'credit' ? 'credit' : 'prepaid';
      const creditLimit = accountType === 'credit' ? Number(dealer.credit_limit || 0) : 0;
      const cumDeposit = cumDepositMap[dealer.id] || 0;
      const cumWithdraw = cumWithdrawMap[dealer.id] || 0;
      const cumAuction = cumAuctionMap[dealer.id] || 0;
      const cumCarcass = cumCarcassMap[dealer.id] || 0;
      const availableAmount = cumDeposit - cumWithdraw - cumAuction - cumCarcass;
      const usedCredit = accountType === 'credit' ? Math.max(0, creditLimit - availableAmount) : 0;

      const todayDeposit = todayDepositMap[dealer.id] || 0;
      const todayWithdraw = todayWithdrawMap[dealer.id] || 0;
      const todayAuction = todayAuctionMap[dealer.id] || 0;
      const todayCarcass = todayCarcassMap[dealer.id] || 0;
      const todayDeduct = todayWithdraw + todayAuction + todayCarcass;

      return {
        id: dealer.id,
        dealerNo: dealer.dealer_no,
        dealerName: dealer.name,
        phone: dealer.phone,
        accountType,
        creditLimit,
        usedCredit,
        todayDeposit,
        todayDeduct,
        availableAmount,
        totalDeposit: cumDeposit,
        totalWithdraw: cumWithdraw,
        auctionDeduct: cumAuction,
        carcassDeduct: cumCarcass,
        totalDeduct: cumWithdraw + cumAuction + cumCarcass,
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
