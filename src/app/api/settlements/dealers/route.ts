import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: 중도매인별 낙찰 내역 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');

    // 1. 마감된 상장의 낙찰 부위 조회
    let query = supabase
      .from('cattle_parts')
      .select(`
        id,
        part_no,
        part_name,
        listing_part_no,
        weight,
        bid_price,
        bid_amount,
        winning_dealer_id,
        cattle_listings!inner (
          id,
          listing_no,
          listing_date,
          closed_at,
          breed,
          gender,
          grade,
          marbling_score,
          status,
          company_id,
          companies (
            id,
            name,
            company_no
          )
        )
      `)
      .eq('is_included', true)
      .not('winning_dealer_id', 'is', null)
      .not('bid_price', 'is', null)
      .eq('cattle_listings.status', 'closed');

    const { data: parts, error: partsError } = await query;

    if (partsError) {
      console.error('부위 조회 오류:', partsError);
      return NextResponse.json({ error: partsError.message }, { status: 500 });
    }

    if (!parts || parts.length === 0) {
      return NextResponse.json({
        settlements: [],
        summary: {
          totalDealers: 0,
          totalParts: 0,
          totalWeight: 0,
          totalAmount: 0,
          totalNetPayment: 0,
        }
      });
    }

    // 날짜 필터 (상장일 listing_date 기준)
    let filteredParts = parts;
    if (startDate || endDate) {
      filteredParts = parts.filter((part: any) => {
        const listingDate = part.cattle_listings?.listing_date;
        if (!listingDate) return false;
        if (startDate && listingDate < startDate) return false;
        if (endDate && listingDate > endDate) return false;
        return true;
      });
    }

    // 2. 낙찰자(딜러) 정보 조회
    const dealerIds = [...new Set(filteredParts.map((p: any) => p.winning_dealer_id))];
    
    if (dealerIds.length === 0) {
      return NextResponse.json({
        settlements: [],
        summary: {
          totalDealers: 0,
          totalParts: 0,
          totalWeight: 0,
          totalAmount: 0,
          totalNetPayment: 0,
        }
      });
    }

    const { data: dealers, error: dealersError } = await supabase
      .from('dealers')
      .select('id, dealer_no, name, phone')
      .in('id', dealerIds);

    if (dealersError) {
      console.error('딜러 조회 오류:', dealersError);
      return NextResponse.json({ error: dealersError.message }, { status: 500 });
    }

    const dealersMap: Record<string, any> = {};
    (dealers || []).forEach((d: any) => {
      dealersMap[d.id] = d;
    });

    // 3. 중도매인별로 그룹핑
    const dealerSettlements: Record<string, any> = {};

    // 등급 포맷팅 함수
    const formatGrade = (grade: string, marblingScore: number | null) => {
      if (!grade) return '';
      if (grade.includes('(')) return grade;
      if (marblingScore && grade.startsWith('1++')) {
        return `${grade}(${marblingScore})`;
      }
      return grade;
    };

    filteredParts.forEach((part: any) => {
      const dealerId = part.winning_dealer_id;
      const dealer = dealersMap[dealerId];
      if (!dealer) return;

      const listing = part.cattle_listings;
      const company = listing?.companies;

      if (!dealerSettlements[dealerId]) {
        dealerSettlements[dealerId] = {
          id: dealerId,
          dealerNo: dealer.dealer_no || '',
          dealerName: dealer.name || '',
          phone: dealer.phone || '',
          bidParts: [],
          totalWeight: 0,
          totalAmount: 0,
          netPayment: 0,
        };
      }

      const bidPart = {
        id: part.id,
        listingNo: part.listing_part_no || `${listing?.listing_no}-${String(part.part_no).padStart(2, '0')}`,
        partName: part.part_name,
        companyName: company?.name || '',
        companyNo: company?.company_no || '',
        grade: formatGrade(listing?.grade, listing?.marbling_score),
        weight: part.weight || 0,
        unitPrice: part.bid_price || 0,
        amount: part.bid_amount || 0,
        closedAt: listing?.closed_at,
      };

      dealerSettlements[dealerId].bidParts.push(bidPart);
      dealerSettlements[dealerId].totalWeight += bidPart.weight;
      dealerSettlements[dealerId].totalAmount += bidPart.amount;
    });

    // 상장번호 정렬 함수 (예: 260205-101-01 → 가운데 101, 102, 103, 201, 202 순, 뒷자리 01, 02, 03 순)
    const sortByListingNo = (a: string, b: string) => {
      const partsA = a.split('-');
      const partsB = b.split('-');
      // 가운데 3자리 숫자 비교 (101, 102, 103, 201, 202...)
      const midA = parseInt(partsA[1] || '0', 10);
      const midB = parseInt(partsB[1] || '0', 10);
      if (midA !== midB) return midA - midB;
      // 뒷자리 숫자 비교 (01, 02, 03, 04...)
      const lastA = parseInt(partsA[2] || '0', 10);
      const lastB = parseInt(partsB[2] || '0', 10);
      return lastA - lastB;
    };

    // 4. 지급액 계산 및 배열로 변환
    let settlements = Object.values(dealerSettlements).map((settlement: any) => {
      // 지급액 = 총 낙찰금액 (수수료는 상장업체가 부담하므로 중도매인은 전액 지급)
      settlement.netPayment = settlement.totalAmount;
      // bidParts를 상장번호 순으로 정렬
      settlement.bidParts.sort((a: any, b: any) => sortByListingNo(a.listingNo, b.listingNo));
      return settlement;
    });

    // 검색 필터
    if (search) {
      const searchLower = search.toLowerCase();
      settlements = settlements.filter((s: any) => 
        s.dealerName.toLowerCase().includes(searchLower) || 
        s.dealerNo.includes(search)
      );
    }

    // 중도매인 번호순 정렬
    settlements.sort((a: any, b: any) => a.dealerNo.localeCompare(b.dealerNo));

    // 5. 전체 요약
    const summary = {
      totalDealers: settlements.length,
      totalParts: settlements.reduce((sum: number, s: any) => sum + s.bidParts.length, 0),
      totalWeight: settlements.reduce((sum: number, s: any) => sum + s.totalWeight, 0),
      totalAmount: settlements.reduce((sum: number, s: any) => sum + s.totalAmount, 0),
      totalNetPayment: settlements.reduce((sum: number, s: any) => sum + s.netPayment, 0),
    };

    return NextResponse.json({
      settlements,
      summary,
    });
  } catch (error) {
    console.error('중도매인별 낙찰 내역 조회 오류:', error);
    return NextResponse.json(
      { error: '중도매인별 낙찰 내역 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
