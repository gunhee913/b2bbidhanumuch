import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const { searchParams } = new URL(request.url);
    const target = searchParams.get('target') || 'all';
    const limit = Number(searchParams.get('limit')) || 50;

    let query = supabase
      .from('notices')
      .select('*')
      .eq('is_published', true)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (target !== 'all') {
      query = query.or(`target.eq.all,target.eq.${target}`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const notices = (data || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      category: row.category,
      isPinned: row.is_pinned,
      target: row.target,
      createdAt: row.created_at,
    }));

    return NextResponse.json(notices);
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
