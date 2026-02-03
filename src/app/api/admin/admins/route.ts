import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';
import { AdminRow, toAdminFromRow } from '@/features/admins/types';

// GET: 관리자 목록 조회
export async function GET() {
  try {
    const supabase = await createPureClient();

    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const admins = (data as AdminRow[]).map(toAdminFromRow);
    return NextResponse.json(admins);
  } catch (error) {
    console.error('GET /api/admin/admins error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// POST: 관리자 등록
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { department, position, name, phone, password, role, status = 'active' } = body;

    if (!department || !name || !phone || !password) {
      return NextResponse.json(
        { error: '필수 항목을 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    const supabase = await createPureClient();

    // 전화번호 중복 체크 (admins 테이블)
    const { data: existingAdmin } = await supabase
      .from('admins')
      .select('id')
      .eq('phone', phone)
      .single();

    if (existingAdmin) {
      return NextResponse.json(
        { error: '이미 등록된 전화번호입니다.' },
        { status: 409 }
      );
    }

    // 비밀번호 해시
    const passwordHash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('admins')
      .insert({
        department,
        position: position || null,
        name,
        phone,
        password_hash: passwordHash,
        role: role || 'admin',
        status,
      })
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

    return NextResponse.json(toAdminFromRow(data as AdminRow), { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/admins error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
