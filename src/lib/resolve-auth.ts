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

export interface ResolvedConsumer {
  consumerId: string;
  name: string;
  phone: string;
}

/** 공동구매 소비자 세션 · 소비자가 아니면 null */
export async function resolveConsumer(request: NextRequest): Promise<ResolvedConsumer | null> {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token || token.userType !== 'consumer_user') return null;
  const consumerId = (token.consumer as { id?: string } | null)?.id || (token.id as string);
  if (!consumerId) return null;
  return {
    consumerId,
    name: token.name as string,
    phone: token.phone as string,
  };
}

/** 관리자 세션 · 관리자가 아니면 null */
export async function resolveAdmin(request: NextRequest): Promise<{ adminId: string; name: string } | null> {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token || token.userType !== 'admin_user') return null;
  return { adminId: token.id as string, name: (token.name as string) || '관리자' };
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
