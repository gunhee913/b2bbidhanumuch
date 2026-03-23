import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';

const supabase = getAdminClient();

const PART_NORMALIZE: Record<string, string> = {
  '등심(좌)': '등심', '등심(우)': '등심',
  '양지(좌)': '양지', '양지(우)': '양지',
  '설도(좌)': '설도', '설도(우)': '설도',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dealerId = searchParams.get('dealerId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!dealerId || !startDate || !endDate) {
      return NextResponse.json({ error: 'dealerId, startDate, endDate는 필수입니다.' }, { status: 400 });
    }

    const listingsQuery = supabase
      .from('cattle_listings')
      .select(`
        id,
        listing_date,
        company_id,
        companies ( id, name )
      `)
      .gte('listing_date', startDate)
      .lte('listing_date', endDate)
      .in('status', ['approved', 'auction', 'closed', 'completed']);

    const { data: listings, error: listingsError } = await listingsQuery;

    if (listingsError) {
      return NextResponse.json({ error: listingsError.message }, { status: 500 });
    }

    if (!listings || listings.length === 0) {
      return NextResponse.json({
        summary: { bidCount: 0, wonCount: 0, wonAmount: 0, wonRate: 0 },
        daily: [],
        byPart: [],
        byPartner: [],
      });
    }

    const listingIds = listings.map(l => l.id);
    const BATCH_SIZE = 200;

    const allPartsArr: any[] = [];
    for (let i = 0; i < listingIds.length; i += BATCH_SIZE) {
      const batch = listingIds.slice(i, i + BATCH_SIZE);
      const { data: batchParts, error: batchError } = await supabase
        .from('cattle_parts')
        .select('id, listing_id, part_name, weight, bid_price, bid_amount, winning_dealer_id')
        .in('listing_id', batch);
      if (batchError) {
        return NextResponse.json({ error: batchError.message }, { status: 500 });
      }
      if (batchParts) allPartsArr.push(...batchParts);
    }

    const partIds = allPartsArr.map(p => p.id);
    const myBidsArr: any[] = [];
    for (let i = 0; i < partIds.length; i += BATCH_SIZE) {
      const batch = partIds.slice(i, i + BATCH_SIZE);
      const { data: batchBids } = await supabase
        .from('bids')
        .select('id, part_id')
        .eq('dealer_id', dealerId)
        .in('part_id', batch);
      if (batchBids) myBidsArr.push(...batchBids);
    }

    const myBidPartIds = new Set(myBidsArr.map(b => b.part_id));

    const listingMap = new Map<string, any>();
    listings.forEach(l => listingMap.set(l.id, l));

    const myWonParts = allPartsArr.filter(p => p.winning_dealer_id === dealerId);
    const bidCount = myBidsArr.length;
    const wonCount = myWonParts.length;
    const wonAmount = myWonParts.reduce((sum: number, p: any) => sum + (p.bid_amount || 0), 0);
    const wonRate = bidCount > 0 ? +(wonCount / bidCount * 100).toFixed(1) : 0;

    // --- 일별 집계 ---
    const dailyMap = new Map<string, { bidCount: number; wonCount: number; wonAmount: number }>();

    allPartsArr.forEach(p => {
      const listing = listingMap.get(p.listing_id);
      if (!listing) return;
      const date = listing.listing_date;

      if (!dailyMap.has(date)) dailyMap.set(date, { bidCount: 0, wonCount: 0, wonAmount: 0 });
      const d = dailyMap.get(date)!;

      if (myBidPartIds.has(p.id)) {
        d.bidCount++;
      }
      if (p.winning_dealer_id === dealerId) {
        d.wonCount++;
        d.wonAmount += p.bid_amount || 0;
      }
    });

    const daily = [...dailyMap.entries()]
      .filter(([, d]) => d.bidCount > 0 || d.wonCount > 0)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, d]) => ({ date, ...d }));

    // --- 부위별 낙찰현황 ---
    const partAgg = new Map<string, { bidCount: number; wonCount: number; wonAmount: number; weight: number }>();
    allPartsArr.forEach(p => {
      const name = PART_NORMALIZE[p.part_name] || p.part_name;
      const isBid = myBidPartIds.has(p.id);
      const isWon = p.winning_dealer_id === dealerId;
      if (!isBid && !isWon) return;

      if (!partAgg.has(name)) partAgg.set(name, { bidCount: 0, wonCount: 0, wonAmount: 0, weight: 0 });
      const a = partAgg.get(name)!;
      if (isBid) a.bidCount++;
      if (isWon) {
        a.wonCount++;
        a.wonAmount += p.bid_amount || 0;
        a.weight += p.weight || 0;
      }
    });

    const byPart = [...partAgg.entries()]
      .map(([name, d]) => ({
        name,
        bidCount: d.bidCount,
        wonCount: d.wonCount,
        wonAmount: d.wonAmount,
        weight: d.weight,
        wonRate: d.bidCount > 0 ? +(d.wonCount / d.bidCount * 100).toFixed(1) : 0,
        ratio: wonAmount > 0 ? +(d.wonAmount / wonAmount * 100).toFixed(1) : 0,
      }))
      .sort((a, b) => b.wonAmount - a.wonAmount);

    // --- 거래처(파트너)별 낙찰현황 ---
    const wonPartIds = myWonParts.map((p: any) => p.id);
    const partnerAgg = new Map<string, { partnerName: string; wonCount: number; wonAmount: number; weight: number }>();

    if (wonPartIds.length > 0) {
      const allAssignments: any[] = [];
      for (let i = 0; i < wonPartIds.length; i += BATCH_SIZE) {
        const batch = wonPartIds.slice(i, i + BATCH_SIZE);
        const { data: batchAssignments } = await supabase
          .from('delivery_assignments')
          .select('part_id, partners ( id, partner_no, name )')
          .in('part_id', batch);
        if (batchAssignments) allAssignments.push(...batchAssignments);
      }

      const assignmentMap = new Map<string, any>();
      allAssignments.forEach((a: any) => {
        assignmentMap.set(a.part_id, a.partners);
      });

      myWonParts.forEach((p: any) => {
        const partner = assignmentMap.get(p.id);
        const partnerName = partner?.name || '미지정';
        const partnerId = partner?.id || 'unassigned';

        if (!partnerAgg.has(partnerId)) {
          partnerAgg.set(partnerId, { partnerName, wonCount: 0, wonAmount: 0, weight: 0 });
        }
        const a = partnerAgg.get(partnerId)!;
        a.wonCount++;
        a.wonAmount += p.bid_amount || 0;
        a.weight += p.weight || 0;
      });
    }

    const byPartner = [...partnerAgg.values()]
      .map(d => ({
        name: d.partnerName,
        wonCount: d.wonCount,
        wonAmount: d.wonAmount,
        weight: d.weight,
        ratio: wonAmount > 0 ? +(d.wonAmount / wonAmount * 100).toFixed(1) : 0,
      }))
      .sort((a, b) => b.wonAmount - a.wonAmount);

    return NextResponse.json({
      summary: { bidCount, wonCount, wonAmount, wonRate },
      daily,
      byPart,
      byPartner,
    });
  } catch (error) {
    console.error('딜러 대시보드 조회 오류:', error);
    return NextResponse.json({ error: '대시보드 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
