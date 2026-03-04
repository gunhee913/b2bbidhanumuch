import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createPureClient();

    const { data, error } = await supabase
      .from('notification_templates')
      .select('*')
      .order('id');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const templates = (data || []).map((row: any) => ({
      id: row.id,
      titleTemplate: row.title_template,
      messageTemplate: row.message_template,
      availableVars: row.available_vars,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json(templates);
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const body = await request.json();
    const { id, titleTemplate, messageTemplate } = body;

    if (!id) {
      return NextResponse.json({ error: 'id는 필수입니다.' }, { status: 400 });
    }

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (titleTemplate !== undefined) updateData.title_template = titleTemplate;
    if (messageTemplate !== undefined) updateData.message_template = messageTemplate;

    const { data, error } = await supabase
      .from('notification_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      titleTemplate: data.title_template,
      messageTemplate: data.message_template,
      availableVars: data.available_vars,
      updatedAt: data.updated_at,
    });
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
