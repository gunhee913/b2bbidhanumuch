import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import {
  CompanyRow,
  CompanyEmployeeRow,
  toCompanyFromRow,
  toCompanyEmployeeFromRow,
  CompanyWithEmployees,
} from '@/features/companies/types';

// GET: 상장업체 목록 조회 (직원 포함)
export async function GET() {
  try {
    const supabase = await createPureClient();

    // 상장업체 조회
    const { data: companiesData, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });

    if (companiesError) {
      return NextResponse.json({ error: companiesError.message }, { status: 500 });
    }

    // 직원 조회
    const { data: employeesData, error: employeesError } = await supabase
      .from('company_employees')
      .select('*')
      .order('created_at', { ascending: true });

    if (employeesError) {
      return NextResponse.json({ error: employeesError.message }, { status: 500 });
    }

    // 상장업체별 직원 그룹화
    const companies: CompanyWithEmployees[] = (companiesData as CompanyRow[]).map((companyRow) => {
      const company = toCompanyFromRow(companyRow);
      const employees = (employeesData as CompanyEmployeeRow[])
        .filter((emp) => emp.company_id === companyRow.id)
        .map(toCompanyEmployeeFromRow);
      return { ...company, employees };
    });

    return NextResponse.json(companies);
  } catch (error) {
    console.error('GET /api/admin/companies error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// POST: 상장업체 등록
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyNo, name, businessNo, ceo, phone, bankAccount, status = 'active' } = body;

    if (!companyNo || !name || !businessNo || !ceo) {
      return NextResponse.json(
        { error: '필수 항목을 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    const supabase = await createPureClient();

    const { data, error } = await supabase
      .from('companies')
      .insert({
        company_no: companyNo,
        name,
        business_no: businessNo,
        ceo,
        phone: phone || null,
        bank_account: bankAccount || null,
        status,
      })
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

    return NextResponse.json(toCompanyFromRow(data as CompanyRow), { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/companies error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
