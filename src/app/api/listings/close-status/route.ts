import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getToken } from 'next-auth/jwt';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: 마감/취소 이력 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: '날짜는 필수입니다.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('close_action_logs')
      .select('*')
      .eq('action_date', date)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('마감이력 조회 오류:', error);
    return NextResponse.json(
      { error: '마감이력 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 마감/취소 이력 저장
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.userType !== 'admin_user') {
      return NextResponse.json({ error: '관리자만 접근 가능합니다.' }, { status: 403 });
    }

    const body = await request.json();
    const { actionType, listingCount, actionDate } = body;

    if (!actionType || !actionDate) {
      return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('close_action_logs')
      .insert({
        action_type: actionType,
        listing_count: listingCount || 0,
        performed_by: (token.name as string) || '관리자',
        action_date: actionDate,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('마감이력 저장 오류:', error);
    return NextResponse.json(
      { error: '마감이력 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
