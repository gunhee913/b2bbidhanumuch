import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: 거래처 지정 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    let query = supabase
      .from('delivery_assignments')
      .select(`
        id,
        part_id,
        partner_id,
        assigned_by,
        created_at,
        partners (
          id,
          partner_no,
          name,
          representative,
          phone,
          address,
          business_type,
          status
        )
      `);

    if (date) {
      const { data: partIds } = await supabase
        .from('cattle_parts')
        .select('id, cattle_listings!inner(listing_date)')
        .not('winning_dealer_id', 'is', null);

      const filteredPartIds = (partIds || [])
        .filter((p: any) => p.cattle_listings?.listing_date === date)
        .map((p: any) => p.id);

      if (filteredPartIds.length === 0) {
        return NextResponse.json({ assignments: {} });
      }

      query = query.in('part_id', filteredPartIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error('거래처 지정 조회 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const assignments: Record<string, any> = {};
    (data || []).forEach((a: any) => {
      assignments[a.part_id] = {
        id: a.id,
        partnerId: a.partner_id,
        partnerNo: a.partners?.partner_no || '',
        partnerName: a.partners?.name || '',
        representative: a.partners?.representative || '',
        phone: a.partners?.phone || '',
        address: a.partners?.address || '',
        assignedBy: a.assigned_by,
      };
    });

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error('거래처 지정 조회 오류:', error);
    return NextResponse.json({ error: '거래처 지정 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// POST: 거래처 지정 일괄 저장 (upsert)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assignments, assignedBy } = body as {
      assignments: Record<string, string | null>;
      assignedBy: string;
    };

    if (!assignments || Object.keys(assignments).length === 0) {
      return NextResponse.json({ error: '저장할 데이터가 없습니다.' }, { status: 400 });
    }

    const toUpsert: { part_id: string; partner_id: string; assigned_by: string }[] = [];
    const toDelete: string[] = [];

    for (const [partId, partnerId] of Object.entries(assignments)) {
      if (partnerId) {
        toUpsert.push({
          part_id: partId,
          partner_id: partnerId,
          assigned_by: assignedBy || '',
        });
      } else {
        toDelete.push(partId);
      }
    }

    if (toDelete.length > 0) {
      await supabase
        .from('delivery_assignments')
        .delete()
        .in('part_id', toDelete);
    }

    if (toUpsert.length > 0) {
      const { error } = await supabase
        .from('delivery_assignments')
        .upsert(toUpsert, { onConflict: 'part_id' });

      if (error) {
        console.error('거래처 지정 저장 오류:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ message: '저장되었습니다.' });
  } catch (error) {
    console.error('거래처 지정 저장 오류:', error);
    return NextResponse.json({ error: '거래처 지정 저장 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
