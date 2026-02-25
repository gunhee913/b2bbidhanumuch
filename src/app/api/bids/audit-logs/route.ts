import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const partId = searchParams.get('partId');
    const actionTypes = searchParams.get('actionTypes');

    if (!date) {
      return NextResponse.json({ error: '날짜를 지정해주세요.' }, { status: 400 });
    }

    const startOfDay = `${date}T00:00:00+09:00`;
    const endOfDay = `${date}T23:59:59+09:00`;

    let query = supabase
      .from('bid_audit_logs')
      .select(`
        id,
        bid_id,
        part_id,
        action_type,
        old_bid_price,
        new_bid_price,
        old_bid_amount,
        new_bid_amount,
        performed_by,
        created_at,
        dealers (
          id,
          name,
          dealer_no
        ),
        cattle_parts (
          id,
          part_name,
          part_no,
          listing_id,
          cattle_listings (
            id,
            listing_no
          )
        )
      `)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('created_at', { ascending: false });

    if (partId) {
      query = query.eq('part_id', partId);
    }

    if (actionTypes) {
      query = query.in('action_type', actionTypes.split(','));
    }

    const { data, error } = await query;

    if (error) {
      console.error('수정이력 조회 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const logs = (data || []).map((log: any) => ({
      id: log.id,
      bidId: log.bid_id,
      partId: log.part_id,
      actionType: log.action_type,
      oldBidPrice: log.old_bid_price,
      newBidPrice: log.new_bid_price,
      oldBidAmount: log.old_bid_amount,
      newBidAmount: log.new_bid_amount,
      performedBy: log.performed_by,
      createdAt: log.created_at,
      dealerName: log.dealers?.name || '-',
      dealerNo: log.dealers?.dealer_no || '-',
      partName: log.cattle_parts?.part_name || '-',
      listingNo: log.cattle_parts?.cattle_listings?.listing_no || '-',
    }));

    return NextResponse.json(logs);
  } catch (error) {
    console.error('수정이력 조회 오류:', error);
    return NextResponse.json(
      { error: '수정이력 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
