import { getAdminClient } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { resolveAuth } from '@/lib/resolve-auth';

const supabase = getAdminClient();

// GET: 상장번호로 상장 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ listingNo: string }> }
) {
  try {
    const { listingNo } = await params;

    if (!listingNo) {
      return NextResponse.json(
        { error: '상장번호가 필요합니다.' },
        { status: 400 }
      );
    }

    // 상장 정보 조회 (부위, 업체 정보 포함)
    const { data: listing, error } = await supabase
      .from('cattle_listings')
      .select(`
        *,
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
          winning_dealer_id,
          bid_at,
          created_at,
          updated_at
        )
      `)
      .eq('listing_no', listingNo)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: '상장을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      console.error('상장 조회 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 부위 정보 정렬 (part_no 순)
    if (listing.cattle_parts) {
      listing.cattle_parts.sort((a: any, b: any) => a.part_no - b.part_no);
    }

    // 세션에서 userType 확인
    const auth = await resolveAuth(request);
    console.log('[listings/by-no] auth result:', auth ? { dealerId: auth.dealerId, userType: auth.userType } : 'null');
    console.log('[listings/by-no] request authorization header:', request.headers.get('authorization')?.substring(0, 30) + '...');
    const userType = auth?.userType as string | undefined;
    const isAdmin = userType === 'admin_user';
    const candidateDealerIds = new Set<string>();
    if (auth?.dealerId) candidateDealerIds.add(auth.dealerId);

    // fallback: 쿼리 파라미터 dealerId (resolveAuth 실패 시 사용)
    const { searchParams } = new URL(request.url);
    const queryDealerId = searchParams.get('dealerId');
    if (!auth?.dealerId && queryDealerId) {
      candidateDealerIds.add(queryDealerId);
      console.log('[listings/by-no] using fallback dealerId from query:', queryDealerId);
    }

    console.log('[listings/by-no] candidateDealerIds:', Array.from(candidateDealerIds), 'isAdmin:', isAdmin);

    // 각 부위의 입찰 현황 조회 · auction_id 를 함께 가져와 회차 매핑용으로 사용
    const partIds = (listing.cattle_parts || []).map((p: any) => p.id);
    const bidsByPart: Record<string, any[]> = {};
    // auction_id → round_no 매핑 · 여러 회차에 입찰이 있을 수 있으므로 일괄 조회
    const auctionRoundMap: Record<string, number | null> = {};

    if (partIds.length > 0) {
      const { data: bidsData, error: bidsError } = await supabase
        .from('bids')
        .select(`
          id,
          part_id,
          auction_id,
          dealer_id,
          bid_price,
          bid_amount,
          is_winning,
          created_at,
          dealers (
            id,
            name,
            dealer_no
          )
        `)
        .in('part_id', partIds)
        .order('bid_price', { ascending: false });

      if (bidsError) {
        console.error('입찰 조회 오류:', bidsError);
      }

      // 회차 매핑을 위해 등장한 auction_id 들 모아서 batch 조회
      const auctionIds = Array.from(
        new Set(
          (bidsData || [])
            .map((b: any) => b.auction_id)
            .filter(Boolean),
        ),
      );
      if (auctionIds.length > 0) {
        const { data: auctionsData, error: auctionsError } = await supabase
          .from('auctions')
          .select('id, round_no')
          .in('id', auctionIds);
        if (auctionsError) {
          console.error('회차 조회 오류:', auctionsError);
        }
        (auctionsData || []).forEach((a: any) => {
          auctionRoundMap[a.id] = a.round_no ?? null;
        });
      }

      (bidsData || []).forEach((bid: any) => {
        if (!bidsByPart[bid.part_id]) {
          bidsByPart[bid.part_id] = [];
        }
        bidsByPart[bid.part_id].push({
          id: bid.id,
          dealerId: bid.dealer_id,
          dealerNo: bid.dealers?.dealer_no || '',
          dealerName: bid.dealers?.name || '',
          bidPrice: bid.bid_price,
          bidAmount: bid.bid_amount,
          isWinning: !!bid.is_winning,
          createdAt: bid.created_at,
          auctionId: bid.auction_id || null,
          roundNo: bid.auction_id ? (auctionRoundMap[bid.auction_id] ?? null) : null,
        });
      });
    }

    const formattedListing = {
      id: listing.id,
      listingNo: listing.listing_no,
      listingDate: listing.listing_date,
      companyId: listing.company_id,
      breed: listing.breed,
      gender: listing.gender,
      grade: listing.grade,
      marblingScore: listing.marbling_score,
      monthAge: listing.month_age,
      traceNo: listing.trace_no,
      slaughterHouse: listing.slaughter_house,
      slaughterDate: listing.slaughter_date,
      slaughterNo: listing.slaughter_no,
      carcassWeight: listing.carcass_weight,
      unitPrice: listing.unit_price,
      backFat: listing.back_fat,
      eyeMuscle: listing.eye_muscle,
      meatColor: listing.meat_color,
      fatColor: listing.fat_color,
      texture: listing.texture,
      maturity: listing.maturity,
      processDate: listing.process_date,
      processWeight: listing.process_weight,
      slaughterCert: listing.slaughter_cert,
      gradeCert: listing.grade_cert,
      images: listing.images || [],
      status: listing.status,
      approvedAt: listing.approved_at,
      approvedBy: listing.approved_by,
      createdAt: listing.created_at,
      updatedAt: listing.updated_at,
      createdBy: listing.created_by,
      company: listing.companies ? {
        id: listing.companies.id,
        name: listing.companies.name,
        companyNo: listing.companies.company_no,
      } : null,
      parts: (listing.cattle_parts || []).map((part: any) => {
        const partBids = bidsByPart[part.id] || [];

        const basePartData = {
          id: part.id,
          partNo: part.part_no,
          partName: part.part_name,
          listingPartNo: part.listing_part_no,
          weight: part.weight,
          minPrice: part.min_price,
          isIncluded: part.is_included,
          bidPrice: part.bid_price,
          bidAmount: part.bid_amount,
          winningDealerId: part.winning_dealer_id,
          bidAt: part.bid_at,
        };

        if (isAdmin) {
          const highestBid = partBids.length > 0 ? partBids[0] : null;
          return {
            ...basePartData,
            bidCount: partBids.length,
            highestBid,
            allBids: partBids,
          };
        }

        const myBid = candidateDealerIds.size > 0
          ? partBids.find((b: any) => candidateDealerIds.has(b.dealerId))
          : null;

        const isSettled = ['completed', 'closed'].includes(listing.status);
        const highestBid = partBids.length > 0 ? partBids[0] : null;
        const myBidIsWinning = !!myBid?.isWinning;
        const hasWinner = partBids.some((b: any) => b.isWinning);

        console.log(`[listings/by-no] part ${part.part_name}: bids=${partBids.length}, myBid=${myBid ? JSON.stringify({dealerId: myBid.dealerId, bidPrice: myBid.bidPrice, isWinning: myBid.isWinning}) : 'null'}, hasWinner=${hasWinner}, bidDealerIds=${partBids.map((b: any) => b.dealerId).join(',')}`);

        return {
          ...basePartData,
          bidCount: isSettled ? partBids.length : 0,
          highestBid: (isSettled || hasWinner) ? (highestBid ? { bidPrice: highestBid.bidPrice, bidAmount: highestBid.bidAmount, dealerNo: highestBid.dealerNo, roundNo: highestBid.roundNo ?? null } : null) : null,
          hasWinner,
          allBids: [],
          myBid: myBid ? { bidId: myBid.id, bidPrice: myBid.bidPrice, bidAmount: myBid.bidAmount, isWinning: myBidIsWinning, roundNo: myBid.roundNo ?? null } : null,
        };
      }),
    };

    return NextResponse.json(formattedListing);
  } catch (error) {
    console.error('상장 조회 오류:', error);
    return NextResponse.json(
      { error: '상장 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
