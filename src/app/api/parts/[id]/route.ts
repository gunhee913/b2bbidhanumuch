import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';

const supabase = getAdminClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: part, error } = await supabase
      .from('cattle_parts')
      .select(`
        id,
        part_no,
        part_name,
        listing_part_no,
        weight,
        min_price,
        bid_price,
        bid_amount,
        winning_dealer_id,
        cattle_listings (
          id,
          listing_no,
          listing_date,
          breed,
          gender,
          grade,
          marbling_score,
          month_age,
          trace_no,
          carcass_weight,
          companies ( id, name )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: '부위를 찾을 수 없습니다.' }, { status: 404 });
    }

    const listing = part.cattle_listings as any;

    return NextResponse.json({
      partId: part.id,
      partName: part.part_name,
      listingPartNo: part.listing_part_no,
      weight: part.weight,
      minPrice: part.min_price,
      bidPrice: part.bid_price,
      bidAmount: part.bid_amount,
      winningDealerId: part.winning_dealer_id,
      listingNo: listing?.listing_no || '',
      listingDate: listing?.listing_date || '',
      breed: listing?.breed || '한우',
      gender: listing?.gender || '',
      grade: listing?.grade || '',
      marblingScore: listing?.marbling_score,
      monthAge: listing?.month_age,
      traceNo: listing?.trace_no || '',
      carcassWeight: listing?.carcass_weight,
      companyName: listing?.companies?.name || '',
    });
  } catch (error) {
    console.error('부위 조회 오류:', error);
    return NextResponse.json(
      { error: '부위 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
