import { NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    // 환경변수 확인 (일부만 노출)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const hasNextAuthSecret = !!process.env.NEXTAUTH_SECRET;
    
    // Supabase 연결 테스트
    const supabase = await createPureClient();
    const { data, error } = await supabase
      .from('admins')
      .select('id, phone, name, status')
      .limit(5);

    return NextResponse.json({
      env: {
        supabaseUrl: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'NOT SET',
        hasServiceKey,
        hasNextAuthSecret,
      },
      supabase: {
        connected: !error,
        error: error?.message || null,
        adminCount: data?.length || 0,
        admins: data?.map(a => ({ phone: a.phone, name: a.name, status: a.status })) || [],
      },
    });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 });
  }
}
