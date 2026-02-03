import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UpdatePartInput, toFrontendPart } from '@/features/listings/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PATCH: 부위 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; partId: string }> }
) {
  try {
    const { id, partId } = await params;
    const body: UpdatePartInput = await request.json();

    // 부위가 해당 상장에 속하는지 확인
    const { data: part, error: fetchError } = await supabase
      .from('cattle_parts')
      .select('listing_id')
      .eq('id', partId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: '부위를 찾을 수 없습니다.' }, { status: 404 });
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (part.listing_id !== id) {
      return NextResponse.json(
        { error: '해당 상장에 속하지 않는 부위입니다.' },
        { status: 400 }
      );
    }

    // 수정할 데이터 준비
    const updateData: Record<string, unknown> = {};
    if (body.weight !== undefined) updateData.weight = body.weight;
    if (body.minPrice !== undefined) updateData.min_price = body.minPrice;
    if (body.isIncluded !== undefined) updateData.is_included = body.isIncluded;

    const { data, error } = await supabase
      .from('cattle_parts')
      .update(updateData)
      .eq('id', partId)
      .select()
      .single();

    if (error) {
      console.error('부위 수정 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(toFrontendPart(data));
  } catch (error) {
    console.error('부위 수정 오류:', error);
    return NextResponse.json(
      { error: '부위 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
