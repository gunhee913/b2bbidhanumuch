import { NextRequest, NextResponse } from 'next/server';
import { verifyLoginCredentials } from '@/features/dealers/auth';
import { signAccessToken, signRefreshToken } from '@/lib/mobile-jwt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, password } = body;

    if (!phone || !password) {
      return NextResponse.json(
        { error: '전화번호와 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    const result = await verifyLoginCredentials(phone, password);

    if (!result) {
      return NextResponse.json(
        { error: '전화번호 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    const tokenPayload = {
      sub: result.type === 'dealer' ? result.dealer.id : result.employee!.id,
      name: result.type === 'dealer' ? result.dealer.name : result.employee!.name,
      phone: result.type === 'dealer' ? result.dealer.phone : result.employee!.phone,
      userType: 'dealer_user' as const,
      role: result.type,
      dealerId: result.dealer.id,
      employeeId: result.employee?.id || null,
    };

    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken(tokenPayload),
      signRefreshToken(tokenPayload),
    ]);

    return NextResponse.json({
      accessToken,
      refreshToken,
      user: {
        id: tokenPayload.sub,
        name: tokenPayload.name,
        phone: tokenPayload.phone,
        userType: tokenPayload.userType,
        role: tokenPayload.role,
      },
      dealer: result.dealer,
      employee: result.employee || null,
    });
  } catch (error) {
    console.error('모바일 로그인 오류:', error);
    return NextResponse.json(
      { error: '로그인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
