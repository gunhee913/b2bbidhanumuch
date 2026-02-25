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

    const { data: parts, error } = await supabase
      .from('cattle_parts')
      .select(`
        id,
        part_no,
        part_name,
        listing_part_no,
        weight,
        bid_price,
        bid_amount,
        winning_dealer_id,
        cattle_listings!inner (
          id,
          listing_no,
          listing_date,
          status,
          grade,
          trace_no,
          breed,
          gender,
          company_id,
          companies (
            name
          )
        ),
        dealers!cattle_parts_winning_dealer_id_fkey (
          id,
          dealer_no,
          name
        )
      `)
      .not('winning_dealer_id', 'is', null)
      .not('bid_amount', 'is', null);

    if (error) {
      console.error('낙찰 부위 조회 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const filtered = (parts || []).filter((part: any) => {
      const listing = part.cattle_listings;
      if (listing?.status !== 'closed') return false;
      if (date && listing?.listing_date !== date) return false;
      return true;
    });

    const winningParts = filtered.map((part: any) => {
      const listing = part.cattle_listings;
      const dealer = part.dealers;
      return {
        partId: part.id,
        partNo: part.part_no,
        partName: part.part_name,
        listingPartNo: part.listing_part_no,
        weight: Number(part.weight || 0),
        bidPrice: Number(part.bid_price || 0),
        bidAmount: Number(part.bid_amount || 0),
        dealerId: dealer?.id || '',
        dealerNo: dealer?.dealer_no || '',
        dealerName: dealer?.name || '',
        listingId: listing?.id || '',
        listingNo: listing?.listing_no || '',
        listingDate: listing?.listing_date || '',
        grade: listing?.grade || '',
        traceNo: listing?.trace_no || '',
        breed: listing?.breed || '',
        gender: listing?.gender || '',
        companyName: listing?.companies?.name || '',
      };
    });

    winningParts.sort((a: any, b: any) => {
      if (a.dealerNo !== b.dealerNo) return a.dealerNo.localeCompare(b.dealerNo);
      if (a.listingNo !== b.listingNo) return a.listingNo.localeCompare(b.listingNo);
      return a.partNo - b.partNo;
    });

    return NextResponse.json({ winningParts });
  } catch (error) {
    console.error('낙찰 부위 조회 오류:', error);
    return NextResponse.json({ error: '낙찰 부위 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
