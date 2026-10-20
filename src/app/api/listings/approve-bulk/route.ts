import { getAdminClient } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { createDraftProductsForListings } from '@/features/group-buy/server/products';
import { matchAllPools } from '@/features/group-buy/server/pools';

const supabase = getAdminClient();
const UPDATE_CHUNK = 80;
const MAX_IDS = 500;

// POST: 대기 상장 여러 건을 한 번에 승인하고, 수요 풀 매칭은 마지막에 한 번만 한다
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ids = body?.ids;
    const approvedBy = typeof body?.approvedBy === 'string' ? body.approvedBy : null;

    if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_IDS || ids.some((id) => typeof id !== 'string')) {
      return NextResponse.json({ error: '승인할 상장 목록이 올바르지 않습니다.' }, { status: 400 });
    }

    const approvedIds: string[] = [];
    const approvedAt = new Date().toISOString();

    for (let index = 0; index < ids.length; index += UPDATE_CHUNK) {
      const chunk = ids.slice(index, index + UPDATE_CHUNK);
      const { data, error } = await supabase
        .from('cattle_listings')
        .update({
          status: 'approved',
          approved_at: approvedAt,
          approved_by: approvedBy,
        })
        .in('id', chunk)
        .eq('status', 'pending')
        .select('id');

      if (error) {
        console.error('상장 일괄 승인 오류:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      approvedIds.push(...((data ?? []) as { id: string }[]).map((row) => row.id));
    }

    try {
      const drafts = await createDraftProductsForListings(approvedIds);
      if (drafts.error) console.error('[group-buy] draft 생성 일부 실패:', drafts.error);
      await matchAllPools(approvedBy);
    } catch (error) {
      console.error('[group-buy] draft 생성/풀 매칭 실패:', error);
    }

    return NextResponse.json({
      approved: approvedIds.length,
      skipped: ids.length - approvedIds.length,
    });
  } catch (error) {
    console.error('상장 일괄 승인 오류:', error);
    return NextResponse.json({ error: '상장 승인 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
