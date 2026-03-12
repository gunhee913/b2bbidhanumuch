import { NextRequest, NextResponse } from 'next/server';
import {
  verifyMobileToken,
  signAccessToken,
  signRefreshToken,
} from '@/lib/mobile-jwt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { error: '리프레시 토큰이 필요합니다.' },
        { status: 400 }
      );
    }

    const payload = await verifyMobileToken(refreshToken);

    if (!payload || payload.type !== 'refresh') {
      return NextResponse.json(
        { error: '유효하지 않은 리프레시 토큰입니다.' },
        { status: 401 }
      );
    }

    const tokenPayload = {
      sub: payload.sub,
      name: payload.name,
      phone: payload.phone,
      userType: payload.userType,
      role: payload.role,
      dealerId: payload.dealerId,
      employeeId: payload.employeeId,
    };

    const [newAccessToken, newRefreshToken] = await Promise.all([
      signAccessToken(tokenPayload),
      signRefreshToken(tokenPayload),
    ]);

    return NextResponse.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error('토큰 갱신 오류:', error);
    return NextResponse.json(
      { error: '토큰 갱신 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
