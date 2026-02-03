import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';
import { AdminRow, toAdminFromRow } from '@/features/admins/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH: 관리자 수정
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { department, position, name, phone, password, role, status } = body;

    const supabase = await createPureClient();

    // 전화번호 변경 시 중복 체크
    if (phone) {
      const { data: existingAdmin } = await supabase
        .from('admins')
        .select('id')
        .eq('phone', phone)
        .neq('id', id)
        .single();

      if (existingAdmin) {
        return NextResponse.json(
          { error: '이미 등록된 전화번호입니다.' },
          { status: 409 }
        );
      }
    }

    // 업데이트할 데이터 구성
    const updateData: Record<string, unknown> = {};
    if (department !== undefined) updateData.department = department;
    if (position !== undefined) updateData.position = position;
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;

    // 비밀번호 변경 시 해시
    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 10);
    }

    const { data, error } = await supabase
      .from('admins')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: '이미 등록된 전화번호입니다.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(toAdminFromRow(data as AdminRow));
  } catch (error) {
    console.error('PATCH /api/admin/admins/[id] error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// DELETE: 관리자 삭제
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const supabase = await createPureClient();

    const { error } = await supabase
      .from('admins')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/admins/[id] error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
