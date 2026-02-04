import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    const { bidPrice, updatedBy } = body;

    if (!bidPrice || bidPrice <= 0) {
      return NextResponse.json(
        { error: '유효한 입찰가를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 기존 입찰 조회
    const { data: existingBid, error: fetchError } = await supabase
      .from('bids')
      .select(`
        id,
        part_id,
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
    
    // 최저가 확인
    if (part?.min_price && bidPrice < part.min_price) {
      return NextResponse.json(
        { error: `최저가(${part.min_price.toLocaleString()}원) 이상으로 입찰해주세요.` },
        { status: 400 }
      );
    }

    // 입찰금액 재계산
    const bidAmount = Math.round(bidPrice * (part?.weight || 0));

    // 입찰 수정
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

    // 기존 입찰 확인
    const { data: existingBid, error: fetchError } = await supabase
      .from('bids')
      .select('id, rank, is_winning')
      .eq('id', id)
      .single();

    if (fetchError || !existingBid) {
      return NextResponse.json(
        { error: '입찰을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 입찰 삭제
    const { error: deleteError } = await supabase
      .from('bids')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('입찰 삭제 오류:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

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
