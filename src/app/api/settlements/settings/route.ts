import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';

const supabase = getAdminClient();

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('settlement_settings')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      value: Number(row.value),
      enabled: row.enabled,
      sortOrder: row.sort_order,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json({ error: '설정 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, updatedBy } = body as {
      items: Array<{
        id?: string;
        name: string;
        type: 'percentage' | 'fixed';
        value: number;
        enabled: boolean;
        sortOrder: number;
      }>;
      updatedBy: string;
    };

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: '항목 데이터가 필요합니다.' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('settlement_settings')
      .select('id');

    const existingIds = new Set((existing || []).map((r: any) => r.id));
    const incomingIds = new Set(items.filter(i => i.id).map(i => i.id));

    const deleteIds = [...existingIds].filter(id => !incomingIds.has(id));
    if (deleteIds.length > 0) {
      await supabase.from('settlement_settings').delete().in('id', deleteIds);
    }

    for (const item of items) {
      const row = {
        name: item.name,
        type: item.type,
        value: item.value,
        enabled: item.enabled,
        sort_order: item.sortOrder,
        updated_at: new Date().toISOString(),
        updated_by: updatedBy || '',
      };

      if (item.id && existingIds.has(item.id)) {
        await supabase
          .from('settlement_settings')
          .update(row)
          .eq('id', item.id);
      } else {
        await supabase
          .from('settlement_settings')
          .insert({ ...row, id: item.id || undefined });
      }
    }

    const { data: updated } = await supabase
      .from('settlement_settings')
      .select('*')
      .order('sort_order', { ascending: true });

    const result = (updated || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      value: Number(r.value),
      enabled: r.enabled,
      sortOrder: r.sort_order,
      updatedAt: r.updated_at,
      updatedBy: r.updated_by,
    }));

    return NextResponse.json({ items: result });
  } catch (error) {
    console.error('설정 저장 오류:', error);
    return NextResponse.json({ error: '설정 저장 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
