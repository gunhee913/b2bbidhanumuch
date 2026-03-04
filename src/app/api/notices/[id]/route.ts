import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createPureClient();

    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .eq('id', id)
      .eq('is_published', true)
      .single();

    if (error) {
      return NextResponse.json({ error: '공지사항을 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({
      id: data.id,
      title: data.title,
      content: data.content,
      category: data.category,
      isPinned: data.is_pinned,
      target: data.target,
      createdAt: data.created_at,
    });
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
