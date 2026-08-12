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
 *   - admin_user / company_user → 실명 + 딜러번호 노출
 *   - dealer_user               → 본인은 "나", 그 외 참여자는 dealer_no 중간 마스킹
 *                                 (예: 7000002 → "70***02")
 *   - anonymous                 → 모든 참여자 "****" 로 마스킹 (신원 완전 은닉)
 *
 * 중간 마스킹 방식:
 *   - 앞/뒤 각 2자리는 유지 → 사용자가 "같은 입찰자" 를 시각적으로 재인지 가능
 *   - 중간 자릿수는 * 로 대체 → 신원 특정 방지
 *   - dealer_no 부재 시 "****" 로 완전 마스킹
 *
 * 용어 정책: 도메인에서 "딜러" 대신 "입찰자" 를 사용.
 * (내부 컬럼명 dealer_id / DB 스키마 dealer 는 legacy 유지)
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

    // 총 입찰자 수 계산용 · unique dealer id 집합
    const uniqueDealerIds = Array.from(
      new Set(bidList.map((b) => b.dealer_id as string)),
    );

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
        dealerLabel = maskDealerNo(dealerInfo?.dealer_no);
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
 * dealer_no 중간 마스킹.
 *
 * 규칙:
 * - null/empty            → "****"
 * - 1~2자                 → 전체 * (예: "12" → "**")
 * - 3~4자                 → 앞1 + 중간* + 뒤1 (예: "1234" → "1**4")
 * - 5자 이상 (일반)       → 앞2 + 중간* + 뒤2 (예: "7000002" → "70***02")
 *
 * 목적:
 * - 앞/뒤 자릿수 유지 → 사용자가 "같은 사람" 을 시각적으로 재인지 가능
 * - 중간 마스킹 → 신원 특정 방지 (완전 은닉과 완전 노출 사이 균형)
 */
function maskDealerNo(no: string | null | undefined): string {
  if (!no) return '****';
  const s = String(no).trim();
  if (!s) return '****';
  const len = s.length;
  if (len <= 2) return '*'.repeat(len);
  if (len <= 4) return `${s.slice(0, 1)}${'*'.repeat(len - 2)}${s.slice(-1)}`;
  return `${s.slice(0, 2)}${'*'.repeat(len - 4)}${s.slice(-2)}`;
}
