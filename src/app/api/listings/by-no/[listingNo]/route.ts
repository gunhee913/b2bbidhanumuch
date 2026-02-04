import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
          company_no,
          address
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

    // 각 부위의 입찰 현황 조회
    const partIds = (listing.cattle_parts || []).map((p: any) => p.id);
    const { data: bidsData } = await supabase
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
          name
        )
      `)
      .in('part_id', partIds)
      .order('bid_price', { ascending: false });

    // 부위별 입찰 그룹화
    const bidsByPart: Record<string, any[]> = {};
    (bidsData || []).forEach((bid: any) => {
      if (!bidsByPart[bid.part_id]) {
        bidsByPart[bid.part_id] = [];
      }
      bidsByPart[bid.part_id].push({
        id: bid.id,
        dealerId: bid.dealer_id,
        dealerName: bid.dealers?.name || '',
        bidPrice: bid.bid_price,
        bidAmount: bid.bid_amount,
        createdAt: bid.created_at,
      });
    });

    // snake_case -> camelCase 변환
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
      // 업체 정보
      company: listing.companies ? {
        id: listing.companies.id,
        name: listing.companies.name,
        companyNo: listing.companies.company_no,
        address: listing.companies.address,
      } : null,
      // 부위 정보 (입찰 현황 포함)
      parts: (listing.cattle_parts || []).map((part: any) => {
        const partBids = bidsByPart[part.id] || [];
        const highestBid = partBids.length > 0 ? partBids[0] : null;
        return {
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
          // 입찰 현황
          bidCount: partBids.length,
          highestBid: highestBid,
          allBids: partBids,
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
