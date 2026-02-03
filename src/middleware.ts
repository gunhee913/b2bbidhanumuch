import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// 중도매인 로그인이 필요한 경로
const dealerProtectedPaths = [
  '/profile',
  '/bids',
  '/trade',
  '/auction',
  '/notifications',
];

// 관리자 로그인이 필요한 경로 (admin/login 제외)
const adminProtectedPaths = ['/admin'];

// 상장업체 로그인이 필요한 경로 (company/login 제외)
const companyProtectedPaths = ['/company'];

// 로그인 상태에서 접근하면 리다이렉트할 경로
const dealerAuthPaths = ['/login'];
const adminAuthPaths = ['/admin/login'];
const companyAuthPaths = ['/company/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // NextAuth 토큰 확인
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAuthenticated = !!token;
  const userType = token?.userType as string | undefined;

  // 경로 체크
  const isAdminPath = pathname.startsWith('/admin') && pathname !== '/admin/login';
  const isAdminLoginPath = pathname === '/admin/login';
  const isCompanyPath = pathname.startsWith('/company') && pathname !== '/company/login';
  const isCompanyLoginPath = pathname === '/company/login';

  const isDealerProtectedPath = dealerProtectedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  const isDealerAuthPath = dealerAuthPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  // === 관리자 경로 처리 ===
  
  // 관리자 페이지에 비로그인 또는 비관리자로 접근
  if (isAdminPath) {
    if (!isAuthenticated || userType !== 'admin_user') {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 이미 관리자로 로그인한 상태에서 관리자 로그인 페이지 접근
  if (isAdminLoginPath && isAuthenticated && userType === 'admin_user') {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // === 상장업체 경로 처리 ===
  
  // 상장업체 페이지에 비로그인 또는 비상장업체로 접근
  if (isCompanyPath) {
    if (!isAuthenticated || userType !== 'company_user') {
      const loginUrl = new URL('/company/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 이미 상장업체로 로그인한 상태에서 상장업체 로그인 페이지 접근
  if (isCompanyLoginPath && isAuthenticated && userType === 'company_user') {
    return NextResponse.redirect(new URL('/company', request.url));
  }

  // === 중도매인 경로 처리 ===
  
  // 중도매인 페이지에 비로그인 상태로 접근
  if (isDealerProtectedPath && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 중도매인 페이지에 관리자/상장업체로 접근 (허용하지 않음)
  if (isDealerProtectedPath && isAuthenticated && (userType === 'admin_user' || userType === 'company_user')) {
    if (userType === 'admin_user') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    if (userType === 'company_user') {
      return NextResponse.redirect(new URL('/company', request.url));
    }
  }

  // 이미 중도매인으로 로그인한 상태에서 중도매인 로그인 페이지 접근
  if (isDealerAuthPath && isAuthenticated && userType === 'dealer_user') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
