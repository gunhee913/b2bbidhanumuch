import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resolveAuth } from '@/lib/resolve-auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveAuth(request);
    if (!auth?.dealerId) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeDate = searchParams.get('activeDate');

    if (!activeDate) {
      return NextResponse.json({ error: 'activeDate가 필요합니다.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('dealer_favorites')
      .select('target_type, target_id, created_by, created_at')
      .eq('dealer_id', auth.dealerId)
      .eq('active_date', activeDate);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const listings = data
      .filter((f) => f.target_type === 'listing')
      .map((f) => f.target_id);

    const parts = data
      .filter((f) => f.target_type === 'part')
      .map((f) => f.target_id);

    return NextResponse.json({ listings, parts });
  } catch (err) {
    console.error('[dealer-favorites GET]', err);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveAuth(request);
    if (!auth?.dealerId) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { activeDate, targetType, targetId } = await request.json();

    if (!activeDate || !targetType || !targetId) {
      return NextResponse.json({ error: '필수 정보가 누락되었습니다.' }, { status: 400 });
    }

    if (!['listing', 'part'].includes(targetType)) {
      return NextResponse.json({ error: '잘못된 targetType입니다.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('dealer_favorites')
      .upsert(
        {
          dealer_id: auth.dealerId,
          active_date: activeDate,
          target_type: targetType,
          target_id: targetId,
          created_by: auth.userId,
        },
        { onConflict: 'dealer_id,active_date,target_type,target_id' }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[dealer-favorites POST]', err);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await resolveAuth(request);
    if (!auth?.dealerId) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { activeDate, targetType, targetId } = await request.json();

    if (!activeDate || !targetType || !targetId) {
      return NextResponse.json({ error: '필수 정보가 누락되었습니다.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('dealer_favorites')
      .delete()
      .eq('dealer_id', auth.dealerId)
      .eq('active_date', activeDate)
      .eq('target_type', targetType)
      .eq('target_id', targetId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[dealer-favorites DELETE]', err);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
