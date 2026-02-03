import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  UpdateListingInput,
  toFrontendListing,
  toFrontendPart,
} from '@/features/listings/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: 상장 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: listing, error } = await supabase
      .from('cattle_listings')
      .select(`
        *,
        companies:company_id (name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: '상장을 찾을 수 없습니다.' }, { status: 404 });
      }
      console.error('상장 조회 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 부위 조회
    const { data: parts, error: partsError } = await supabase
      .from('cattle_parts')
      .select(`
        *,
        dealers:winning_dealer_id (name)
      `)
      .eq('listing_id', id)
      .order('part_no', { ascending: true });

    if (partsError) {
      console.error('부위 조회 오류:', partsError);
    }

    const result = {
      ...toFrontendListing(listing),
      companyName: listing.companies?.name || '',
      parts: (parts || []).map((part: unknown) => {
        const item = part as { dealers: { name: string } | null } & Record<string, unknown>;
        return {
          ...toFrontendPart(item as never),
          winningDealerName: item.dealers?.name || null,
        };
      }),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('상장 조회 오류:', error);
    return NextResponse.json(
      { error: '상장을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// PATCH: 상장 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: UpdateListingInput = await request.json();

    // 수정할 데이터 준비
    const updateData: Record<string, unknown> = {};
    
    if (body.breed !== undefined) updateData.breed = body.breed;
    if (body.gender !== undefined) updateData.gender = body.gender;
    if (body.grade !== undefined) updateData.grade = body.grade;
    if (body.marblingScore !== undefined) updateData.marbling_score = body.marblingScore;
    if (body.monthAge !== undefined) updateData.month_age = body.monthAge;
    if (body.traceNo !== undefined) updateData.trace_no = body.traceNo;
    if (body.slaughterHouse !== undefined) updateData.slaughter_house = body.slaughterHouse;
    if (body.slaughterDate !== undefined) updateData.slaughter_date = body.slaughterDate;
    if (body.slaughterNo !== undefined) updateData.slaughter_no = body.slaughterNo;
    if (body.carcassWeight !== undefined) updateData.carcass_weight = body.carcassWeight;
    if (body.backFat !== undefined) updateData.back_fat = body.backFat;
    if (body.eyeMuscle !== undefined) updateData.eye_muscle = body.eyeMuscle;
    if (body.meatColor !== undefined) updateData.meat_color = body.meatColor;
    if (body.fatColor !== undefined) updateData.fat_color = body.fatColor;
    if (body.texture !== undefined) updateData.texture = body.texture;
    if (body.maturity !== undefined) updateData.maturity = body.maturity;
    if (body.processDate !== undefined) updateData.process_date = body.processDate;
    if (body.processWeight !== undefined) updateData.process_weight = body.processWeight;
    if (body.slaughterCert !== undefined) updateData.slaughter_cert = body.slaughterCert;
    if (body.gradeCert !== undefined) updateData.grade_cert = body.gradeCert;
    if (body.images !== undefined) updateData.images = body.images;
    if (body.status !== undefined) updateData.status = body.status;

    const { data, error } = await supabase
      .from('cattle_listings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('상장 수정 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(toFrontendListing(data));
  } catch (error) {
    console.error('상장 수정 오류:', error);
    return NextResponse.json(
      { error: '상장 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE: 상장 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 상장 상태 확인
    const { data: listing, error: fetchError } = await supabase
      .from('cattle_listings')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: '상장을 찾을 수 없습니다.' }, { status: 404 });
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // 대기 상태인 경우만 삭제 가능
    if (listing.status !== 'pending') {
      return NextResponse.json(
        { error: '대기 상태인 상장만 삭제할 수 있습니다.' },
        { status: 400 }
      );
    }

    // 부위 먼저 삭제 (CASCADE 설정되어 있지만 명시적으로)
    await supabase.from('cattle_parts').delete().eq('listing_id', id);

    // 상장 삭제
    const { error } = await supabase
      .from('cattle_listings')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('상장 삭제 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('상장 삭제 오류:', error);
    return NextResponse.json(
      { error: '상장 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
