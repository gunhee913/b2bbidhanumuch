import { NextRequest, NextResponse } from 'next/server';
import { resolveAuth } from '@/lib/resolve-auth';
import { createPureClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveAuth(request);
    if (!auth?.dealerId) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const supabase = await createPureClient();
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('dealer_id', auth.dealerId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const notifications = (data || []).map((row: any) => ({
      id: row.id,
      dealerId: row.dealer_id,
      type: row.type,
      title: row.title,
      message: row.message,
      isRead: row.is_read,
      link: row.link,
      metadata: row.metadata,
      createdAt: row.created_at,
    }));

    return NextResponse.json(notifications);
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
