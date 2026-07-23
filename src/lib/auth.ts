import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { verifyLoginCredentials } from "@/features/dealers/auth";
import { verifyAdminCredentials, getAdminById } from "@/features/admins/auth";
import { verifyCompanyCredentials } from "@/features/companies/auth";
import { Dealer, DealerEmployee } from "@/features/dealers/types";
import { Admin } from "@/features/admins/types";
import { Company, CompanyEmployee } from "@/features/companies/types";

export const authOptions: NextAuthOptions = {
  providers: [
    // 중도매인/직원 로그인
    CredentialsProvider({
      id: "dealer-login",
      name: "중도매인 로그인",
      credentials: {
        phone: { label: "전화번호", type: "text", placeholder: "010-0000-0000" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.password) {
          throw new Error("전화번호와 비밀번호를 입력해주세요.");
        }

        const result = await verifyLoginCredentials(
          credentials.phone,
          credentials.password
        );

        if (!result) {
          throw new Error("전화번호 또는 비밀번호가 올바르지 않습니다.");
        }

        // NextAuth User 객체 반환
        return {
          id: result.type === "dealer" ? result.dealer.id : result.employee!.id,
          name: result.type === "dealer" ? result.dealer.name : result.employee!.name,
          phone: result.type === "dealer" ? result.dealer.phone : result.employee!.phone,
          userType: "dealer_user" as const,
          role: result.type,
          dealer: result.dealer,
          employee: result.employee || null,
          admin: null,
          company: null,
          companyEmployee: null,
        };
      },
    }),
    // 관리자 로그인
    CredentialsProvider({
      id: "admin-login",
      name: "관리자 로그인",
      credentials: {
        phone: { label: "전화번호", type: "text", placeholder: "010-0000-0000" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.phone || !credentials?.password) {
          throw new Error("전화번호와 비밀번호를 입력해주세요.");
        }

        const forwarded = req?.headers?.['x-forwarded-for'];
        const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : undefined;

        const result = await verifyAdminCredentials(
          credentials.phone,
          credentials.password,
          ip
        );

        if (!result) {
          throw new Error("전화번호 또는 비밀번호가 올바르지 않습니다.");
        }

        // NextAuth User 객체 반환
        return {
          id: result.admin.id,
          name: result.admin.name,
          phone: result.admin.phone,
          userType: "admin_user" as const,
          role: result.admin.role,
          dealer: null,
          employee: null,
          admin: result.admin,
          company: null,
          companyEmployee: null,
        };
      },
    }),
    // 상장업체 직원 로그인
    CredentialsProvider({
      id: "company-login",
      name: "상장업체 로그인",
      credentials: {
        phone: { label: "전화번호", type: "text", placeholder: "010-0000-0000" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.password) {
          throw new Error("전화번호와 비밀번호를 입력해주세요.");
        }

        const result = await verifyCompanyCredentials(
          credentials.phone,
          credentials.password
        );

        if (!result) {
          throw new Error("전화번호 또는 비밀번호가 올바르지 않습니다.");
        }

        // NextAuth User 객체 반환
        return {
          id: result.employee.id,
          name: result.employee.name,
          phone: result.employee.phone,
          userType: "company_user" as const,
          role: result.employee.role || "직원",
          dealer: null,
          employee: null,
          admin: null,
          company: result.company,
          companyEmployee: result.employee,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // 최초 로그인 시
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.phone = (user as AuthUser).phone;
        token.userType = (user as AuthUser).userType;
        token.role = (user as AuthUser).role;
        token.dealer = (user as AuthUser).dealer;
        token.employee = (user as AuthUser).employee;
        token.admin = (user as AuthUser).admin;
        token.company = (user as AuthUser).company;
        token.companyEmployee = (user as AuthUser).companyEmployee;
        token.auctionVerifiedDate = null;
        token.adminRefreshedAt = Date.now();
      }

      // 관리자 정보 주기적 갱신 (5분마다)
      if (!user && token.userType === "admin_user" && token.admin) {
        const lastRefresh = (token.adminRefreshedAt as number) || 0;
        if (Date.now() - lastRefresh > 5 * 60 * 1000) {
          try {
            const freshAdmin = await getAdminById(token.id as string);
            if (freshAdmin) {
              token.admin = freshAdmin;
              token.name = freshAdmin.name;
              token.role = freshAdmin.role;
            }
            token.adminRefreshedAt = Date.now();
          } catch {
            // DB 조회 실패 시 기존 데이터 유지
          }
        }
      }

      // 세션 업데이트 (경매 비밀번호 인증 시)
      if (trigger === "update" && session?.auctionVerifiedDate !== undefined) {
        token.auctionVerifiedDate = session.auctionVerifiedDate;
      }

      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.id as string,
        name: token.name as string,
        phone: token.phone as string,
        userType: token.userType as "dealer_user" | "admin_user" | "company_user",
        role: token.role as string,
      };
      session.dealer = token.dealer as Dealer | null;
      session.employee = token.employee as DealerEmployee | null;
      session.admin = token.admin as Admin | null;
      session.company = token.company as Company | null;
      session.companyEmployee = token.companyEmployee as CompanyEmployee | null;
      session.auctionVerifiedDate = token.auctionVerifiedDate as string | null;

      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24시간
  },
  secret: process.env.NEXTAUTH_SECRET,
  cookies: buildAuthCookies(),
};

/**
 * NextAuth 쿠키 이름 구성.
 *
 * 브라우저는 localhost:3000 / :3001 / :3002 를 모두 같은 `localhost` 도메인으로 취급해
 * 쿠키 저장소를 공유한다. 그래서 여러 포트에서 동시에 개발할 때 한쪽에서 로그인하면
 * 다른 쪽 세션이 덮어써지거나 로그아웃 시 함께 날아가는 문제가 발생한다.
 *
 * 개발 환경에서는 `NEXT_PORT` 또는 `PORT` 값을 쿠키 이름에 접미사로 붙여
 * 포트별로 독립된 세션 쿠키를 사용하도록 만든다.
 * 예) `next-auth.session-token.p3001`
 *
 * 프로덕션 (`NODE_ENV=production`) 에서는 NextAuth 기본 이름을 그대로 사용한다.
 */
function buildAuthCookies() {
  const isProd = process.env.NODE_ENV === "production";
  if (isProd) return undefined;

  const port = process.env.NEXT_PORT || process.env.PORT || "3000";
  const suffix = `.p${port}`;

  const baseOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: false,
  };

  return {
    sessionToken: {
      name: `next-auth.session-token${suffix}`,
      options: baseOptions,
    },
    callbackUrl: {
      name: `next-auth.callback-url${suffix}`,
      options: baseOptions,
    },
    csrfToken: {
      name: `next-auth.csrf-token${suffix}`,
      options: baseOptions,
    },
    pkceCodeVerifier: {
      name: `next-auth.pkce.code_verifier${suffix}`,
      options: { ...baseOptions, maxAge: 900 },
    },
    state: {
      name: `next-auth.state${suffix}`,
      options: { ...baseOptions, maxAge: 900 },
    },
    nonce: {
      name: `next-auth.nonce${suffix}`,
      options: baseOptions,
    },
  };
}

// 타입 확장
interface AuthUser {
  id: string;
  name: string;
  phone: string;
  userType: "dealer_user" | "admin_user" | "company_user";
  role: string;
  dealer: Dealer | null;
  employee: DealerEmployee | null;
  admin: Admin | null;
  company: Company | null;
  companyEmployee: CompanyEmployee | null;
}

declare module "next-auth" {
  interface User extends AuthUser {}

  interface Session {
    user: {
      id: string;
      name: string;
      phone: string;
      userType: "dealer_user" | "admin_user" | "company_user";
      role: string;
    };
    dealer: Dealer | null;
    employee: DealerEmployee | null;
    admin: Admin | null;
    company: Company | null;
    companyEmployee: CompanyEmployee | null;
    auctionVerifiedDate: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    name: string;
    phone: string;
    userType: "dealer_user" | "admin_user" | "company_user";
    role: string;
    dealer: Dealer | null;
    employee: DealerEmployee | null;
    admin: Admin | null;
    company: Company | null;
    companyEmployee: CompanyEmployee | null;
    auctionVerifiedDate: string | null;
    adminRefreshedAt: number | null;
  }
}
