import { NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createPureClient();

    const { data, error } = await supabase
      .from('company_info')
      .select('*')
      .eq('id', 'default')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      name: data.name,
      representative: data.representative,
      phone: data.phone,
      fax: data.fax,
      email: data.email ?? '',
      businessNumber: data.business_number,
      ecommerceNumber: data.ecommerce_number,
      address: data.address,
      businessHours: data.business_hours,
      updatedAt: data.updated_at,
    });
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
