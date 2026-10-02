import { getAdminClient } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { resolveAuth } from '@/lib/resolve-auth';
import { resolveViewer } from '@/lib/resolve-viewer';

const supabase = getAdminClient();

// GET: 입찰 목록 조회
// 비공개 입찰 정책 · 관리자/출품업체는 전체 조회, 매참인은 본인 입찰(dealerId=본인)만 조회 가능.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const auctionId = searchParams.get('auctionId');
    const partId = searchParams.get('partId');
    const dealerId = searchParams.get('dealerId');
    const isWinning = searchParams.get('isWinning');
    const listingId = searchParams.get('listingId');

    const viewer = await resolveViewer(request);
    if (!viewer.canViewAllBids) {
      if (!viewer.dealerId) {
        return NextResponse.json(
          { error: '로그인이 필요합니다.' },
          { status: 401 }
        );
      }
      if (dealerId !== viewer.dealerId) {
        return NextResponse.json(
          { error: '본인 입찰만 조회할 수 있습니다.' },
          { status: 403 }
        );
      }
    }

    let query = supabase
      .from('bids')
      .select(`
        id,
        auction_id,
        part_id,
        dealer_id,
        bid_price,
        bid_amount,
        rank,
        is_winning,
        created_at,
        auctions:auction_id (
          round_no
        ),
        dealers (
          id,
          name
        ),
        cattle_parts (
          id,
          part_no,
          part_name,
          listing_id,
          weight,
          min_price,
          bid_price,
          winning_dealer_id,
          listing_part_no,
          cattle_listings (
            id,
            listing_no,
            listing_date,
            grade,
            gender,
            status,
            closed_at,
            marbling_score,
            slaughter_house,
            company_id,
            companies:company_id ( name )
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (auctionId) {
      query = query.eq('auction_id', auctionId);
    }

    if (partId) {
      query = query.eq('part_id', partId);
    }

    if (dealerId) {
      query = query.eq('dealer_id', dealerId);
    }

    if (isWinning !== null) {
      query = query.eq('is_winning', isWinning === 'true');
    }

    const { data: bids, error } = await query;

    if (error) {
      console.error('입찰 목록 조회 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // listingId로 필터링 (cattle_parts를 통해)
    let filteredBids = bids || [];
    if (listingId) {
      filteredBids = filteredBids.filter(
        (bid: any) => bid.cattle_parts?.listing_id === listingId
      );
    }

    return NextResponse.json(filteredBids);
  } catch (error) {
    console.error('입찰 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '입찰 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 입찰 등록
// auctionId는 이제 optional - 상장이 approved 상태면 바로 입찰 가능
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { auctionId, partId, bidPrice } = body;
    const clientDealerId = body.dealerId;

    // 필수 값 검증 (auctionId는 이제 optional)
    if (!partId || !clientDealerId || !bidPrice) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 서버 세션에서 dealerId를 결정 (클라이언트 값보다 신뢰도 높음)
    const auth = await resolveAuth(request);
    const resolvedDealerId = auth?.dealerId || null;

    if (!resolvedDealerId) {
      // 세션에서 못 찾으면 클라이언트 값으로 fallback + DB 검증
      const { data: dealerCheck } = await supabase
        .from('dealers')
        .select('id')
        .eq('id', clientDealerId)
        .single();

      if (dealerCheck) {
        // 클라이언트 dealerId가 유효
      } else {
        const { data: empCheck } = await supabase
          .from('dealer_employees')
          .select('id, dealer_id')
          .eq('id', clientDealerId)
          .single();

        if (empCheck) {
          body.dealerId = empCheck.dealer_id;
        } else {
          return NextResponse.json(
            { error: '중도매인 정보를 찾을 수 없습니다.' },
            { status: 400 }
          );
        }
      }
    }

    const finalDealerId = resolvedDealerId || body.dealerId || clientDealerId;

    console.log('[Bids API] partId from client:', partId, '| finalDealerId:', finalDealerId);

    // 부위 정보 조회 (최저가, 중량, 상장 정보 포함)
    const { data: part, error: partError } = await supabase
      .from('cattle_parts')
      .select(`
        id,
        min_price, 
        weight, 
        is_included,
        listing_id,
        cattle_listings (
          id,
          status,
          slaughter_house
        )
      `)
      .eq('id', partId)
      .single();

    if (partError || !part) {
      return NextResponse.json(
        { error: '부위 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (!part.is_included) {
      return NextResponse.json(
        { error: '상장에 포함되지 않은 부위입니다.' },
        { status: 400 }
      );
    }

    // 상장 상태 확인 (approved 또는 auction 상태만 입찰 가능)
    const listingStatus = (part.cattle_listings as any)?.status;
    if (!['approved', 'auction'].includes(listingStatus)) {
      return NextResponse.json(
        { error: '입찰 가능한 상태가 아닙니다. 승인된 상장에만 입찰할 수 있습니다.' },
        { status: 400 }
      );
    }

    // 소속 공판장 검사 · 중도매인에 공판장이 지정돼 있으면 그 공판장 상장만 입찰 가능 (RPC 에서도 재검사)
    const { data: dealerRow } = await supabase
      .from('dealers')
      .select('slaughter_house')
      .eq('id', finalDealerId)
      .maybeSingle();
    const dealerHouse = dealerRow?.slaughter_house ?? null;
    const listingHouse = (part.cattle_listings as any)?.slaughter_house ?? null;
    if (dealerHouse && listingHouse !== dealerHouse) {
      return NextResponse.json(
        { error: `소속 공판장(${dealerHouse}) 상장만 입찰할 수 있습니다.`, code: 'HOUSE_MISMATCH' },
        { status: 403 }
      );
    }

    // 회차별 경매 검증: 해당 상장이 배정된 open 상태 회차가 있는지 확인
    const { data: auctionLinks } = await supabase
      .from('auction_listings')
      .select('auction_id, auctions(id, status, round_no, started_at, round_duration_min)')
      .eq('listing_id', part.listing_id);

    if (!auctionLinks || auctionLinks.length === 0) {
      return NextResponse.json(
        { error: '아직 경매가 시작되지 않았습니다.' },
        { status: 400 }
      );
    }

    const openLink = auctionLinks.find((al: any) => al.auctions?.status === 'open');
    if (!openLink) {
      return NextResponse.json(
        { error: '현재 진행 중인 회차가 아닙니다. 해당 회차가 시작될 때까지 기다려주세요.' },
        { status: 400 }
      );
    }

    const linkedAuction = (openLink as any).auctions;
    const resolvedAuctionId = auctionId || openLink.auction_id || null;
    if (linkedAuction?.started_at && linkedAuction?.round_duration_min) {
      const startedAt = new Date(linkedAuction.started_at).getTime();
      const durationMs = linkedAuction.round_duration_min * 60 * 1000;
      if (Date.now() > startedAt + durationMs) {
        return NextResponse.json(
          { error: '해당 회차의 경매 시간이 종료되었습니다.' },
          { status: 400 }
        );
      }
    }

    // auctionId가 있으면 경매 상태도 확인
    if (auctionId) {
      const { data: auction, error: auctionError } = await supabase
        .from('auctions')
        .select('status')
        .eq('id', auctionId)
        .single();

      if (auctionError || !auction) {
        console.log('경매를 찾을 수 없지만 상장이 approved 상태이므로 입찰 진행');
      } else if (auction.status !== 'open') {
        return NextResponse.json(
          { error: '진행 중인 경매에만 입찰할 수 있습니다.' },
          { status: 400 }
        );
      }
    }

    // 기존 입찰가 조회 (audit log 원본값 확보용)
    const { data: existingBid } = await supabase
      .from('bids')
      .select('id, bid_price, bid_amount, auction_id')
      .eq('part_id', partId)
      .eq('dealer_id', finalDealerId)
      .maybeSingle();

    // 비공개 입찰 · place_bid RPC 로 원자적 처리 (부위 row lock + min_price 검증 + upsert)
    const { data: rpcData, error: rpcError } = await supabase.rpc('place_bid', {
      p_part_id: partId,
      p_dealer_id: finalDealerId,
      p_bid_price: bidPrice,
      p_auction_id: resolvedAuctionId,
    });

    if (rpcError) {
      console.error('입찰 RPC 오류:', rpcError);
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    const result = rpcData as {
      ok: boolean;
      code?: string;
      minPrice?: number;
      bidId?: string;
      bidAmount?: number;
      isUpdate?: boolean;
    };

    if (!result?.ok) {
      switch (result?.code) {
        case 'PART_NOT_FOUND':
          return NextResponse.json({ error: '부위 정보를 찾을 수 없습니다.', code: result.code }, { status: 404 });
        case 'NOT_INCLUDED':
          return NextResponse.json({ error: '상장에 포함되지 않은 부위입니다.', code: result.code }, { status: 400 });
        case 'BELOW_MIN':
          return NextResponse.json({
            error: `최저가(${result.minPrice?.toLocaleString()}원) 이상으로 입찰해주세요.`,
            code: result.code,
            minPrice: result.minPrice,
          }, { status: 400 });
        case 'SETTLED':
          return NextResponse.json({ error: '이미 낙찰이 확정된 부위입니다.', code: result.code }, { status: 409 });
        case 'HOUSE_MISMATCH':
          return NextResponse.json({ error: '소속 공판장 상장만 입찰할 수 있습니다.', code: result.code }, { status: 403 });
        default:
          return NextResponse.json({ error: '입찰 처리 중 오류가 발생했습니다.', code: result?.code }, { status: 400 });
      }
    }

    /*
     * audit log 기록 · 고친 것뿐 아니라 처음 넣은 것도 남긴다.
     *
     * 처음 넣은 것은 bids 행 자체가 기록이라 따로 남길 까닭이 없어 보이지만,
     * 그 전제는 취소에서 깨진다 — cancel_bid 가 bids 행을 지우고 나면 그 입찰이
     * 언제 들어왔는지를 아는 데가 한 곳도 안 남는다. 중도매인 입찰내역에는
     * 「10:27 에 넣었다가 10:31 에 뺐다」 가 떠야 한다.
     */
    await supabase.from('bid_audit_logs').insert(
      existingBid
        ? {
            bid_id: existingBid.id,
            auction_id: resolvedAuctionId || existingBid.auction_id || null,
            part_id: partId,
            dealer_id: finalDealerId,
            action_type: 'dealer_update',
            old_bid_price: existingBid.bid_price,
            new_bid_price: bidPrice,
            old_bid_amount: existingBid.bid_amount,
            new_bid_amount: result.bidAmount ?? null,
            performed_by: null,
          }
        : {
            bid_id: result.bidId ?? null,
            auction_id: resolvedAuctionId,
            part_id: partId,
            dealer_id: finalDealerId,
            action_type: 'dealer_create',
            old_bid_price: null,
            new_bid_price: bidPrice,
            old_bid_amount: null,
            new_bid_amount: result.bidAmount ?? null,
            performed_by: null,
          }
    );

    return NextResponse.json({
      id: result.bidId,
      auction_id: resolvedAuctionId,
      part_id: partId,
      dealer_id: finalDealerId,
      bid_price: bidPrice,
      bid_amount: result.bidAmount ?? 0,
      isUpdate: !!result.isUpdate,
      message: result.isUpdate ? '입찰가가 수정되었습니다.' : '입찰이 등록되었습니다.',
    }, { status: result.isUpdate ? 200 : 201 });
  } catch (error) {
    console.error('입찰 등록 오류:', error);
    return NextResponse.json(
      { error: '입찰 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
