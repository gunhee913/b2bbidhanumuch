import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7', 10);
    const grade = searchParams.get('grade');
    const partNames = searchParams.get('partNames');

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    const sinceDateStr = sinceDate.toISOString().split('T')[0];

    let query = supabase
      .from('cattle_parts')
      .select(`
        part_name,
        bid_price,
        weight,
        cattle_listings!inner (
          listing_date,
          grade,
          marbling_score
        )
      `)
      .not('winning_dealer_id', 'is', null)
      .not('bid_price', 'is', null)
      .gte('cattle_listings.listing_date', sinceDateStr);

    if (grade) {
      const baseGrade = grade.replace(/[A-C]$/, '');
      query = query.ilike('cattle_listings.grade', `${baseGrade}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Market price query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ parts: [] });
    }

    const requestedParts = partNames
      ? partNames.split(',').map(n => n.trim().replace(/\(좌\)|\(우\)/, '').trim())
      : null;

    const partMap: Record<string, { prices: number[]; recentPrices: number[]; count: number }> = {};

    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 3);
    const recentDateStr = recentDate.toISOString().split('T')[0];

    for (const row of data) {
      const rawName = row.part_name as string;
      if (!rawName) continue;
      const baseName = rawName.replace(/\(좌\)|\(우\)/, '').trim();

      if (requestedParts && !requestedParts.includes(baseName)) continue;

      const price = row.bid_price as number;
      if (!price || price <= 0) continue;

      if (!partMap[baseName]) {
        partMap[baseName] = { prices: [], recentPrices: [], count: 0 };
      }

      partMap[baseName].prices.push(price);
      partMap[baseName].count++;

      const listing = row.cattle_listings as any;
      if (listing?.listing_date >= recentDateStr) {
        partMap[baseName].recentPrices.push(price);
      }
    }

    const parts = Object.entries(partMap).map(([name, data]) => {
      const avg = Math.round(data.prices.reduce((a, b) => a + b, 0) / data.prices.length);
      const min = Math.min(...data.prices);
      const max = Math.max(...data.prices);

      let trend: 'up' | 'down' | 'stable' = 'stable';
      let trendPercent = 0;

      if (data.recentPrices.length >= 1 && data.prices.length > data.recentPrices.length) {
        const recentAvg = data.recentPrices.reduce((a, b) => a + b, 0) / data.recentPrices.length;
        const olderPrices = data.prices.filter(p => !data.recentPrices.includes(p));
        if (olderPrices.length > 0) {
          const olderAvg = olderPrices.reduce((a, b) => a + b, 0) / olderPrices.length;
          trendPercent = ((recentAvg - olderAvg) / olderAvg) * 100;
          if (trendPercent > 1) trend = 'up';
          else if (trendPercent < -1) trend = 'down';
        }
      }

      return {
        partName: name,
        avgPrice: avg,
        minPrice: min,
        maxPrice: max,
        count: data.count,
        trend,
        trendPercent: Math.round(trendPercent * 10) / 10,
      };
    });

    return NextResponse.json({ parts, days, grade: grade || 'all' });
  } catch (error) {
    console.error('Market part-prices error:', error);
    return NextResponse.json(
      { error: '시세 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
