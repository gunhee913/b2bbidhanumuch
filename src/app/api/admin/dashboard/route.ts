import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PART_NORMALIZE: Record<string, string> = {
  '등심(좌)': '등심', '등심(우)': '등심',
  '양지(좌)': '양지', '양지(우)': '양지',
  '설도(좌)': '설도', '설도(우)': '설도',
};

function normalizeGrade(grade: string, marblingScore: number | null): string {
  if (!grade) return '기타';
  if (grade.startsWith('1++') && marblingScore) return `1++(${marblingScore})`;
  if (grade.startsWith('1++')) return '1++';
  if (grade.startsWith('1+')) return '1+';
  if (grade.startsWith('1')) return '1';
  if (grade.startsWith('2')) return '2';
  return grade;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: '기간은 필수입니다.' }, { status: 400 });
    }

    const { data: listings, error: listingsError } = await supabase
      .from('cattle_listings')
      .select(`
        id,
        listing_no,
        listing_date,
        grade,
        marbling_score,
        company_id,
        companies ( id, name )
      `)
      .gte('listing_date', startDate)
      .lte('listing_date', endDate)
      .in('status', ['approved', 'auction', 'closed', 'completed']);

    if (listingsError) {
      return NextResponse.json({ error: listingsError.message }, { status: 500 });
    }

    if (!listings || listings.length === 0) {
      return NextResponse.json({
        summary: { cattleCount: 0, partCount: 0, wonCount: 0, wonAmount: 0, feeRate: 1.5, feeAmount: 0, deliveryFeeRate: 0, deliveryFeeAmount: 0 },
        daily: [],
        byPart: [],
        byGrade: [],
        byCompany: [],
        byDealer: [],
      });
    }

    const listingIds = listings.map(l => l.id);

    const { data: parts, error: partsError } = await supabase
      .from('cattle_parts')
      .select('id, listing_id, part_name, weight, bid_price, bid_amount, winning_dealer_id')
      .in('listing_id', listingIds);

    if (partsError) {
      return NextResponse.json({ error: partsError.message }, { status: 500 });
    }

    const { data: feeSettings } = await supabase
      .from('settlement_settings')
      .select('name, type, value')
      .eq('enabled', true);

    const feeRate = Number(feeSettings?.find(s => s.name === '상장수수료')?.value) || 1.5;
    const deliveryFeeSetting = feeSettings?.find(s => s.name === '배송수수료');
    const deliveryFeeRate = Number(deliveryFeeSetting?.value) || 0;

    const listingMap = new Map<string, any>();
    listings.forEach(l => listingMap.set(l.id, l));

    const allParts = parts || [];
    const wonParts = allParts.filter(p => p.winning_dealer_id);

    const cattleCount = listings.length;
    const partCount = allParts.length;
    const wonCount = wonParts.length;
    const wonAmount = wonParts.reduce((sum, p) => sum + (p.bid_amount || 0), 0);
    const feeAmount = Math.round(wonAmount * feeRate / 100);
    const deliveryFeeAmount = Math.round(wonAmount * deliveryFeeRate / 100);

    // --- 일별 집계 ---
    const dailyMap = new Map<string, { cattleCount: number; partCount: number; wonCount: number; wonAmount: number }>();
    const listingDateMap = new Map<string, Set<string>>();

    allParts.forEach(p => {
      const listing = listingMap.get(p.listing_id);
      if (!listing) return;
      const date = listing.listing_date;

      if (!listingDateMap.has(date)) listingDateMap.set(date, new Set());
      listingDateMap.get(date)!.add(listing.id);

      if (!dailyMap.has(date)) dailyMap.set(date, { cattleCount: 0, partCount: 0, wonCount: 0, wonAmount: 0 });
      const d = dailyMap.get(date)!;
      d.partCount++;
      if (p.winning_dealer_id) {
        d.wonCount++;
        d.wonAmount += p.bid_amount || 0;
      }
    });

    listingDateMap.forEach((ids, date) => {
      if (dailyMap.has(date)) {
        dailyMap.get(date)!.cattleCount = ids.size;
      }
    });

    const daily = [...dailyMap.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, d]) => ({ date, ...d, feeAmount: Math.round(d.wonAmount * feeRate / 100), deliveryFeeAmount: Math.round(d.wonAmount * deliveryFeeRate / 100) }));

    // --- 부위별 집계 ---
    const partAgg = new Map<string, { partCount: number; count: number; amount: number; weight: number }>();
    allParts.forEach(p => {
      const name = PART_NORMALIZE[p.part_name] || p.part_name;
      if (!partAgg.has(name)) partAgg.set(name, { partCount: 0, count: 0, amount: 0, weight: 0 });
      const a = partAgg.get(name)!;
      a.partCount++;
      if (p.winning_dealer_id) {
        a.count++;
        a.amount += p.bid_amount || 0;
        a.weight += p.weight || 0;
      }
    });
    const byPart = [...partAgg.entries()]
      .map(([name, d]) => ({
        name,
        partCount: d.partCount,
        count: d.count,
        amount: d.amount,
        weight: d.weight,
        bidRate: d.partCount > 0 ? +(d.count / d.partCount * 100).toFixed(1) : 0,
        ratio: wonAmount > 0 ? +(d.amount / wonAmount * 100).toFixed(1) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // --- 등급별 집계 ---
    const gradeAgg = new Map<string, { cattleIds: Set<string>; partCount: number; wonCount: number; wonAmount: number; weight: number }>();
    allParts.forEach(p => {
      const listing = listingMap.get(p.listing_id);
      if (!listing) return;
      const grade = normalizeGrade(listing.grade, listing.marbling_score);
      if (!gradeAgg.has(grade)) gradeAgg.set(grade, { cattleIds: new Set(), partCount: 0, wonCount: 0, wonAmount: 0, weight: 0 });
      const a = gradeAgg.get(grade)!;
      a.cattleIds.add(listing.id);
      a.partCount++;
      if (p.winning_dealer_id) {
        a.wonCount++;
        a.wonAmount += p.bid_amount || 0;
        a.weight += p.weight || 0;
      }
    });
    const gradeOrder = ['1++(9)', '1++(8)', '1++(7)', '1++', '1+', '1', '2', '기타'];
    const byGrade = [...gradeAgg.entries()]
      .map(([name, d]) => ({
        name,
        cattleCount: d.cattleIds.size,
        partCount: d.partCount,
        wonCount: d.wonCount,
        wonAmount: d.wonAmount,
        weight: d.weight,
        bidRate: d.partCount > 0 ? +(d.wonCount / d.partCount * 100).toFixed(1) : 0,
        ratio: wonAmount > 0 ? +(d.wonAmount / wonAmount * 100).toFixed(1) : 0,
      }))
      .sort((a, b) => gradeOrder.indexOf(a.name) - gradeOrder.indexOf(b.name));

    // --- 상장업체별 집계 ---
    const companyAgg = new Map<string, { companyName: string; cattleIds: Set<string>; partCount: number; wonCount: number; wonAmount: number; weight: number }>();
    allParts.forEach(p => {
      const listing = listingMap.get(p.listing_id);
      if (!listing) return;
      const companyId = listing.company_id;
      const companyName = (listing.companies as any)?.name || '미지정';
      if (!companyAgg.has(companyId)) companyAgg.set(companyId, { companyName, cattleIds: new Set(), partCount: 0, wonCount: 0, wonAmount: 0, weight: 0 });
      const a = companyAgg.get(companyId)!;
      a.cattleIds.add(listing.id);
      a.partCount++;
      if (p.winning_dealer_id) {
        a.wonCount++;
        a.wonAmount += p.bid_amount || 0;
        a.weight += p.weight || 0;
      }
    });
    const byCompany = [...companyAgg.values()]
      .map(d => ({
        name: d.companyName,
        cattleCount: d.cattleIds.size,
        partCount: d.partCount,
        wonCount: d.wonCount,
        wonAmount: d.wonAmount,
        weight: d.weight,
        bidRate: d.partCount > 0 ? +(d.wonCount / d.partCount * 100).toFixed(1) : 0,
        ratio: wonAmount > 0 ? +(d.wonAmount / wonAmount * 100).toFixed(1) : 0,
      }))
      .sort((a, b) => b.wonAmount - a.wonAmount);

    // --- 중도매인별 낙찰현황 ---
    const dealerIds = [...new Set(wonParts.map(p => p.winning_dealer_id).filter(Boolean))];
    let dealerNameMap = new Map<string, string>();
    if (dealerIds.length > 0) {
      const { data: dealers } = await supabase
        .from('dealers')
        .select('id, name')
        .in('id', dealerIds);
      (dealers || []).forEach(d => dealerNameMap.set(d.id, d.name));
    }

    const dealerAgg = new Map<string, { dealerName: string; cattleIds: Set<string>; bidCount: number; wonCount: number; wonAmount: number }>();

    const partIds = allParts.map(p => p.id);
    const { data: allBids } = await supabase
      .from('bids')
      .select('id, dealer_id, part_id')
      .in('part_id', partIds);

    const bidsByDealer = new Map<string, number>();
    (allBids || []).forEach(b => {
      bidsByDealer.set(b.dealer_id, (bidsByDealer.get(b.dealer_id) || 0) + 1);
    });

    const bidDealerIds = new Set<string>([...(allBids || []).map(b => b.dealer_id)]);
    if (bidDealerIds.size > 0 && dealerIds.length === 0) {
      const { data: extraDealers } = await supabase
        .from('dealers')
        .select('id, name')
        .in('id', [...bidDealerIds]);
      (extraDealers || []).forEach(d => dealerNameMap.set(d.id, d.name));
    }

    bidDealerIds.forEach(dealerId => {
      if (!dealerAgg.has(dealerId)) {
        dealerAgg.set(dealerId, { dealerName: dealerNameMap.get(dealerId) || '알 수 없음', cattleIds: new Set(), bidCount: 0, wonCount: 0, wonAmount: 0 });
      }
      dealerAgg.get(dealerId)!.bidCount = bidsByDealer.get(dealerId) || 0;
    });

    allParts.forEach(p => {
      const listing = listingMap.get(p.listing_id);
      if (!listing) return;
      const dealerId = p.winning_dealer_id;

      if (dealerId) {
        if (!dealerAgg.has(dealerId)) {
          dealerAgg.set(dealerId, { dealerName: dealerNameMap.get(dealerId) || '알 수 없음', cattleIds: new Set(), bidCount: bidsByDealer.get(dealerId) || 0, wonCount: 0, wonAmount: 0 });
        }
        const a = dealerAgg.get(dealerId)!;
        a.cattleIds.add(listing.id);
        a.wonCount++;
        a.wonAmount += p.bid_amount || 0;
      }
    });

    const byDealer = [...dealerAgg.entries()]
      .filter(([, d]) => d.bidCount > 0 || d.wonCount > 0)
      .map(([, d]) => ({
        name: d.dealerName,
        cattleCount: d.cattleIds.size,
        bidCount: d.bidCount,
        wonCount: d.wonCount,
        wonAmount: d.wonAmount,
        bidRate: d.bidCount > 0
          ? +(d.wonCount / d.bidCount * 100).toFixed(1)
          : 0,
        ratio: wonAmount > 0 ? +(d.wonAmount / wonAmount * 100).toFixed(1) : 0,
      }))
      .sort((a, b) => b.wonAmount - a.wonAmount);

    return NextResponse.json({
      summary: { cattleCount, partCount, wonCount, wonAmount, feeRate, feeAmount, deliveryFeeRate, deliveryFeeAmount },
      daily,
      byPart,
      byGrade,
      byCompany,
      byDealer,
    });
  } catch (error) {
    console.error('대시보드 조회 오류:', error);
    return NextResponse.json({ error: '대시보드 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
