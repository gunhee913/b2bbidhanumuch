import { getAdminClient } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { resolveViewer } from '@/lib/resolve-viewer';

const supabase = getAdminClient();

/**
 * GET /api/bids/highest?partIds=uuid1,uuid2,...
 *
 * 여러 부위의 현재 최고가 조회 · **관리자/출품업체 전용**.
 *
 * 비공개 입찰 정책상 진행 중 회차의 최고가는 매참인·비로그인에게 노출하지 않는다.
 * 권한이 없으면 403 을 반환한다.
 *
 * 응답: `{ [partId]: number }` (해당 부위에 아직 입찰이 없으면 키 자체가 빠짐)
 */
export async function GET(request: NextRequest) {
  try {
    const viewer = await resolveViewer(request);
    if (!viewer.canViewAllBids) {
      return NextResponse.json(
        { error: '진행 중 회차의 최고가는 공개되지 않습니다.' },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const partIdsParam = searchParams.get('partIds');

    if (!partIdsParam) {
      return NextResponse.json({});
    }

    const partIds = partIdsParam.split(',').filter(Boolean);

    if (partIds.length === 0) {
      return NextResponse.json({});
    }

    const { data: bids, error } = await supabase
      .from('bids')
      .select('part_id, bid_price')
      .in('part_id', partIds)
      .order('bid_price', { ascending: false });

    if (error) {
      console.error('최고 입찰가 조회 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // bid_price DESC 정렬이므로 부위별 첫 등장 row 가 최고가
    const highestBids: Record<string, number> = {};
    (bids || []).forEach((bid: any) => {
      if (highestBids[bid.part_id] === undefined) {
        highestBids[bid.part_id] = bid.bid_price;
      }
    });

    return NextResponse.json(highestBids);
  } catch (error) {
    console.error('최고 입찰가 조회 오류:', error);
    return NextResponse.json(
      { error: '최고 입찰가 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
