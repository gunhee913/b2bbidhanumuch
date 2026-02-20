import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 20부위 목록
const PARTS = [
  '등심(좌)', '등심(우)', '안심', '채끝', '치마', '부채', '업진', '토시·제비',
  '설도(좌)', '설도(우)', '앞다리', '우둔', '목심', '양지(좌)', '양지(우)',
  '사태', '꼬리', '족', '사골', '잡뼈'
];

interface ResultData {
  listed: number;   // 상장 개수
  awarded: number;  // 낙찰 개수
  rate: number;     // 낙찰률 (%)
}

// GET: 낙찰률 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: '시작일과 종료일을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 1. 해당 기간 내 마감된 상장의 부위 데이터 조회
    const { data: partsData, error: partsError } = await supabase
      .from('cattle_parts')
      .select(`
        id,
        part_name,
        is_included,
        bid_price,
        winning_dealer_id,
        cattle_listings!inner (
          id,
          listing_date,
          status,
          company_id,
          companies (
            id,
            name
          )
        )
      `)
      .eq('cattle_listings.status', 'closed')
      .gte('cattle_listings.listing_date', startDate)
      .lte('cattle_listings.listing_date', endDate)
      .eq('is_included', true);

    if (partsError) {
      console.error('데이터 조회 오류:', partsError);
      return NextResponse.json({ error: partsError.message }, { status: 500 });
    }

    // 2. 업체 목록 추출 (동적)
    const companiesSet = new Set<string>();
    const companyIdMap: Record<string, string> = {}; // id -> name 매핑
    
    (partsData || []).forEach((part: any) => {
      const company = part.cattle_listings?.companies;
      if (company?.name) {
        companiesSet.add(company.name);
        companyIdMap[company.id] = company.name;
      }
    });
    
    const companies = Array.from(companiesSet).sort();

    // 3. 부위별, 업체별 집계
    const data: Record<string, Record<string, ResultData>> = {};
    
    // 초기화
    PARTS.forEach(part => {
      data[part] = {};
      companies.forEach(company => {
        data[part][company] = { listed: 0, awarded: 0, rate: 0 };
      });
      data[part]['합계'] = { listed: 0, awarded: 0, rate: 0 };
    });
    
    // 합계 행 초기화
    data['합계'] = {};
    companies.forEach(company => {
      data['합계'][company] = { listed: 0, awarded: 0, rate: 0 };
    });
    data['합계']['합계'] = { listed: 0, awarded: 0, rate: 0 };

    // 4. 데이터 집계
    (partsData || []).forEach((part: any) => {
      const partName = part.part_name;
      const companyName = part.cattle_listings?.companies?.name;
      
      if (!partName || !companyName) return;
      if (!data[partName]) return; // 정의되지 않은 부위명은 스킵
      
      const isAwarded = part.bid_price !== null || part.winning_dealer_id !== null;
      
      // 부위-업체별 집계
      if (data[partName][companyName]) {
        data[partName][companyName].listed += 1;
        data[partName][companyName].awarded += isAwarded ? 1 : 0;
      }
      
      // 부위별 합계
      data[partName]['합계'].listed += 1;
      data[partName]['합계'].awarded += isAwarded ? 1 : 0;
      
      // 업체별 합계
      if (data['합계'][companyName]) {
        data['합계'][companyName].listed += 1;
        data['합계'][companyName].awarded += isAwarded ? 1 : 0;
      }
      
      // 전체 합계
      data['합계']['합계'].listed += 1;
      data['합계']['합계'].awarded += isAwarded ? 1 : 0;
    });

    // 5. 낙찰률 계산
    PARTS.forEach(part => {
      companies.forEach(company => {
        const d = data[part][company];
        d.rate = d.listed > 0 ? Math.round((d.awarded / d.listed) * 100) : 0;
      });
      const total = data[part]['합계'];
      total.rate = total.listed > 0 ? Math.round((total.awarded / total.listed) * 100) : 0;
    });
    
    companies.forEach(company => {
      const total = data['합계'][company];
      total.rate = total.listed > 0 ? Math.round((total.awarded / total.listed) * 100) : 0;
    });
    
    const grandTotal = data['합계']['합계'];
    grandTotal.rate = grandTotal.listed > 0 ? Math.round((grandTotal.awarded / grandTotal.listed) * 100) : 0;

    return NextResponse.json({
      companies,
      parts: PARTS,
      data,
      summary: {
        totalListed: grandTotal.listed,
        totalAwarded: grandTotal.awarded,
        totalFailed: grandTotal.listed - grandTotal.awarded,
        averageRate: grandTotal.rate,
      },
    });
  } catch (error) {
    console.error('낙찰률 조회 오류:', error);
    return NextResponse.json(
      { error: '낙찰률 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
