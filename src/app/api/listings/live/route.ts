import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';
import { resolveViewer } from '@/lib/resolve-viewer';

const supabase = getAdminClient();

// GET: 승인된 상장의 실시간 입찰 현황 조회
// 비공개 입찰(sealed-bid) 정책:
// - 관리자/출품업체 뷰: 진행 중에도 전체 입찰 공개 (운영·검수 목적).
// - 그 외(매참인·비로그인): 진행 중 회차에서는 타 매참인의 입찰 정보를 전부 숨긴다.
//   `topBid`/`highestBid` 는 null, `bidCount` 는 0, `allBids` 는 내 입찰만.
//   회차 마감(rank 확정) 후에는 낙찰가·순위가 공개된다.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const listingDate = searchParams.get('listingDate');
    const companyId = searchParams.get('companyId');
    // Phase 1 통합 이후 공판장 필터는 서버에서 무시한다.

    const viewer = await resolveViewer(request);
    const canViewAllBids = viewer.canViewAllBids;
    const viewerDealerId = viewer.dealerId;

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
        marbling_score,
        slaughter_house,
        slaughter_date,
        slaughter_no,
        month_age,
        trace_no,
        carcass_weight,
        unit_price,
        back_fat,
        eye_muscle,
        meat_color,
        fat_color,
        texture,
        maturity,
        process_date,
        process_weight,
        images,
        grade_cert_name:grade_cert->>fileName,
        slaughter_cert_name:slaughter_cert->>fileName,
        status,
        company_id,
        companies (
          id,
          name,
          company_no,
          ceo
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
      .in('status', ['approved', 'auction', 'closed', 'completed'])
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

    // listing_id로 입찰 조회 · 부위별 최고가 tie-break: bid_price DESC, created_at ASC
    const listingIds = (listings || []).map((l: any) => l.id);
    let allBidsRaw: any[] = [];

    if (listingIds.length > 0) {
      const { data: bidsData, error: bidsError } = await supabase
        .from('bids')
        .select(`
          id,
          part_id,
          listing_id,
          dealer_id,
          bid_price,
          bid_amount,
          rank,
          is_winning,
          created_at,
          updated_at,
          updated_by,
          auctions:auction_id (
            round_no
          ),
          dealers (
            id,
            name,
            dealer_no
          )
        `)
        .in('listing_id', listingIds)
        .order('bid_price', { ascending: false })
        .order('created_at', { ascending: true });

      if (bidsError) {
        console.error('입찰 조회 오류:', bidsError);
      } else {
        allBidsRaw = bidsData || [];
      }
    }

    // 부위별 입찰 그룹화
    const bidsByPart: Record<string, any[]> = {};
    allBidsRaw.forEach((bid: any) => {
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
        bidAt: bid.created_at,
        rank: bid.rank,
        isWinning: bid.is_winning,
        // 결과 행의 `n회차` · 입찰이 걸린 회차 (auction 미연결 구 데이터는 null)
        roundNo: bid.auctions?.round_no ?? null,
        updatedAt: bid.updated_at,
        updatedBy: bid.updated_by,
      });
    });

    // 응답 데이터 구성
    const formattedListings = (listings || []).map((listing: any) => {
      const parts = (listing.cattle_parts || [])
        .filter((p: any) => p.is_included)
        .sort((a: any, b: any) => a.part_no - b.part_no)
        .map((part: any) => {
          const partBids = bidsByPart[part.id] || [];
          const isSettled = partBids.some((b: any) => b.rank != null);
          // 비공개 입찰 · 진행 중에는 관리자/출품업체 외 전부 마스킹
          const masked = !canViewAllBids && !isSettled;

          // 정렬이 bid_price DESC, created_at ASC 이므로 첫 row 가 최고가(=마감 후 낙찰가)
          const topRow = partBids.length > 0 ? partBids[0] : null;
          const topBid =
            !masked && topRow
              ? {
                  bidPrice: topRow.bidPrice,
                  bidAt: topRow.bidAt,
                  isMine: !!viewerDealerId && topRow.dealerId === viewerDealerId,
                }
              : null;
          const highestBid = masked ? null : topRow;
          const exposedBids = masked
            ? partBids.filter((b: any) => b.dealerId === viewerDealerId)
            : partBids;

          return {
            id: part.id,
            partNo: part.part_no,
            partName: part.part_name,
            listingPartNo:
              part.listing_part_no ||
              `${listing.listing_no}-${String(part.part_no).padStart(2, '0')}`,
            weight: part.weight,
            minPrice: part.min_price,
            // 진행 중 입찰 건수는 "참여 여부" 자체가 정보라 함께 숨긴다
            bidCount: masked ? 0 : partBids.length,
            highestBid,
            topBid,
            allBids: exposedBids,
          };
        });

      return {
        id: listing.id,
        listingNo: listing.listing_no,
        listingDate: listing.listing_date,
        breed: listing.breed,
        gender: listing.gender,
        grade: listing.grade,
        marblingScore: listing.marbling_score,
        slaughterHouse: listing.slaughter_house || '',
        slaughterDate: listing.slaughter_date,
        slaughterNo: listing.slaughter_no,
        monthAge: listing.month_age,
        traceNo: listing.trace_no,
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
        images: listing.images || [],
        // 증명서 파일(base64)은 리스트에 싣지 않고 유무만 · 파일은 /api/listings/[id]/certs 지연 로드
        hasGradeCert: !!listing.grade_cert_name,
        hasSlaughterCert: !!listing.slaughter_cert_name,
        status: listing.status,
        companyId: listing.company_id,
        companyName: listing.companies?.name || '',
        companyNo: listing.companies?.company_no,
        companyCeo: listing.companies?.ceo || '',
        parts,
      };
    });

    // 통계 계산 (진행 중 최고가 × 중량 합계)
    let totalParts = 0;
    let partsWithBids = 0;
    let totalBidAmount = 0;

    formattedListings.forEach((listing: any) => {
      listing.parts.forEach((part: any) => {
        totalParts++;
        if (part.bidCount > 0) {
          partsWithBids++;
          const topPrice = part.topBid?.bidPrice ?? part.highestBid?.bidPrice ?? 0;
          totalBidAmount += topPrice * (part.weight ?? 0);
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
      },
    });
  } catch (error) {
    console.error('실시간 상장 조회 오류:', error);
    return NextResponse.json(
      { error: '실시간 상장 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
