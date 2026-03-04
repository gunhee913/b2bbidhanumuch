import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createPureClient } from '@/lib/supabase/server';
import { createNotificationForAll } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.admin?.id) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const body = await request.json();
    const { type, title, message } = body;

    if (!type || !title) {
      return NextResponse.json({ error: 'type과 title은 필수입니다.' }, { status: 400 });
    }

    const count = await createNotificationForAll(
      type,
      title,
      message || '',
      undefined,
      undefined,
      session.admin.id,
      session.admin.name
    );

    return NextResponse.json({ success: true, recipientCount: count });
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
