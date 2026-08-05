import { NextRequest, NextResponse } from 'next/server';
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

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const body = await request.json();

    const { name, representative, phone, fax, email, businessNumber, ecommerceNumber, address, businessHours } = body;

    const updateData: Record<string, string> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (representative !== undefined) updateData.representative = representative;
    if (phone !== undefined) updateData.phone = phone;
    if (fax !== undefined) updateData.fax = fax;
    if (email !== undefined) updateData.email = email;
    if (businessNumber !== undefined) updateData.business_number = businessNumber;
    if (ecommerceNumber !== undefined) updateData.ecommerce_number = ecommerceNumber;
    if (address !== undefined) updateData.address = address;
    if (businessHours !== undefined) updateData.business_hours = businessHours;

    const { data, error } = await supabase
      .from('company_info')
      .update(updateData)
      .eq('id', 'default')
      .select()
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
