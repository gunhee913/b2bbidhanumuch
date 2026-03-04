import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createPureClient();

    const { data, error } = await supabase
      .from('admin_notification_settings')
      .select('*')
      .order('category')
      .order('id');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const settings = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      enabled: row.enabled,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const body = await request.json();
    const { id, enabled } = body;

    if (!id || enabled === undefined) {
      return NextResponse.json({ error: 'id와 enabled는 필수입니다.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('admin_notification_settings')
      .update({ enabled, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      name: data.name,
      description: data.description,
      category: data.category,
      enabled: data.enabled,
      updatedAt: data.updated_at,
    });
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
