import 'server-only';
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { resolveAuth } from '@/lib/resolve-auth';

export type ViewerType =
  | 'dealer_user'
  | 'admin_user'
  | 'company_user'
  | 'anonymous';

export interface Viewer {
  userType: ViewerType;
  /** 매참인(또는 소속 직원)인 경우 소속 dealer id. 그 외 null. */
  dealerId: string | null;
  /**
   * 진행 중 회차의 타 매참인 입찰 정보를 열람할 수 있는가.
   * 비공개 입찰 정책상 관리자·출품업체만 true. 매참인·비로그인은 false.
   */
  canViewAllBids: boolean;
}

const STAFF_TYPES: ViewerType[] = ['admin_user', 'company_user'];

/**
 * 요청자의 열람 권한을 판정한다.
 *
 * `resolveAuth` 는 dealerId 가 있는 매참인 세션만 반환하므로, 관리자·출품업체
 * 웹 세션은 next-auth JWT 의 `userType` 을 직접 읽어 보완한다.
 * (모바일 Bearer 토큰은 resolveAuth 가 userType 까지 채워 준다.)
 */
export async function resolveViewer(request: NextRequest): Promise<Viewer> {
  const auth = await resolveAuth(request);
  if (auth) {
    return {
      userType: auth.userType,
      dealerId: auth.dealerId ?? null,
      canViewAllBids: STAFF_TYPES.includes(auth.userType),
    };
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const userType = (token?.userType as ViewerType | undefined) ?? 'anonymous';

  return {
    userType,
    dealerId: null,
    canViewAllBids: STAFF_TYPES.includes(userType),
  };
}
