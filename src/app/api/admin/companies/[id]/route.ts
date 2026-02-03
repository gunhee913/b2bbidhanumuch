import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { CompanyRow, toCompanyFromRow } from '@/features/companies/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH: 상장업체 수정
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { companyNo, name, businessNo, ceo, phone, status } = body;

    const supabase = await createPureClient();

    // 업데이트할 데이터 구성
    const updateData: Record<string, unknown> = {};
    if (companyNo !== undefined) updateData.company_no = companyNo;
    if (name !== undefined) updateData.name = name;
    if (businessNo !== undefined) updateData.business_no = businessNo;
    if (ceo !== undefined) updateData.ceo = ceo;
    if (phone !== undefined) updateData.phone = phone;
    if (status !== undefined) updateData.status = status;

    const { data, error } = await supabase
      .from('companies')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        if (error.message.includes('company_no')) {
          return NextResponse.json({ error: '이미 등록된 업체번호입니다.' }, { status: 409 });
        }
        if (error.message.includes('business_no')) {
          return NextResponse.json({ error: '이미 등록된 사업자등록번호입니다.' }, { status: 409 });
        }
        return NextResponse.json({ error: '중복된 데이터가 있습니다.' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(toCompanyFromRow(data as CompanyRow));
  } catch (error) {
    console.error('PATCH /api/admin/companies/[id] error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// DELETE: 상장업체 삭제
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const supabase = await createPureClient();

    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/companies/[id] error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
