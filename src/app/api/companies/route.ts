import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';

const supabase = getAdminClient();

// GET: 업체 목록 조회
export async function GET() {
  try {
    const { data: companies, error } = await supabase
      .from('companies')
      .select('id, company_no, name, status')
      .eq('status', 'active')
      .order('company_no', { ascending: true });

    if (error) {
      console.error('업체 조회 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formattedCompanies = (companies || []).map(c => ({
      id: c.id,
      companyNo: c.company_no,
      name: c.name,
      status: c.status,
    }));

    return NextResponse.json({ companies: formattedCompanies });
  } catch (error) {
    console.error('업체 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '업체 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
