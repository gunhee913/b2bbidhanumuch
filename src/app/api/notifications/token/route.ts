import { NextRequest, NextResponse } from 'next/server';
import { resolveAuth } from '@/lib/resolve-auth';
import { createPureClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveAuth(request);
    if (!auth?.dealerId) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const { token, platform } = body;

    if (!token || !platform) {
      return NextResponse.json({ error: 'token과 platform은 필수입니다.' }, { status: 400 });
    }

    if (!['android', 'ios'].includes(platform)) {
      return NextResponse.json({ error: 'platform은 android 또는 ios여야 합니다.' }, { status: 400 });
    }

    const supabase = await createPureClient();

    const { error } = await supabase
      .from('device_tokens')
      .upsert(
        {
          dealer_id: auth.dealerId,
          token,
          platform,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'dealer_id,token' }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await resolveAuth(request);
    if (!auth?.dealerId) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'token은 필수입니다.' }, { status: 400 });
    }

    const supabase = await createPureClient();

    const { error } = await supabase
      .from('device_tokens')
      .delete()
      .eq('dealer_id', auth.dealerId)
      .eq('token', token);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
