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

    // 2. 해당일 기준 거래 내역 (활성만)
    const { data: txData } = await supabase
      .from('dealer_transactions')
      .select('dealer_id, type, amount')
      .eq('status', 'active')
      .lte('created_at', `${date}T23:59:59.999`);

    const depositMap: Record<string, number> = {};
    const withdrawMap: Record<string, number> = {};
    (txData || []).forEach((tx: any) => {
      const did = tx.dealer_id;
      if (tx.type === 'deposit') {
        depositMap[did] = (depositMap[did] || 0) + Number(tx.amount);
      } else {
        withdrawMap[did] = (withdrawMap[did] || 0) + Number(tx.amount);
      }
    });

    // 3. 낙찰대금 (winning_dealer_id 기준)
    const { data: winningParts } = await supabase
      .from('cattle_parts')
      .select(`
        winning_dealer_id,
        bid_amount
      `)
      .not('winning_dealer_id', 'is', null)
      .not('bid_amount', 'is', null);

    const unsettledMap: Record<string, number> = {};
    (winningParts || []).forEach((part: any) => {
      const did = part.winning_dealer_id;
      if (!unsettledMap[did]) unsettledMap[did] = 0;
      unsettledMap[did] += Number(part.bid_amount || 0);
    });

    // 4. 결과 구성
    const balances = (dealers || []).map((dealer: any) => {
      const totalDeposit = depositMap[dealer.id] || 0;
      const totalWithdraw = withdrawMap[dealer.id] || 0;
      const auctionDeduct = unsettledMap[dealer.id] || 0;
      const totalDeduct = totalWithdraw + auctionDeduct;
      const availableAmount = totalDeposit - totalDeduct;

      return {
        id: dealer.id,
        dealerNo: dealer.dealer_no,
        dealerName: dealer.name,
        phone: dealer.phone,
        totalDeposit,
        totalWithdraw,
        auctionDeduct,
        totalDeduct,
        availableAmount,
      };
    });

    const summary = {
      totalDealers: balances.length,
      totalDeposit: balances.reduce((s: number, b: any) => s + b.totalDeposit, 0),
      totalDeduct: balances.reduce((s: number, b: any) => s + b.totalDeduct, 0),
      totalAvailable: balances.reduce((s: number, b: any) => s + b.availableAmount, 0),
    };

    return NextResponse.json({ balances, summary });
  } catch (error) {
    console.error('잔액 조회 오류:', error);
    return NextResponse.json({ error: '잔액 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
