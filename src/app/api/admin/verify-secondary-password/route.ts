import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { timingSafeEqual } from 'crypto';
import { authOptions } from '@/lib/auth';

/**
 * 관리자 2차 비밀번호 확인 · 상장 수정처럼 되돌리기 어려운 작업 앞에서 한 번 더 묻는다.
 * 값은 `ADMIN_SECONDARY_PASSWORD` 환경변수에서 읽는다. 설정이 없으면 개발용 기본값을 쓴다.
 */
const DEV_FALLBACK_PASSWORD = '1234';

const safeEquals = (a: string, b: string) => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
};

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.admin?.id) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!password) {
    return NextResponse.json({ error: '비밀번호를 입력해 주세요.' }, { status: 400 });
  }

  const expected = process.env.ADMIN_SECONDARY_PASSWORD || DEV_FALLBACK_PASSWORD;
  if (!safeEquals(password, expected)) {
    return NextResponse.json({ error: '2차 비밀번호가 올바르지 않습니다.' }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
