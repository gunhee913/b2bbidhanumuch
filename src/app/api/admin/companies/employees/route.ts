import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';
import { CompanyEmployeeRow, toCompanyEmployeeFromRow } from '@/features/companies/types';

// POST: 직원 등록
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, role, name, phone, password, address, status = 'active' } = body;

    if (!companyId || !name || !phone || !password) {
      return NextResponse.json(
        { error: '필수 항목을 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    const supabase = await createPureClient();

    // 전화번호 중복 체크 (company_employees 테이블)
    const { data: existingEmployee } = await supabase
      .from('company_employees')
      .select('id')
      .eq('phone', phone)
      .single();

    if (existingEmployee) {
      return NextResponse.json(
        { error: '이미 등록된 전화번호입니다.' },
        { status: 409 }
      );
    }

    // 비밀번호 해시
    const passwordHash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('company_employees')
      .insert({
        company_id: companyId,
        role: role || null,
        name,
        phone,
        password_hash: passwordHash,
        address: address || null,
        status,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: '이미 등록된 전화번호입니다.' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(toCompanyEmployeeFromRow(data as CompanyEmployeeRow), { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/companies/employees error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
