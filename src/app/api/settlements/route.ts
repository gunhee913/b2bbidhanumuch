import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 물류비, 상차비 상수 (개체당)
const LOGISTICS_FEE = 21000;
const LOADING_FEE = 20000;

// GET: 상장업체별 정산 데이터 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const companyId = searchParams.get('companyId');

    // 1. 마감된 상장 조회 (업체, 부위 정보 포함)
    let query = supabase
      .from('cattle_listings')
      .select(`
        id,
        listing_no,
        listing_date,
        closed_at,
        breed,
        gender,
        grade,
        marbling_score,
        trace_no,
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
          bid_price,
          bid_amount,
          winning_dealer_id,
          is_included
        )
      `)
      .eq('status', 'closed')
      .order('company_id', { ascending: true })
      .order('listing_no', { ascending: true });

    // 상장일 필터 (listing_date 기준)
    if (startDate) {
      query = query.gte('listing_date', startDate);
    }
    if (endDate) {
      query = query.lte('listing_date', endDate);
    }

    // 업체 필터
    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data: listings, error } = await query;

    if (error) {
      console.error('상장 조회 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!listings || listings.length === 0) {
      return NextResponse.json({
        settlements: [],
        summary: {
          totalCompanies: 0,
          totalCattle: 0,
          totalSaleAmount: 0,
          totalDeduction: 0,
          totalNetPayment: 0,
        }
      });
    }

    // 2. 낙찰된 부위의 딜러 정보 조회
    const winningDealerIds = new Set<string>();
    listings.forEach((listing: any) => {
      (listing.cattle_parts || []).forEach((part: any) => {
        if (part.winning_dealer_id) {
          winningDealerIds.add(part.winning_dealer_id);
        }
      });
    });

    let dealersMap: Record<string, any> = {};
    if (winningDealerIds.size > 0) {
      const { data: dealers } = await supabase
        .from('dealers')
        .select('id, name, dealer_no')
        .in('id', Array.from(winningDealerIds));

      (dealers || []).forEach((dealer: any) => {
        dealersMap[dealer.id] = dealer;
      });
    }

    // 3. 업체별로 그룹핑
    const companyMap: Record<string, any> = {};

    // 등급 포맷팅 함수
    const formatGrade = (grade: string, marblingScore: number | null) => {
      if (!grade) return '';
      if (grade.includes('(')) return grade;
      if (marblingScore && grade.startsWith('1++')) {
        return `${grade}(${marblingScore})`;
      }
      return grade;
    };

    listings.forEach((listing: any) => {
      const company = listing.companies as any;
      if (!company) return;

      const companyIdKey = company.id;

      if (!companyMap[companyIdKey]) {
        companyMap[companyIdKey] = {
          id: company.id,
          companyNo: company.company_no || '',
          companyName: company.name || '',
          representative: '',
          address: '',
          cattleList: [],
          totalSaleAmount: 0,
          totalDeduction: 0,
          totalNetPayment: 0,
        };
      }

      // 부위별 내역 구성
      const parts = (listing.cattle_parts || [])
        .filter((part: any) => part.is_included)
        .sort((a: any, b: any) => a.part_no - b.part_no)
        .map((part: any, idx: number) => {
          const dealer = part.winning_dealer_id ? dealersMap[part.winning_dealer_id] : null;
          return {
            no: idx + 1,
            listingNo: part.listing_part_no || `${listing.listing_no}-${String(part.part_no).padStart(2, '0')}`,
            partName: part.part_name,
            weight: part.weight || 0,
            unitPrice: part.bid_price || 0,
            amount: part.bid_amount || 0,
            dealerNo: dealer?.dealer_no || '',
            dealerName: dealer?.name || '',
            note: !part.bid_price ? '유찰' : '',
          };
        });

      // 판매금액 (낙찰금액 합계)
      const saleAmount = parts.reduce((sum: number, p: any) => sum + p.amount, 0);
      
      // 상장수수료 (판매금액의 2%)
      const listingFee = Math.round(saleAmount * 0.02);
      
      // 공제금액 합계
      const deductionTotal = listingFee + LOGISTICS_FEE + LOADING_FEE;
      
      // 차인지급액
      const netPayment = saleAmount - deductionTotal;

      // 도체중 (부위 중량 합계)
      const totalWeight = parts.reduce((sum: number, p: any) => sum + p.weight, 0);

      const cattle = {
        id: listing.id,
        auctionNo: listing.listing_no,
        species: listing.breed || '한우',
        gender: listing.gender || '',
        grade: formatGrade(listing.grade, listing.marbling_score),
        weight: Number(totalWeight.toFixed(1)),
        traceNo: listing.trace_no || '',
        closedAt: listing.closed_at,
        saleAmount,
        listingFee,
        logisticsFee: LOGISTICS_FEE,
        loadingFee: LOADING_FEE,
        deductionTotal,
        netPayment,
        parts,
      };

      companyMap[companyIdKey].cattleList.push(cattle);
      companyMap[companyIdKey].totalSaleAmount += saleAmount;
      companyMap[companyIdKey].totalDeduction += deductionTotal;
      companyMap[companyIdKey].totalNetPayment += netPayment;
    });

    // 4. 결과 배열로 변환
    const settlements = Object.values(companyMap);

    // 5. 전체 요약
    const summary = {
      totalCompanies: settlements.length,
      totalCattle: settlements.reduce((sum: number, s: any) => sum + s.cattleList.length, 0),
      totalSaleAmount: settlements.reduce((sum: number, s: any) => sum + s.totalSaleAmount, 0),
      totalDeduction: settlements.reduce((sum: number, s: any) => sum + s.totalDeduction, 0),
      totalNetPayment: settlements.reduce((sum: number, s: any) => sum + s.totalNetPayment, 0),
    };

    return NextResponse.json({
      settlements,
      summary,
    });
  } catch (error) {
    console.error('정산 데이터 조회 오류:', error);
    return NextResponse.json(
      { error: '정산 데이터 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
