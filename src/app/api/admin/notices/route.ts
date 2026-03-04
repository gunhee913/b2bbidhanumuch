import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createPureClient();

    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const notices = (data || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      category: row.category,
      isPinned: row.is_pinned,
      isPublished: row.is_published,
      target: row.target,
      authorId: row.author_id,
      authorName: row.author_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json(notices);
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const body = await request.json();

    const { title, content, category, isPinned, isPublished, target, authorId, authorName } = body;

    if (!title || !content) {
      return NextResponse.json({ error: '제목과 내용은 필수입니다.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('notices')
      .insert({
        title,
        content,
        category: category || '일반',
        is_pinned: isPinned || false,
        is_published: isPublished || false,
        target: target || 'all',
        author_id: authorId || null,
        author_name: authorName || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      title: data.title,
      content: data.content,
      category: data.category,
      isPinned: data.is_pinned,
      isPublished: data.is_published,
      target: data.target,
      authorId: data.author_id,
      authorName: data.author_name,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
