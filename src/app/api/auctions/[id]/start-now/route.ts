import { getAdminClient } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const supabase = getAdminClient();

// POST: 재경매 즉시 시작 (started_at을 현재 시각으로 변경)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getToken({ req: request });
    if (!token || token.userType !== 'admin_user') {
      return NextResponse.json({ error: '관리자만 접근 가능합니다.' }, { status: 403 });
    }

    const { id } = await params;

    const { data: auction, error: fetchError } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !auction) {
      return NextResponse.json({ error: '경매를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (auction.status !== 'open') {
      return NextResponse.json({ error: 'open 상태의 경매만 즉시 시작할 수 있습니다.' }, { status: 400 });
    }

    const { data: updated, error: updateError } = await supabase
      .from('auctions')
      .update({ started_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      auction: updated,
      message: '재경매가 즉시 시작되었습니다.',
    });
  } catch (error) {
    console.error('즉시 시작 오류:', error);
    return NextResponse.json({ error: '즉시 시작 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
