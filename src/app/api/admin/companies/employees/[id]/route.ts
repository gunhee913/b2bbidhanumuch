import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';
import { CompanyEmployeeRow, toCompanyEmployeeFromRow } from '@/features/companies/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH: 직원 수정
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { role, name, phone, password, address, status } = body;

    const supabase = await createPureClient();

    // 전화번호 변경 시 중복 체크
    if (phone) {
      const { data: existingEmployee } = await supabase
        .from('company_employees')
        .select('id')
        .eq('phone', phone)
        .neq('id', id)
        .single();

      if (existingEmployee) {
        return NextResponse.json(
          { error: '이미 등록된 전화번호입니다.' },
          { status: 409 }
        );
      }
    }

    // 업데이트할 데이터 구성
    const updateData: Record<string, unknown> = {};
    if (role !== undefined) updateData.role = role;
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (status !== undefined) updateData.status = status;

    // 비밀번호 변경 시 해시
    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 10);
    }

    const { data, error } = await supabase
      .from('company_employees')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: '이미 등록된 전화번호입니다.' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(toCompanyEmployeeFromRow(data as CompanyEmployeeRow));
  } catch (error) {
    console.error('PATCH /api/admin/companies/employees/[id] error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// DELETE: 직원 삭제
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const supabase = await createPureClient();

    const { error } = await supabase
      .from('company_employees')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/companies/employees/[id] error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
