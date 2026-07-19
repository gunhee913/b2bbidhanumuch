import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';

const supabase = getAdminClient();

// GET: 실시간 경락 내역 조회 (메인 페이지 위젯용 경량 API)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = Number(searchParams.get('limit') || 20);
    const limit = Math.min(Math.max(limitParam, 1), 100);

    const { data: listings, error } = await supabase
      .from('cattle_listings')
      .select(`
        id,
        closed_at,
        slaughter_house,
        breed,
        gender,
        grade,
        marbling_score,
        companies (
          id,
          name
        ),
        cattle_parts (
          id,
          part_no,
          part_name,
          weight,
          bid_price,
          bid_amount,
          winning_dealer_id,
          bid_at,
          is_included
        )
      `)
      .in('status', ['closed', 'completed'])
      .not('closed_at', 'is', null)
      .order('closed_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('live-settlements query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!listings || listings.length === 0) {
      return NextResponse.json({ records: [] });
    }

    // grade 문자열 정규화 (육질+육량+근내지방도 결합)
    // 예: grade="1++A" + marblingScore=9 -> "1++A(9)"
    // 예: grade="1+B" -> "1+B"
    // 예: 이미 "1++A(9)" 형태면 그대로 반환
    const formatGrade = (
      grade: string | null,
      marblingScore: number | null,
    ) => {
      if (!grade) return '';
      if (grade.includes('(')) return grade;
      if (marblingScore && grade.startsWith('1++')) {
        return `${grade}(${marblingScore})`;
      }
      return grade;
    };

    const records: Array<{
      id: string;
      settledAt: string | null;
      slaughterHouse: string;
      companyName: string;
      breed: string;
      gender: string;
      partName: string;
      weight: number;
      bidPrice: number;
      bidAmount: number;
      grade: string;
    }> = [];

    listings.forEach((listing: any) => {
      const company = listing.companies as any;
      const formattedGrade = formatGrade(listing.grade, listing.marbling_score);

      const parts = (listing.cattle_parts || []).filter(
        (p: any) => p.is_included && p.winning_dealer_id && p.bid_price,
      );

      parts.forEach((part: any) => {
        records.push({
          id: `${listing.id}-${part.id}`,
          settledAt: part.bid_at || listing.closed_at,
          slaughterHouse: listing.slaughter_house || '',
          companyName: company?.name || '',
          breed: listing.breed || '',
          gender: listing.gender || '',
          partName: part.part_name || '',
          weight: Number(part.weight) || 0,
          bidPrice: Number(part.bid_price) || 0,
          bidAmount: Number(part.bid_amount) || 0,
          grade: formattedGrade,
        });
      });
    });

    // 경락일시 desc 정렬 (bid_at 우선, closed_at fallback)
    records.sort((a, b) => {
      const aTime = a.settledAt ? new Date(a.settledAt).getTime() : 0;
      const bTime = b.settledAt ? new Date(b.settledAt).getTime() : 0;
      return bTime - aTime;
    });

    return NextResponse.json({ records: records.slice(0, limit) });
  } catch (error) {
    console.error('live-settlements error:', error);
    return NextResponse.json(
      { error: '경락 내역 조회 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
