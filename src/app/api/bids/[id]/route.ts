import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';
import { resolveViewer } from '@/lib/resolve-viewer';

const supabase = getAdminClient();

const ADMIN_BID_PASSWORD = process.env.ADMIN_BID_PASSWORD || '1234';

/**
 * 관리자 수동 입찰 수정/삭제 후 부위 상태를 재계산.
 * - rank / is_winning : 회차 마감(close_round) 이후에만 세팅되므로,
 *   기존에 rank 가 있었던 부위(=이미 마감된 회차)에 한해 재계산.
 *   진행 중 부위는 rank=null 유지 (마감 시 close_round 가 세팅).
 * - is_top_bid : 진행 중이든 마감이든 항상 "현재 최고가 row" 유지 (open 경매 규칙).
 */
async function recalcWinnerForPart(partId: string) {
  const { data: bids } = await supabase
    .from('bids')
    .select('id, bid_price, bid_amount, dealer_id, rank')
    .eq('part_id', partId)
    .order('bid_price', { ascending: false })
    .order('created_at', { ascending: true });

  if (!bids || bids.length === 0) {
    await supabase
      .from('bids')
      .update({ is_winning: false, rank: null, is_top_bid: false })
      .eq('part_id', partId);
    await supabase
      .from('cattle_parts')
      .update({ bid_price: null, bid_amount: null, winning_dealer_id: null })
      .eq('id', partId);
    return;
  }

  const topBid = bids[0];
  const wasSettled = bids.some((b: any) => b.rank != null);

  if (wasSettled) {
    // 이미 마감된 회차 · rank / is_winning 도 재계산
    for (let i = 0; i < bids.length; i++) {
      await supabase
        .from('bids')
        .update({
          rank: i + 1,
          is_winning: i === 0,
          is_top_bid: i === 0,
        })
        .eq('id', bids[i].id);
    }
  } else {
    // 진행 중 회차 · is_top_bid 만 재계산 (rank/is_winning 은 close_round 담당)
    await supabase
      .from('bids')
      .update({ is_top_bid: false })
      .eq('part_id', partId);
    await supabase
      .from('bids')
      .update({ is_top_bid: true })
      .eq('id', topBid.id);
  }

  await supabase
    .from('cattle_parts')
    .update({
      bid_price: topBid.bid_price,
      bid_amount: topBid.bid_amount,
      winning_dealer_id: topBid.dealer_id,
    })
    .eq('id', partId);
}

function verifyAdminPassword(password?: string): string | null {
  if (!password) return '비밀번호를 입력해주세요.';
  if (password !== ADMIN_BID_PASSWORD) return '비밀번호가 일치하지 않습니다.';
  return null;
}

async function checkAuctionOpen(bidId: string): Promise<string | null> {
  const { data: bid } = await supabase
    .from('bids')
    .select('part_id, cattle_parts(listing_id)')
    .eq('id', bidId)
    .single();

  if (!bid) return null;

  const listingId = (bid.cattle_parts as any)?.listing_id;
  if (!listingId) return null;

  const { data: links } = await supabase
    .from('auction_listings')
    .select('auction_id, auctions(status)')
    .eq('listing_id', listingId);

  if (!links || links.length === 0) return null;

  const hasOpen = links.some((l: any) => l.auctions?.status === 'open');
  if (!hasOpen) return '경매가 종료되어 입찰을 변경할 수 없습니다.';

  return null;
}

