import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

// POST: 직원 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dealerId, name, phone, password, address, role, position, status } = body;

    if (!dealerId || !name || !phone || !password) {
      return NextResponse.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 });
    }

    const supabase = await createPureClient();

    // 중도매인 테이블에서도 전화번호 중복 체크
    const { data: existingDealer } = await supabase
      .from('dealers')
      .select('id')
      .eq('phone', phone)
      .single();

    if (existingDealer) {
      return NextResponse.json({ error: '이미 등록된 전화번호입니다.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const { data, error } = await supabase
      .from('dealer_employees')
      .insert({
        dealer_id: dealerId,
        name,
        phone,
        password_hash: passwordHash,
        address: address || null,
        role: role || null,
        position: position || null,
        status: status || 'active',
      })
      .select()
      .single();

    if (error) {
      // 중복 에러 처리
      if (error.code === '23505') {
        if (error.message.includes('phone')) {
          return NextResponse.json({ error: '이미 등록된 전화번호입니다.' }, { status: 409 });
        }
        return NextResponse.json({ error: '중복된 데이터가 존재합니다.' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      dealerId: data.dealer_id,
      name: data.name,
      phone: data.phone,
      address: data.address,
      role: data.role,
      position: data.position,
      status: data.status,
      createdAt: data.created_at,
      lastLoginAt: data.last_login_at,
    });
  } catch (error) {
    console.error('POST employee error:', error);
    return NextResponse.json({ error: '등록 실패' }, { status: 500 });
  }
}
