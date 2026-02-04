import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: 실시간 입찰 현황
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const auctionId = searchParams.get('auctionId');

    if (!auctionId) {
      return NextResponse.json(
        { error: 'auctionId가 필요합니다.' },
        { status: 400 }
      );
    }

    // 경매 정보 조회
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', auctionId)
      .single();

    if (auctionError) {
      return NextResponse.json(
        { error: '경매를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 경매에 포함된 상장 및 부위 조회
    const { data: auctionListings } = await supabase
      .from('auction_listings')
      .select(`
        listing_id,
        display_order,
        cattle_listings (
          id,
          listing_no,
          grade,
          gender,
          trace_no,
          carcass_weight,
          company_id,
          companies (
            id,
            name
          ),
          cattle_parts (
            id,
            part_no,
            part_name,
            listing_part_no,
            weight,
            min_price,
            is_included
          )
        )
      `)
      .eq('auction_id', auctionId)
      .order('display_order', { ascending: true });

    // 모든 입찰 조회
    const { data: allBids } = await supabase
      .from('bids')
      .select(`
        id,
        part_id,
        dealer_id,
        bid_price,
        bid_amount,
        created_at,
        dealers (
          id,
          name,
          company
        )
      `)
      .eq('auction_id', auctionId)
      .order('bid_price', { ascending: false });

    // 부위별 입찰 현황 정리
    const partBidMap: Record<string, any> = {};
    (allBids || []).forEach((bid: any) => {
      if (!partBidMap[bid.part_id]) {
        partBidMap[bid.part_id] = {
          bids: [],
          highestBid: null,
          bidCount: 0,
        };
      }
      partBidMap[bid.part_id].bids.push(bid);
      partBidMap[bid.part_id].bidCount++;
      if (!partBidMap[bid.part_id].highestBid || bid.bid_price > partBidMap[bid.part_id].highestBid.bid_price) {
        partBidMap[bid.part_id].highestBid = bid;
      }
    });

    // 상장별로 부위 현황 정리
    const listings = (auctionListings || []).map((al: any) => {
      const listing = al.cattle_listings;
      const parts = (listing?.cattle_parts || [])
        .filter((p: any) => p.is_included)
        .map((part: any) => {
          const bidInfo = partBidMap[part.id] || { bids: [], highestBid: null, bidCount: 0 };
          return {
            id: part.id,
            partNo: part.part_no,
            partName: part.part_name,
            listingPartNo: part.listing_part_no,
            weight: part.weight,
            minPrice: part.min_price,
            bidCount: bidInfo.bidCount,
            highestBid: bidInfo.highestBid ? {
              bidPrice: bidInfo.highestBid.bid_price,
              bidAmount: bidInfo.highestBid.bid_amount,
              dealerId: bidInfo.highestBid.dealer_id,
              dealerName: bidInfo.highestBid.dealers?.name,
              dealerCompany: bidInfo.highestBid.dealers?.company,
              bidAt: bidInfo.highestBid.created_at,
            } : null,
            allBids: bidInfo.bids.map((b: any) => ({
              bidPrice: b.bid_price,
              bidAmount: b.bid_amount,
              dealerId: b.dealer_id,
              dealerName: b.dealers?.name,
              bidAt: b.created_at,
            })),
          };
        });

      return {
        id: listing?.id,
        listingNo: listing?.listing_no,
        grade: listing?.grade,
        gender: listing?.gender,
        traceNo: listing?.trace_no,
        carcassWeight: listing?.carcass_weight,
        companyName: listing?.companies?.name,
        displayOrder: al.display_order,
        parts,
        totalParts: parts.length,
        biddedParts: parts.filter((p: any) => p.bidCount > 0).length,
      };
    });

    // 전체 통계
    const totalParts = listings.reduce((sum: number, l: any) => sum + l.totalParts, 0);
    const biddedParts = listings.reduce((sum: number, l: any) => sum + l.biddedParts, 0);
    const totalBids = allBids?.length || 0;

    return NextResponse.json({
      auction: {
        id: auction.id,
        auctionNo: auction.auction_no,
        auctionDate: auction.auction_date,
        title: auction.title,
        status: auction.status,
        startTime: auction.start_time,
        endTime: auction.end_time,
      },
      listings,
      stats: {
        totalListings: listings.length,
        totalParts,
        biddedParts,
        totalBids,
        bidRate: totalParts > 0 ? Math.round((biddedParts / totalParts) * 100) : 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('실시간 입찰 현황 조회 오류:', error);
    return NextResponse.json(
      { error: '입찰 현황 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