// GET: 단일 입찰 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: bid, error } = await supabase
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
          min_price
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('입찰 조회 오류:', error);
      return NextResponse.json({ error: '입찰을 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json(bid);
  } catch (error) {
    console.error('입찰 조회 오류:', error);
    return NextResponse.json(
      { error: '입찰 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// PUT: 입찰 수정 (관리자용)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { bidPrice, updatedBy, adminPassword } = body;

    if (!bidPrice || bidPrice <= 0) {
      return NextResponse.json(
        { error: '유효한 입찰가를 입력해주세요.' },
        { status: 400 }
      );
    }

    const isAdmin = !!updatedBy;
    if (isAdmin) {
      const pwError = verifyAdminPassword(adminPassword);
      if (pwError) {
        return NextResponse.json({ error: pwError }, { status: 403 });
      }
    } else {
      const auctionError = await checkAuctionOpen(id);
      if (auctionError) {
        return NextResponse.json({ error: auctionError }, { status: 400 });
      }
    }

    const { data: existingBid, error: fetchError } = await supabase
      .from('bids')
      .select(`
        id,
        auction_id,
        part_id,
        dealer_id,
        bid_price,
        bid_amount,
        cattle_parts (
          id,
          min_price,
          weight
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError || !existingBid) {
      return NextResponse.json(
        { error: '입찰을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const part = existingBid.cattle_parts as any;
    
    if (part?.min_price && bidPrice < part.min_price) {
      return NextResponse.json(
        { error: `최저가(${part.min_price.toLocaleString()}원) 이상으로 입찰해주세요.` },
        { status: 400 }
      );
    }

    const bidAmount = Math.round(bidPrice * (part?.weight || 0));

    const { data: updatedBid, error: updateError } = await supabase
      .from('bids')
      .update({
        bid_price: bidPrice,
        bid_amount: bidAmount,
        updated_at: new Date().toISOString(),
        updated_by: updatedBy || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('입찰 수정 오류:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await supabase.from('bid_audit_logs').insert({
      bid_id: id,
      auction_id: existingBid.auction_id,
      part_id: existingBid.part_id,
      dealer_id: existingBid.dealer_id,
      action_type: 'update',
      old_bid_price: existingBid.bid_price,
      new_bid_price: bidPrice,
      old_bid_amount: existingBid.bid_amount,
      new_bid_amount: bidAmount,
      performed_by: updatedBy || null,
    });

    await recalcWinnerForPart(existingBid.part_id);

    return NextResponse.json({
      ...updatedBid,
      message: '입찰가가 수정되었습니다.',
    });
  } catch (error) {
    console.error('입찰 수정 오류:', error);
    return NextResponse.json(
      { error: '입찰 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

const CANCEL_ERRORS: Record<string, { error: string; status: number }> = {
  NOT_FOUND: { error: '입찰을 찾을 수 없습니다.', status: 404 },
  FORBIDDEN: { error: '본인 입찰만 취소할 수 있습니다.', status: 403 },
  SETTLED: { error: '이미 낙찰이 확정된 부위입니다.', status: 409 },
  NOT_OPEN: { error: '회차 진행 중에만 입찰을 취소할 수 있습니다.', status: 400 },
};

/**
 * 매참인 본인 입찰 취소 · cancel_bid RPC.
 * 소유권·회차 진행 중·미마감 검증과 삭제·감사 로그·is_top_bid 재계산을 부위 row lock 안에서 처리한다.
 */
async function cancelOwnBid(request: NextRequest, bidId: string) {
  const viewer = await resolveViewer(request);
  if (!viewer.dealerId) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { data, error } = await supabase.rpc('cancel_bid', {
    p_bid_id: bidId,
    p_dealer_id: viewer.dealerId,
    p_performed_by: viewer.dealerId,
  });

  if (error) {
    console.error('입찰 취소 RPC 오류:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = data as {
    ok: boolean;
    code?: string;
    bidId?: string;
    partId?: string;
    bidPrice?: number;
    bidAmount?: number;
  };

  if (!result?.ok) {
    const mapped = CANCEL_ERRORS[result?.code ?? ''] ?? {
      error: '입찰 취소 중 오류가 발생했습니다.',
      status: 400,
    };
    return NextResponse.json({ error: mapped.error, code: result?.code }, { status: mapped.status });
  }

  return NextResponse.json({
    message: '입찰이 취소되었습니다.',
    deletedId: result.bidId,
    partId: result.partId,
    bidPrice: result.bidPrice,
    bidAmount: result.bidAmount,
  });
}

// DELETE: 관리자 삭제(isAdmin + 비밀번호) 또는 매참인 본인 취소
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let isAdmin = false;
    let adminPassword: string | undefined;
    let performedBy: string | null = null;
    try {
      const body = await request.json();
      isAdmin = !!body?.isAdmin;
      adminPassword = body?.adminPassword;
      performedBy = body?.performedBy || null;
    } catch {}

    if (!isAdmin) {
      return cancelOwnBid(request, id);
    }

    const pwError = verifyAdminPassword(adminPassword);
    if (pwError) {
      return NextResponse.json({ error: pwError }, { status: 403 });
    }

    const { data: existingBid, error: fetchError } = await supabase
      .from('bids')
      .select('id, auction_id, part_id, dealer_id, bid_price, bid_amount, rank, is_winning')
      .eq('id', id)
      .single();

    if (fetchError || !existingBid) {
      return NextResponse.json(
        { error: '입찰을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabase
      .from('bids')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('입찰 삭제 오류:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    await supabase.from('bid_audit_logs').insert({
      bid_id: id,
      auction_id: existingBid.auction_id,
      part_id: existingBid.part_id,
      dealer_id: existingBid.dealer_id,
      action_type: 'delete',
      old_bid_price: existingBid.bid_price,
      new_bid_price: null,
      old_bid_amount: existingBid.bid_amount,
      new_bid_amount: null,
      performed_by: performedBy,
    });

    await recalcWinnerForPart(existingBid.part_id);

    return NextResponse.json({
      message: '입찰이 삭제되었습니다.',
      deletedId: id,
      wasWinning: existingBid.is_winning,
    });
  } catch (error) {
    console.error('입찰 삭제 오류:', error);
    return NextResponse.json(
      { error: '입찰 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
