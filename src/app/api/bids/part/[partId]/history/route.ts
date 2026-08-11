import { getAdminClient } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { resolveAuth } from '@/lib/resolve-auth';

const supabase = getAdminClient();

/**
 * GET /api/bids/part/[partId]/history
 *
 * 부위별 입찰 타임라인 조회. 오픈 최고가 옥션 정책에 따라 로그인 없이도 최고가는 공개.
 *
 * 마스킹 정책:
 *   - admin_user / company_user → 딜러 실명 + 딜러번호 노출
 *   - dealer_user               → 본인은 "나", 다른 딜러는 first_bid_at 순으로
 *                                 "딜러 A", "딜러 B", ... 익명 라벨
 *   - anonymous                 → 모든 딜러 "딜러" 로만 표시 (신원 완전 은닉)
 *
 * `wasTopAtTime` 은 해당 입찰이 등록될 당시 최고가였는지 여부.
 * running max 로 계산 (오래된 순 스캔 → 시점별 최고가 뒤집힘 판정).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ partId: string }> },
) {
  try {
    const { partId } = await params;
    if (!partId) {
      return NextResponse.json(
        { error: 'partId 가 필요합니다.' },
        { status: 400 },
      );
    }

    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    const auth = await resolveAuth(request);
    const userType = (auth?.userType || (token?.userType as string)) as
      | string
      | undefined;
    const dealerId = auth?.dealerId || null;
    const isAdmin = userType === 'admin_user';
    const isCompany = userType === 'company_user';
    const showRealNames = isAdmin || isCompany;

    // 부위 · 상장 정보 조회 (헤더 표시용)
    const { data: part, error: partError } = await supabase
      .from('cattle_parts')
      .select(
        `
        id,
        part_no,
        part_name,
        listing_part_no,
        weight,
        min_price,
        cattle_listings (
          id,
          listing_no,
          grade,
          marbling_score,
          company_id
        )
      `,
      )
      .eq('id', partId)
      .single();

    if (partError || !part) {
      return NextResponse.json(
        { error: '부위를 찾을 수 없습니다.' },
        { status: 404 },
      );
    }

    // 입찰 히스토리 조회 (오래된 순 · 시점별 top 계산용)
    const { data: bids, error: bidsError } = await supabase
      .from('bids')
      .select(
        `
        id,
        dealer_id,
        bid_price,
        bid_amount,
        created_at,
        is_top_bid,
        dealers (
          id,
          dealer_no,
          name
        )
      `,
      )
      .eq('part_id', partId)
      .order('created_at', { ascending: true });

    if (bidsError) {
      console.error('입찰내역 조회 오류:', bidsError);
      return NextResponse.json({ error: bidsError.message }, { status: 500 });
    }

    const bidList = bids || [];

    // 딜러별 첫 입찰 시각 매핑 → 익명 라벨 순서
    const firstBidAtByDealer: Record<string, string> = {};
    for (const b of bidList) {
      if (!firstBidAtByDealer[b.dealer_id]) {
        firstBidAtByDealer[b.dealer_id] = b.created_at;
      }
    }
    const uniqueDealerIds = Object.keys(firstBidAtByDealer);
    const otherDealerIds = uniqueDealerIds
      .filter((id) => id !== dealerId)
      .sort((a, b) =>
        firstBidAtByDealer[a].localeCompare(firstBidAtByDealer[b]),
      );
    const anonMap: Record<string, string> = {};
    otherDealerIds.forEach((id, idx) => {
      anonMap[id] = anonymousDealerLabel(idx);
    });

    // 시점별 top bid 계산 · 오래된 순 스캔하며 running max 추적
    let runningMax = 0;
    const historyOldestFirst = bidList.map((b) => {
      const wasTopAtTime = b.bid_price > runningMax;
      if (wasTopAtTime) runningMax = b.bid_price;

      const isMine = !!dealerId && b.dealer_id === dealerId;

      let dealerLabel: string;
      let dealerNo: string | null = null;
      let dealerName: string | null = null;
      const dealerInfo = (b as any).dealers as
        | { dealer_no?: string; name?: string }
        | null
        | undefined;

      if (showRealNames) {
        dealerNo = dealerInfo?.dealer_no || null;
        dealerName = dealerInfo?.name || null;
        dealerLabel = dealerName
          ? `${dealerName}${dealerNo ? ` (${dealerNo})` : ''}`
          : dealerNo || '(알 수 없음)';
      } else if (isMine) {
        dealerLabel = '나';
      } else {
        dealerLabel = anonMap[b.dealer_id] || '딜러';
      }

      return {
        id: b.id as string,
        dealerLabel,
        dealerNo,
        dealerName,
        isMine,
        bidPrice: Number(b.bid_price) || 0,
        bidAmount: Number(b.bid_amount) || 0,
        bidAt: b.created_at as string,
        wasTopAtTime,
        isCurrentTop: !!b.is_top_bid,
      };
    });

    const history = [...historyOldestFirst].reverse();

    const totalBids = bidList.length;
    const totalDealers = uniqueDealerIds.length;
    const topBidUpdates = historyOldestFirst.filter(
      (h) => h.wasTopAtTime,
    ).length;

    const currentTop =
      historyOldestFirst
        .filter((h) => h.isCurrentTop)
        .map((h) => ({
          bidPrice: h.bidPrice,
          bidAt: h.bidAt,
          isMine: h.isMine,
        }))[0] || null;

    const listing = (part as any).cattle_listings as {
      listing_no?: string;
      grade?: string;
      marbling_score?: number | null;
    } | null;

    return NextResponse.json({
      partId,
      partName: (part as any).part_name || '',
      listingNo: listing?.listing_no || '',
      listingPartNo: (part as any).listing_part_no || null,
      grade: listing?.grade || '',
      marblingScore: listing?.marbling_score ?? null,
      weight: (part as any).weight ?? null,
      minPrice: (part as any).min_price ?? null,
      stats: {
        totalBids,
        totalDealers,
        topBidUpdates,
      },
      currentTop,
      history,
    });
  } catch (error) {
    console.error('입찰내역 조회 오류:', error);
    return NextResponse.json(
      { error: '입찰내역 조회 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}

/**
 * 익명 라벨 생성 · 26명 이하는 A~Z, 그 이상은 AA, AB, ... AZ, BA, ... 형식.
 */
function anonymousDealerLabel(index: number): string {
  if (index < 0) return '딜러';
  const A = 'A'.charCodeAt(0);
  if (index < 26) {
    return `딜러 ${String.fromCharCode(A + index)}`;
  }
  const first = Math.floor(index / 26) - 1;
  const second = index % 26;
  return `딜러 ${String.fromCharCode(A + first)}${String.fromCharCode(A + second)}`;
}
