import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_BID_PASSWORD = process.env.ADMIN_BID_PASSWORD || '1234';

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

// DELETE: 입찰 삭제 (관리자용)
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
      action_type: isAdmin ? 'delete' : 'dealer_cancel',
      old_bid_price: existingBid.bid_price,
      new_bid_price: null,
      old_bid_amount: existingBid.bid_amount,
      new_bid_amount: null,
      performed_by: performedBy,
    });

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
