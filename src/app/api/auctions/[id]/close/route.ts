import { getAdminClient } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { createNotificationWithTemplate } from '@/lib/notifications';

const supabase = getAdminClient();

// POST: 경매(회차) 마감 + 다음 회차 자동 시작
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    const isAdmin = token?.userType === 'admin_user';
    const operatorName = isAdmin ? ((token?.name as string) || '관리자') : '자동종료';

    const { data: auction, error: fetchError } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: '경매를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (auction.status === 'closed') {
      return NextResponse.json({
        auction,
        alreadyClosed: true,
        message: '이미 마감된 경매입니다.',
      });
    }

    if (auction.status !== 'open') {
      return NextResponse.json(
        { error: '진행 중인 경매만 마감할 수 있습니다.' },
        { status: 400 }
      );
    }

    const isRoundAuction = auction.round_no != null;

    if (isRoundAuction) {
      const { error: closeError } = await supabase.rpc('close_round', {
        p_auction_id: id,
      });

      if (closeError) {
        console.error('회차 마감 오류:', closeError);
        return NextResponse.json({ error: closeError.message }, { status: 500 });
      }

      await supabase
        .from('auctions')
        .update({ ended_by: operatorName })
        .eq('id', id);

      // 다음 회차 자동 시작 처리 (기존 사전 배정된 라운드)
      let nextRound = null;
      if (auction.auto_next_round && auction.session_id) {
        const { data: next } = await supabase
          .from('auctions')
          .select('*')
          .eq('session_id', auction.session_id)
          .eq('round_no', auction.round_no + 1)
          .eq('status', 'scheduled')
          .single();

        if (next) {
          const termMs = (auction.term_duration_min || 2) * 60 * 1000;
          const startAt = new Date(Date.now() + termMs).toISOString();

          const { data: updated } = await supabase
            .from('auctions')
            .update({
              status: 'open',
              started_at: startAt,
            })
            .eq('id', next.id)
            .select()
            .single();

          nextRound = updated;
        }
      }

      const { data: updatedAuction } = await supabase
        .from('auctions')
        .select('*')
        .eq('id', id)
        .single();

      // 회차별 경매 결과 알림 발송
      try {
        const { data: allBids } = await supabase
          .from('bids')
          .select('dealer_id, bid_amount, is_winning')
          .eq('auction_id', id);

        if (allBids && allBids.length > 0) {
          const dealerStats: Record<string, { total: number; success: number; failed: number; amount: number }> = {};

          for (const bid of allBids) {
            const did = bid.dealer_id;
            if (!dealerStats[did]) {
              dealerStats[did] = { total: 0, success: 0, failed: 0, amount: 0 };
            }
            dealerStats[did].total++;
            if (bid.is_winning) {
              dealerStats[did].success++;
              dealerStats[did].amount += Number(bid.bid_amount || 0);
            } else {
              dealerStats[did].failed++;
            }
          }

          const roundNo = String(auction.round_no || 1);

          for (const [dealerId, stats] of Object.entries(dealerStats)) {
            createNotificationWithTemplate(
              dealerId,
              'auction_result',
              {
                roundNo,
                totalCount: String(stats.total),
                successCount: String(stats.success),
                failedCount: String(stats.failed),
                bidAmount: stats.amount.toLocaleString(),
              },
              '/bids?tab=경매결과'
            ).catch(() => {});
          }
        }
      } catch (notifErr) {
        console.error('경매 결과 알림 발송 오류:', notifErr);
      }

      return NextResponse.json({
        auction: updatedAuction,
        nextRound,
        message: nextRound
          ? `경매가 마감되었습니다. 유찰분 ${auction.term_duration_min || 10}분 후 재경매가 시작됩니다.`
          : `경매가 마감되었습니다.`,
      });
    }

    // 기존 단일 경매 마감 로직 (close_auction)
    const { error: closeError } = await supabase.rpc('close_auction', {
      p_auction_id: id,
    });

    if (closeError) {
      console.error('경매 마감 오류:', closeError);
      return NextResponse.json({ error: closeError.message }, { status: 500 });
    }

    await supabase
      .from('auctions')
      .update({ ended_by: operatorName })
      .eq('id', id);

    const { data: updatedAuction } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', id)
      .single();

    const { data: winningBids } = await supabase
      .from('bids')
      .select(`
        id,
        part_id,
        dealer_id,
        bid_price,
        bid_amount,
        dealers (
          id,
          name
        ),
        cattle_parts (
          id,
          part_name,
          listing_id
        )
      `)
      .eq('auction_id', id)
      .eq('is_winning', true);

    // 단일 경매 마감 결과 알림 발송
    try {
      const { data: allBidsForNotif } = await supabase
        .from('bids')
        .select('dealer_id, bid_amount, is_winning')
        .eq('auction_id', id);

      if (allBidsForNotif && allBidsForNotif.length > 0) {
        const dealerStats: Record<string, { total: number; success: number; failed: number; amount: number }> = {};

        for (const bid of allBidsForNotif) {
          const did = bid.dealer_id;
          if (!dealerStats[did]) {
            dealerStats[did] = { total: 0, success: 0, failed: 0, amount: 0 };
          }
          dealerStats[did].total++;
          if (bid.is_winning) {
            dealerStats[did].success++;
            dealerStats[did].amount += Number(bid.bid_amount || 0);
          } else {
            dealerStats[did].failed++;
          }
        }

        const roundNo = String(auction.round_no || 1);

        for (const [dealerId, stats] of Object.entries(dealerStats)) {
          createNotificationWithTemplate(
            dealerId,
            'auction_result',
            {
              roundNo,
              totalCount: String(stats.total),
              successCount: String(stats.success),
              failedCount: String(stats.failed),
              bidAmount: stats.amount.toLocaleString(),
            },
            '/bids?tab=경매결과'
          ).catch(() => {});
        }
      }
    } catch (notifErr) {
      console.error('경매 결과 알림 발송 오류:', notifErr);
    }

    return NextResponse.json({
      auction: updatedAuction,
      winningBids: winningBids || [],
      message: '경매가 마감되었습니다. 낙찰자가 결정되었습니다.',
    });
  } catch (error) {
    console.error('경매 마감 오류:', error);
    return NextResponse.json(
      { error: '경매 마감 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
