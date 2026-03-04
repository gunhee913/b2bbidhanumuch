import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createPureClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.dealer?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const supabase = await createPureClient();

    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('dealer_id', session.dealer.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const settings = data ? {
      listingUpload: data.listing_upload,
      auctionStart: data.auction_start,
      auctionResult: data.auction_result,
      balance: data.balance,
    } : {
      listingUpload: true,
      auctionStart: true,
      auctionResult: true,
      balance: true,
    };

    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.dealer?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const supabase = await createPureClient();

    const updateData: Record<string, any> = {
      dealer_id: session.dealer.id,
      updated_at: new Date().toISOString(),
    };
    if (body.listingUpload !== undefined) updateData.listing_upload = body.listingUpload;
    if (body.auctionStart !== undefined) updateData.auction_start = body.auctionStart;
    if (body.auctionResult !== undefined) updateData.auction_result = body.auctionResult;
    if (body.balance !== undefined) updateData.balance = body.balance;

    const { data, error } = await supabase
      .from('notification_settings')
      .upsert(updateData, { onConflict: 'dealer_id' })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      listingUpload: data.listing_upload,
      auctionStart: data.auction_start,
      auctionResult: data.auction_result,
      balance: data.balance,
    });
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
