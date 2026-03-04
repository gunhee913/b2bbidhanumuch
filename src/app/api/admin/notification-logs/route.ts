import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    let query = supabase
      .from('notification_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const logs = (data || []).map((row: any) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      message: row.message,
      target: row.target,
      recipientCount: row.recipient_count,
      createdBy: row.created_by,
      createdByName: row.created_by_name,
      createdAt: row.created_at,
    }));

    return NextResponse.json(logs);
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
