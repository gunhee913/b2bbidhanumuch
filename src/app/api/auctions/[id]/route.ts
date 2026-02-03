import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  UpdateAuctionInput,
  toFrontendAuction,
  toFrontendBid,
  BidRow,
} from '@/features/auctions/types';
import { toFrontendListing, toFrontendPart, CattleListingRow, CattlePartRow } from '@/features/listings/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: 경매 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 경매 정보 조회
    const { data: auction, error } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: '경매를 찾을 수 없습니다.' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 경매에 포함된 상장 목록 조회
    const { data: auctionListings } = await supabase
      .from('auction_listings')
      .select(`
        listing_id,
        display_order,
        cattle_listings:listing_id (
          *,
          companies:company_id (name)
        )
      `)
      .eq('auction_id', id)
      .order('display_order', { ascending: true });

    // 상장 정보 변환
    const listings = (auctionListings || []).map((al: unknown) => {
      const item = al as { listing_id: string; display_order: number; cattle_listings: CattleListingRow & { companies: { name: string } | null } };
      return {
        ...toFrontendListing(item.cattle_listings),
        companyName: item.cattle_listings?.companies?.name || '',
        displayOrder: item.display_order,
      };
    });

    // 각 상장의 부위 정보 조회
    if (listings.length > 0) {
      const listingIds = listings.map((l: { id: string }) => l.id);
      const { data: parts } = await supabase
        .from('cattle_parts')
        .select('*')
        .in('listing_id', listingIds)
        .order('part_no', { ascending: true });

      // 부위를 상장별로 그룹핑
      const partsMap = new Map<string, CattlePartRow[]>();
      parts?.forEach((part: CattlePartRow) => {
        const existing = partsMap.get(part.listing_id) || [];
        partsMap.set(part.listing_id, [...existing, part]);
      });

      listings.forEach((listing: { id: string; parts?: unknown[] }) => {
        listing.parts = (partsMap.get(listing.id) || []).map(toFrontendPart);
      });
    }

    // 입찰 내역 조회
    const { data: bids } = await supabase
      .from('bids')
      .select(`
        *,
        dealers:dealer_id (name, dealer_no),
        cattle_parts:part_id (part_name, listing_part_no)
      `)
      .eq('auction_id', id)
      .order('created_at', { ascending: false });

    const formattedBids = (bids || []).map((bid: unknown) => {
      const item = bid as BidRow & { 
        dealers: { name: string; dealer_no: string } | null;
        cattle_parts: { part_name: string; listing_part_no: string } | null;
      };
      return {
        ...toFrontendBid(item),
        dealerName: item.dealers?.name || '',
        dealerNo: item.dealers?.dealer_no || '',
        partName: item.cattle_parts?.part_name || '',
        listingPartNo: item.cattle_parts?.listing_part_no || '',
      };
    });

    return NextResponse.json({
      ...toFrontendAuction(auction),
      listings,
      bids: formattedBids,
      listingCount: listings.length,
      bidCount: formattedBids.length,
    });
  } catch (error) {
    console.error('경매 조회 오류:', error);
    return NextResponse.json(
      { error: '경매를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// PATCH: 경매 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: UpdateAuctionInput = await request.json();

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.startTime !== undefined) updateData.start_time = body.startTime;
    if (body.endTime !== undefined) updateData.end_time = body.endTime;
    if (body.status !== undefined) updateData.status = body.status;

    const { data, error } = await supabase
      .from('auctions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('경매 수정 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(toFrontendAuction(data));
  } catch (error) {
    console.error('경매 수정 오류:', error);
    return NextResponse.json(
      { error: '경매 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE: 경매 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 경매 상태 확인
    const { data: auction, error: fetchError } = await supabase
      .from('auctions')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: '경매를 찾을 수 없습니다.' }, { status: 404 });
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // 예정 상태인 경우만 삭제 가능
    if (auction.status !== 'scheduled') {
      return NextResponse.json(
        { error: '예정 상태인 경매만 삭제할 수 있습니다.' },
        { status: 400 }
      );
    }

    // 연결된 상장 상태 복원
    const { data: linkedListings } = await supabase
      .from('auction_listings')
      .select('listing_id')
      .eq('auction_id', id);

    if (linkedListings && linkedListings.length > 0) {
      const listingIds = linkedListings.map((l: { listing_id: string }) => l.listing_id);
      await supabase
        .from('cattle_listings')
        .update({ status: 'approved' })
        .in('id', listingIds);
    }

    // 경매 삭제 (CASCADE로 auction_listings, bids도 삭제됨)
    const { error } = await supabase
      .from('auctions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('경매 삭제 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('경매 삭제 오류:', error);
    return NextResponse.json(
      { error: '경매 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
