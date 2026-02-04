import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  CattleListingRow,
  CattlePartRow,
  CreateListingInput,
  toFrontendListing,
  toFrontendPart,
  ListingFilter,
} from '@/features/listings/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: 상장 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const status = searchParams.get('status');
    const listingDateFrom = searchParams.get('listingDateFrom');
    const listingDateTo = searchParams.get('listingDateTo');
    const search = searchParams.get('search');
    const includeParts = searchParams.get('includeParts') === 'true';

    let query = supabase
      .from('cattle_listings')
      .select(`
        *,
        companies:company_id (name)
      `)
      .order('listing_date', { ascending: false })
      .order('listing_no', { ascending: false });

    // 필터 적용
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (listingDateFrom) {
      query = query.gte('listing_date', listingDateFrom);
    }
    if (listingDateTo) {
      query = query.lte('listing_date', listingDateTo);
    }
    if (search) {
      query = query.or(`listing_no.ilike.%${search}%,trace_no.ilike.%${search}%`);
    }

    const { data: listings, error } = await query;

    if (error) {
      console.error('상장 목록 조회 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 프론트엔드 타입으로 변환
    const result = (listings || []).map((row: unknown) => {
      const item = row as CattleListingRow & { companies: { name: string } | null };
      return {
        ...toFrontendListing(item),
        companyName: item.companies?.name || '',
      };
    });

    // 부위 정보 포함 요청 시
    if (includeParts && listings && listings.length > 0) {
      const listingIds = listings.map((l: unknown) => (l as CattleListingRow).id);
      const { data: parts, error: partsError } = await supabase
        .from('cattle_parts')
        .select('*')
        .in('listing_id', listingIds)
        .order('part_no', { ascending: true });

      if (partsError) {
        console.error('부위 조회 오류:', partsError);
      } else {
        const partsMap = new Map<string, CattlePartRow[]>();
        parts?.forEach((part: CattlePartRow) => {
          const existing = partsMap.get(part.listing_id) || [];
          partsMap.set(part.listing_id, [...existing, part]);
        });

        result.forEach((listing: { id: string; parts?: unknown[] }) => {
          listing.parts = (partsMap.get(listing.id) || []).map(toFrontendPart);
        });
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('상장 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '상장 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 상장 등록
export async function POST(request: NextRequest) {
  try {
    const body: CreateListingInput = await request.json();
    const { parts, ...listingData } = body;

    // 접수번호 생성 (YYMMDD-XXX)
    const dateCode = listingData.listingDate.replace(/-/g, '').slice(2);
    
    // 해당 날짜, 업체의 마지막 접수번호 조회
    const { data: lastListing } = await supabase
      .from('cattle_listings')
      .select('listing_no')
      .eq('company_id', listingData.companyId)
      .eq('listing_date', listingData.listingDate)
      .order('listing_no', { ascending: false })
      .limit(1)
      .single();

    // 업체 정보 가져오기 (company_no 사용)
    const { data: company } = await supabase
      .from('companies')
      .select('company_no')
      .eq('id', listingData.companyId)
      .single();

    // 업체번호 첫자리 추출 (200 → 2)
    const companyNoPrefix = company?.company_no?.charAt(0) || '1';

    // 해당 날짜, 업체의 순번 계산
    let nextSeq = parseInt(`${companyNoPrefix}01`);
    if (lastListing?.listing_no) {
      const lastSeq = parseInt(lastListing.listing_no.split('-')[1]);
      nextSeq = lastSeq + 1;
    }

    const listingNo = `${dateCode}-${nextSeq}`;

    // 상장 등록
    const { data: listing, error: listingError } = await supabase
      .from('cattle_listings')
      .insert({
        listing_no: listingNo,
        listing_date: listingData.listingDate,
        company_id: listingData.companyId,
        breed: listingData.breed || '한우',
        gender: listingData.gender,
        grade: listingData.grade,
        marbling_score: listingData.marblingScore,
        month_age: listingData.monthAge,
        trace_no: listingData.traceNo,
        slaughter_house: listingData.slaughterHouse,
        slaughter_date: listingData.slaughterDate,
        slaughter_no: listingData.slaughterNo,
        carcass_weight: listingData.carcassWeight,
        back_fat: listingData.backFat,
        eye_muscle: listingData.eyeMuscle,
        meat_color: listingData.meatColor,
        fat_color: listingData.fatColor,
        texture: listingData.texture,
        maturity: listingData.maturity,
        process_date: listingData.processDate,
        process_weight: listingData.processWeight,
        slaughter_cert: listingData.slaughterCert,
        grade_cert: listingData.gradeCert,
        images: listingData.images || [],
        status: 'pending',
        created_by: listingData.createdBy,
      })
      .select()
      .single();

    if (listingError) {
      console.error('상장 등록 오류:', listingError);
      return NextResponse.json({ error: listingError.message }, { status: 500 });
    }

    // 부위 등록
    const partsToInsert = parts.map((part) => ({
      listing_id: listing.id,
      part_no: part.partNo,
      part_name: part.partName,
      listing_part_no: `${listingNo}-${String(part.partNo).padStart(2, '0')}`,
      weight: part.weight,
      min_price: part.minPrice,
      is_included: part.isIncluded ?? true,
    }));

    const { error: partsError } = await supabase
      .from('cattle_parts')
      .insert(partsToInsert);

    if (partsError) {
      console.error('부위 등록 오류:', partsError);
      // 상장은 등록되었으나 부위 등록 실패 - 롤백
      await supabase.from('cattle_listings').delete().eq('id', listing.id);
      return NextResponse.json({ error: partsError.message }, { status: 500 });
    }

    // 등록된 상장과 부위 정보 반환
    const { data: createdParts } = await supabase
      .from('cattle_parts')
      .select('*')
      .eq('listing_id', listing.id)
      .order('part_no', { ascending: true });

    return NextResponse.json({
      ...toFrontendListing(listing),
      parts: createdParts?.map(toFrontendPart) || [],
    });
  } catch (error) {
    console.error('상장 등록 오류:', error);
    return NextResponse.json(
      { error: '상장 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
