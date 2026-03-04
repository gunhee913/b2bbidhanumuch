import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

// GET: 모든 중도매인 조회
export async function GET() {
  try {
    const supabase = await createPureClient();

    const { data: dealerRows, error: dealerError } = await supabase
      .from('dealers')
      .select('*')
      .order('created_at', { ascending: false });

    if (dealerError) {
      return NextResponse.json({ error: dealerError.message }, { status: 500 });
    }

    const { data: employeeRows, error: employeeError } = await supabase
      .from('dealer_employees')
      .select('*')
      .order('created_at', { ascending: true });

    if (employeeError) {
      return NextResponse.json({ error: employeeError.message }, { status: 500 });
    }

    // Row → 클라이언트 타입 변환
    const dealers = (dealerRows || []).map((row) => {
      const employees = (employeeRows || [])
        .filter((emp) => emp.dealer_id === row.id)
        .map((emp) => ({
          id: emp.id,
          dealerId: emp.dealer_id,
          name: emp.name,
          phone: emp.phone,
          address: emp.address,
          role: emp.role,
          position: emp.position,
          status: emp.status,
          createdAt: emp.created_at,
          lastLoginAt: emp.last_login_at,
        }));

      return {
        id: row.id,
        dealerNo: row.dealer_no,
        name: row.name,
        representativeName: row.representative_name,
        businessNo: row.business_no,
        phone: row.phone,
        address: row.address,
        status: row.status,
        createdAt: row.created_at,
        lastLoginAt: row.last_login_at,
        employees,
      };
    });

    return NextResponse.json(dealers);
  } catch (error) {
    console.error('GET dealers error:', error);
    return NextResponse.json({ error: '데이터 조회 실패' }, { status: 500 });
  }
}

// POST: 중도매인 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dealerNo, name, representativeName, businessNo, phone, password, auctionPassword, address, status } = body;

    if (!dealerNo || !name || !phone || !password || !auctionPassword) {
      return NextResponse.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 });
    }

    const supabase = await createPureClient();

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const auctionPasswordHash = await bcrypt.hash(auctionPassword, SALT_ROUNDS);

    const { data, error } = await supabase
      .from('dealers')
      .insert({
        dealer_no: dealerNo,
        name,
        representative_name: representativeName || null,
        business_no: businessNo || null,
        phone,
        password_hash: passwordHash,
        auction_password_hash: auctionPasswordHash,
        address: address || null,
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
        if (error.message.includes('dealer_no')) {
          return NextResponse.json({ error: '이미 등록된 중도매인 번호입니다.' }, { status: 409 });
        }
        return NextResponse.json({ error: '중복된 데이터가 존재합니다.' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      dealerNo: data.dealer_no,
      name: data.name,
      representativeName: data.representative_name,
      businessNo: data.business_no,
      phone: data.phone,
      address: data.address,
      status: data.status,
      createdAt: data.created_at,
      lastLoginAt: data.last_login_at,
      employees: [],
    });
  } catch (error) {
    console.error('POST dealer error:', error);
    return NextResponse.json({ error: '등록 실패' }, { status: 500 });
  }
}
