import { NextRequest, NextResponse } from 'next/server';
import { verifyMobileToken, extractBearerToken } from '@/lib/mobile-jwt';
import { createPureClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const token = extractBearerToken(request.headers.get('authorization'));

    if (!token) {
      return NextResponse.json(
        { error: '인증 토큰이 필요합니다.' },
        { status: 401 }
      );
    }

    const payload = await verifyMobileToken(token);

    if (!payload || payload.type !== 'access') {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      );
    }

    const supabase = await createPureClient();

    const dealerId = payload.dealerId;
    if (!dealerId) {
      return NextResponse.json(
        { error: '중도매인 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const { data: dealer } = await supabase
      .from('dealers')
      .select('id, dealer_no, name, representative_name, business_no, phone, address, status, created_at, last_login_at')
      .eq('id', dealerId)
      .single();

    let employee = null;
    if (payload.employeeId) {
      const { data: emp } = await supabase
        .from('dealer_employees')
        .select('id, dealer_id, name, phone, address, role, position, status, created_at, last_login_at')
        .eq('id', payload.employeeId)
        .single();
      employee = emp;
    }

    return NextResponse.json({
      user: {
        id: payload.sub,
        name: payload.name,
        phone: payload.phone,
        userType: payload.userType,
        role: payload.role,
      },
      dealer: dealer
        ? {
            id: dealer.id,
            dealerNo: dealer.dealer_no,
            name: dealer.name,
            representativeName: dealer.representative_name,
            businessNo: dealer.business_no,
            phone: dealer.phone,
            address: dealer.address,
            status: dealer.status,
            createdAt: dealer.created_at,
            lastLoginAt: dealer.last_login_at,
          }
        : null,
      employee: employee
        ? {
            id: employee.id,
            dealerId: employee.dealer_id,
            name: employee.name,
            phone: employee.phone,
            address: employee.address,
            role: employee.role,
            position: employee.position,
            status: employee.status,
            createdAt: employee.created_at,
            lastLoginAt: employee.last_login_at,
          }
        : null,
    });
  } catch (error) {
    console.error('모바일 세션 조회 오류:', error);
    return NextResponse.json(
      { error: '세션 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
