import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';

const supabase = getAdminClient();

// GET: 거래처 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const businessType = searchParams.get('businessType');
    const status = searchParams.get('status');
    const dealerId = searchParams.get('dealerId');

    let query = supabase
      .from('partners')
      .select(`
        *,
        dealer1:dealers!partners_dealer1_id_fkey (id, dealer_no, name),
        dealer2:dealers!partners_dealer2_id_fkey (id, dealer_no, name),
        dealer3:dealers!partners_dealer3_id_fkey (id, dealer_no, name)
      `)
      .order('created_at', { ascending: false });

    // 검색어 필터
    if (search) {
      query = query.or(`name.ilike.%${search}%,representative.ilike.%${search}%,partner_no.ilike.%${search}%`);
    }

    // 거래처구분 필터
    if (businessType && businessType !== '전체') {
      query = query.eq('business_type', businessType);
    }

    // 상태 필터
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // 중도매인 필터
    if (dealerId) {
      query = query.or(`dealer1_id.eq.${dealerId},dealer2_id.eq.${dealerId},dealer3_id.eq.${dealerId}`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('거래처 조회 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 데이터 변환
    const partners = (data || []).map((partner: any) => ({
      id: partner.id,
      partnerNo: partner.partner_no,
      name: partner.name,
      businessNo: partner.business_no,
      representative: partner.representative,
      phone: partner.phone,
      address: partner.address,
      businessType: partner.business_type,
      status: partner.status,
      createdAt: partner.created_at,
      dealer1: partner.dealer1 ? {
        id: partner.dealer1.id,
        dealerNo: partner.dealer1.dealer_no,
        name: partner.dealer1.name,
      } : null,
      dealer2: partner.dealer2 ? {
        id: partner.dealer2.id,
        dealerNo: partner.dealer2.dealer_no,
        name: partner.dealer2.name,
      } : null,
      dealer3: partner.dealer3 ? {
        id: partner.dealer3.id,
        dealerNo: partner.dealer3.dealer_no,
        name: partner.dealer3.name,
      } : null,
    }));

    return NextResponse.json({ partners });
  } catch (error) {
    console.error('거래처 조회 오류:', error);
    return NextResponse.json(
      { error: '거래처 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 거래처 등록
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      businessNo,
      representative,
      phone,
      address,
      businessType,
      status,
      dealer1Id,
      dealer2Id,
      dealer3Id,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: '거래처명은 필수입니다.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('partners')
      .insert({
        name,
        business_no: businessNo || null,
        representative: representative || null,
        phone: phone || null,
        address: address || null,
        business_type: businessType || null,
        status: status || 'active',
        dealer1_id: dealer1Id || null,
        dealer2_id: dealer2Id || null,
        dealer3_id: dealer3Id || null,
      })
      .select()
      .single();

    if (error) {
      console.error('거래처 등록 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: '거래처가 등록되었습니다.',
      partner: data,
    });
  } catch (error) {
    console.error('거래처 등록 오류:', error);
    return NextResponse.json(
      { error: '거래처 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
