import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';

const supabase = getAdminClient();

// POST: auction_id가 null인 기존 bid들에 올바른 auction_id 설정
export async function POST(request: NextRequest) {
  try {
    const { data: nullBids, error: fetchError } = await supabase
      .from('bids')
      .select('id, part_id, listing_id, created_at, cattle_parts(listing_id)')
      .is('auction_id', null);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!nullBids || nullBids.length === 0) {
      return NextResponse.json({ message: 'No bids with null auction_id', updated: 0 });
    }

    let updated = 0;
    let failed = 0;

    for (const bid of nullBids) {
      const listingId = bid.listing_id || (bid.cattle_parts as any)?.listing_id;
      if (!listingId) { failed++; continue; }

      const { data: auctionLinks } = await supabase
        .from('auction_listings')
        .select('auction_id, auctions(id, round_no, status, started_at, ended_at, round_duration_min)')
        .eq('listing_id', listingId);

      if (!auctionLinks || auctionLinks.length === 0) { failed++; continue; }

      const bidTime = new Date(bid.created_at).getTime();
      let matchedAuctionId: string | null = null;

      // 시간 구간으로 매칭 (가장 늦게 시작된 라운드 우선)
      const sorted = auctionLinks
        .filter((al: any) => al.auctions?.started_at)
        .sort((a: any, b: any) =>
          new Date(b.auctions.started_at).getTime() - new Date(a.auctions.started_at).getTime()
        );

      for (const al of sorted) {
        const auction = (al as any).auctions;
        const start = new Date(auction.started_at).getTime();
        const end = auction.ended_at
          ? new Date(auction.ended_at).getTime()
          : start + (auction.round_duration_min || 1440) * 60 * 1000;
        if (bidTime >= start && bidTime < end) {
          matchedAuctionId = al.auction_id;
          break;
        }
      }

      // 시간 매칭 실패 시 가장 가까운 이전 라운드
      if (!matchedAuctionId && sorted.length > 0) {
        for (const al of sorted) {
          const start = new Date((al as any).auctions.started_at).getTime();
          if (bidTime >= start) {
            matchedAuctionId = al.auction_id;
            break;
          }
        }
      }

      // 단일 라운드인 경우
      if (!matchedAuctionId && auctionLinks.length === 1) {
        matchedAuctionId = auctionLinks[0].auction_id;
      }

      if (matchedAuctionId) {
        await supabase.from('bids').update({ auction_id: matchedAuctionId }).eq('id', bid.id);
        updated++;
      } else {
        failed++;
      }
    }

    return NextResponse.json({
      message: `Updated ${updated} bids, ${failed} failed`,
      total: nullBids.length,
      updated,
      failed,
    });
  } catch (error) {
    console.error('Fix auction_id error:', error);
    return NextResponse.json({ error: 'Error fixing auction_id' }, { status: 500 });
  }
}
