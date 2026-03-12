import 'server-only';
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { verifyMobileToken, extractBearerToken } from '@/lib/mobile-jwt';

export interface ResolvedAuth {
  userId: string;
  dealerId: string;
  userType: 'dealer_user' | 'admin_user' | 'company_user';
  role: string;
  name: string;
  phone: string;
}

export async function resolveAuth(request: NextRequest): Promise<ResolvedAuth | null> {
  const bearerToken = extractBearerToken(request.headers.get('authorization'));
  if (bearerToken) {
    const payload = await verifyMobileToken(bearerToken);
    if (payload && payload.type === 'access' && payload.dealerId) {
      return {
        userId: payload.sub,
        dealerId: payload.dealerId,
        userType: payload.userType,
        role: payload.role,
        name: payload.name,
        phone: payload.phone,
      };
    }
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (token) {
    const dealerId =
      (token.employee as any)?.dealerId || (token.dealer as any)?.id || null;
    if (dealerId) {
      return {
        userId: token.id as string,
        dealerId,
        userType: token.userType as 'dealer_user',
        role: token.role as string,
        name: token.name as string,
        phone: token.phone as string,
      };
    }
  }

  return null;
}
