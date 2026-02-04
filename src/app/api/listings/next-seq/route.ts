import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: 다음 순번 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const listingDate = searchParams.get('listingDate');

    if (!companyId || !listingDate) {
      return NextResponse.json(
        { error: 'companyId와 listingDate가 필요합니다.' },
        { status: 400 }
      );
    }

    // 업체 정보 조회 (company_no)
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('company_no')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { error: '업체 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 업체번호 첫자리 (200 → 2)
    const companyNoPrefix = company.company_no.charAt(0);

    // 해당 날짜, 업체의 마지막 접수번호 조회
    const { data: lastListing } = await supabase
      .from('cattle_listings')
      .select('listing_no')
      .eq('company_id', companyId)
      .eq('listing_date', listingDate)
      .order('listing_no', { ascending: false })
      .limit(1)
      .single();

    // 다음 순번 계산
    let nextSeq = parseInt(`${companyNoPrefix}01`); // 기본값: 201, 101 등
    if (lastListing?.listing_no) {
      const lastSeq = parseInt(lastListing.listing_no.split('-')[1]);
      nextSeq = lastSeq + 1;
    }

    // 날짜 코드 생성 (YYMMDD)
    const dateCode = listingDate.replace(/-/g, '').slice(2);

    return NextResponse.json({
      nextSeq,
      companyNoPrefix,
      dateCode,
      nextListingNo: `${dateCode}-${nextSeq}`,
    });
  } catch (error) {
    console.error('다음 순번 조회 오류:', error);
    return NextResponse.json(
      { error: '다음 순번 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
