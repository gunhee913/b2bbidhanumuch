import { NextRequest, NextResponse } from 'next/server';
import { resolveAuth } from '@/lib/resolve-auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveAuth(request);
    if (!auth?.dealerId) {
      return NextResponse.json({ error: '로그인 필요' }, { status: 401 });
    }

    const envKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!envKey) {
      return NextResponse.json({ 
        error: 'FIREBASE_SERVICE_ACCOUNT_KEY 미설정',
        envExists: false,
      }, { status: 500 });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(envKey);
    } catch (e: any) {
      return NextResponse.json({
        error: 'JSON 파싱 실패',
        envLength: envKey.length,
        envFirst100: envKey.substring(0, 100),
        envLast50: envKey.substring(envKey.length - 50),
        parseError: e.message,
      }, { status: 500 });
    }

    const { sendPushToTokens } = await import('@/lib/fcm');
    const { createPureClient } = await import('@/lib/supabase/server');
    const supabase = await createPureClient();

    const { data: tokenRows, error: dbError } = await supabase
      .from('device_tokens')
      .select('token')
      .eq('dealer_id', auth.dealerId);

    if (dbError) {
      return NextResponse.json({ error: 'DB 조회 실패', detail: dbError.message }, { status: 500 });
    }

    if (!tokenRows || tokenRows.length === 0) {
      return NextResponse.json({ error: '등록된 토큰 없음', dealerId: auth.dealerId }, { status: 404 });
    }

    const tokens = tokenRows.map((r: any) => r.token).filter((t: string) => !t.startsWith('test_'));
    
    const result = await sendPushToTokens(
      tokens,
      '진단 테스트',
      'Vercel에서 FCM 발송 테스트',
      { type: 'auction_start', link: '/' }
    );

    return NextResponse.json({
      success: true,
      tokenCount: tokens.length,
      ...result,
      projectId: parsed.project_id,
    });
  } catch (e: any) {
    return NextResponse.json({
      error: e.message,
      stack: e.stack?.split('\n').slice(0, 5),
    }, { status: 500 });
  }
}
