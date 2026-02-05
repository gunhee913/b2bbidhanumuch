import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: 개별 거래처 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('partners')
      .select(`
        *,
        dealer1:dealers!partners_dealer1_id_fkey (id, dealer_no, name),
        dealer2:dealers!partners_dealer2_id_fkey (id, dealer_no, name),
        dealer3:dealers!partners_dealer3_id_fkey (id, dealer_no, name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('거래처 조회 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: '거래처를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ partner: data });
  } catch (error) {
    console.error('거래처 조회 오류:', error);
    return NextResponse.json(
      { error: '거래처 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// PUT: 거래처 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      businessNo,
      representative,
      phone,
      address,
      businessType,
      status,
      dealer1Id,
      dealer2Id,
      dealer3Id,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: '거래처명은 필수입니다.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('partners')
      .update({
        name,
        business_no: businessNo || null,
        representative: representative || null,
        phone: phone || null,
        address: address || null,
        business_type: businessType || null,
        status: status || 'active',
        dealer1_id: dealer1Id || null,
        dealer2_id: dealer2Id || null,
        dealer3_id: dealer3Id || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('거래처 수정 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: '거래처가 수정되었습니다.',
      partner: data,
    });
  } catch (error) {
    console.error('거래처 수정 오류:', error);
    return NextResponse.json(
      { error: '거래처 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE: 거래처 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabase
      .from('partners')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('거래처 삭제 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: '거래처가 삭제되었습니다.',
    });
  } catch (error) {
    console.error('거래처 삭제 오류:', error);
    return NextResponse.json(
      { error: '거래처 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
