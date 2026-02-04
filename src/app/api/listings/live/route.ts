import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: 승인된 상장의 실시간 입찰 현황 조회
// 경매 없이도 승인된 상장에 대한 입찰 현황을 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const listingDate = searchParams.get('listingDate');
    const companyId = searchParams.get('companyId');

    // 승인된 상장 조회 (부위 정보 포함)
    let query = supabase
      .from('cattle_listings')
      .select(`
        id,
        listing_no,
        listing_date,
        breed,
        gender,
        grade,
        status,
        company_id,
        companies (
          id,
          name,
          company_no
        ),
        cattle_parts (
          id,
          part_no,
          part_name,
          listing_part_no,
          weight,
          min_price,
          is_included,
          bid_price,
          bid_amount,
          winning_dealer_id
        )
      `)
      .in('status', ['approved', 'auction']) // 승인됨 또는 경매중
      .order('listing_no', { ascending: true });

    if (listingDate) {
      query = query.eq('listing_date', listingDate);
    }

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data: listings, error } = await query;

    if (error) {
      console.error('상장 조회 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 각 상장의 부위에 대한 입찰 정보 조회
    const listingIds = listings?.map(l => l.id) || [];
    
    // 입찰 정보 조회
    const { data: allBids, error: bidsError } = await supabase
      .from('bids')
      .select(`
        id,
        part_id,
        dealer_id,
        bid_price,
        bid_amount,
        rank,
        is_winning,
        created_at,
        dealers (
          id,
          name,
          company
        )
      `)
      .in('listing_id', listingIds)
      .order('bid_price', { ascending: false });

    if (bidsError) {
      console.error('입찰 조회 오류:', bidsError);
    }

    // 부위별 입찰 그룹화
    const bidsByPart: Record<string, any[]> = {};
    (allBids || []).forEach((bid: any) => {
      if (!bidsByPart[bid.part_id]) {
        bidsByPart[bid.part_id] = [];
      }
      bidsByPart[bid.part_id].push({
        id: bid.id,
        dealerId: bid.dealer_id,
        dealerName: bid.dealers?.name || '',
        dealerCompany: bid.dealers?.company || '',
        bidPrice: bid.bid_price,
        bidAmount: bid.bid_amount,
        bidAt: bid.created_at,
        rank: bid.rank,
        isWinning: bid.is_winning,
      });
    });

    // 응답 데이터 구성
    const formattedListings = (listings || []).map((listing: any) => {
      const parts = (listing.cattle_parts || [])
        .filter((p: any) => p.is_included)
        .sort((a: any, b: any) => a.part_no - b.part_no)
        .map((part: any) => {
          const partBids = bidsByPart[part.id] || [];
          const highestBid = partBids.length > 0 ? partBids[0] : null;
          
          return {
            id: part.id,
            partNo: part.part_no,
            partName: part.part_name,
            listingPartNo: part.listing_part_no || `${listing.listing_no}-${String(part.part_no).padStart(2, '0')}`,
            weight: part.weight,
            minPrice: part.min_price,
            bidCount: partBids.length,
            highestBid: highestBid,
            allBids: partBids,
          };
        });

      return {
        id: listing.id,
        listingNo: listing.listing_no,
        listingDate: listing.listing_date,
        breed: listing.breed,
        gender: listing.gender,
        grade: listing.grade,
        status: listing.status,
        companyId: listing.company_id,
        companyName: listing.companies?.name || '',
        companyNo: listing.companies?.company_no,
        parts,
      };
    });

    // 통계 계산
    let totalParts = 0;
    let partsWithBids = 0;
    let totalBidAmount = 0;

    formattedListings.forEach((listing: any) => {
      listing.parts.forEach((part: any) => {
        totalParts++;
        if (part.bidCount > 0) {
          partsWithBids++;
          totalBidAmount += (part.highestBid?.bidPrice || 0) * part.weight;
        }
      });
    });

    return NextResponse.json({
      listings: formattedListings,
      stats: {
        totalListings: formattedListings.length,
        totalParts,
        partsWithBids,
        partsWithoutBids: totalParts - partsWithBids,
        totalBidAmount: Math.round(totalBidAmount),
      }
    });
  } catch (error) {
    console.error('실시간 상장 조회 오류:', error);
    return NextResponse.json(
      { error: '실시간 상장 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
