import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';

const supabase = getAdminClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const dealerId = searchParams.get('dealerId');
    const companyId = searchParams.get('companyId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query = supabase
      .from('cattle_parts')
      .select(`
        id,
        part_no,
        part_name,
        listing_part_no,
        weight,
        bid_price,
        bid_amount,
        bid_at,
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
          month_age,
          carcass_weight,
          back_fat,
          eye_muscle,
          marbling_score,
          meat_color,
          fat_color,
          texture,
          maturity,
          slaughter_house,
          slaughter_no,
          slaughter_date,
          process_date,
          process_weight,
          company_id,
          closed_at,
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

    if (dealerId) {
      query = query.eq('winning_dealer_id', dealerId);
    }

    const { data: parts, error } = await query;

    if (error) {
      console.error('낙찰 부위 조회 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const filtered = (parts || []).filter((part: any) => {
      const listing = part.cattle_listings;
      if (date && listing?.listing_date !== date) return false;
      if (startDate && listing?.listing_date < startDate) return false;
      if (endDate && listing?.listing_date > endDate) return false;
      if (companyId && listing?.company_id !== companyId) return false;
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
        bidAt: part.bid_at || listing?.closed_at || '',
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
        monthAge: listing?.month_age || 0,
        carcassWeight: Number(listing?.carcass_weight || 0),
        backFat: listing?.back_fat || 0,
        eyeMuscle: listing?.eye_muscle || 0,
        marbling: listing?.marbling_score || 0,
        meatColor: listing?.meat_color || 0,
        fatColor: listing?.fat_color || 0,
        texture: listing?.texture || 0,
        maturity: listing?.maturity || 0,
        slaughterHouse: listing?.slaughter_house || '',
        slaughterNo: listing?.slaughter_no || '',
        slaughterDate: listing?.slaughter_date || '',
        processDate: listing?.process_date || '',
        processWeight: Number(listing?.process_weight || 0),
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
