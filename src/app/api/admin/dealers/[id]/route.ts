import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';
import { SLAUGHTER_HOUSES } from '@/constants/slaughterHouses';

const SALT_ROUNDS = 10;
const VALID_HOUSES: readonly string[] = SLAUGHTER_HOUSES;

// PATCH: 중도매인 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, representativeName, businessNo, phone, password, auctionPassword, address, slaughterHouse, status } = body;

    if (slaughterHouse !== undefined && slaughterHouse !== null && slaughterHouse !== '' && !VALID_HOUSES.includes(slaughterHouse)) {
      return NextResponse.json({ error: '알 수 없는 공판장입니다.' }, { status: 400 });
    }

    const supabase = await createPureClient();

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (representativeName !== undefined) updateData.representative_name = representativeName;
    if (businessNo !== undefined) updateData.business_no = businessNo;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (slaughterHouse !== undefined) updateData.slaughter_house = slaughterHouse || null;
    if (status !== undefined) updateData.status = status;

    if (password) {
      updateData.password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    }
    if (auctionPassword) {
      updateData.auction_password_hash = await bcrypt.hash(auctionPassword, SALT_ROUNDS);
    }

    const { data, error } = await supabase
      .from('dealers')
      .update(updateData)
      .eq('id', id)
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
      dealerNo: data.dealer_no,
      name: data.name,
      representativeName: data.representative_name,
      businessNo: data.business_no,
      phone: data.phone,
      address: data.address,
      slaughterHouse: data.slaughter_house ?? null,
      status: data.status,
      createdAt: data.created_at,
      lastLoginAt: data.last_login_at,
    });
  } catch (error) {
    console.error('PATCH dealer error:', error);
    return NextResponse.json({ error: '수정 실패' }, { status: 500 });
  }
}

// DELETE: 중도매인 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createPureClient();

    const { error } = await supabase.from('dealers').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE dealer error:', error);
    return NextResponse.json({ error: '삭제 실패' }, { status: 500 });
  }
}
