import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { verifyLoginCredentials } from "@/features/dealers/auth";
import { verifyAdminCredentials } from "@/features/admins/auth";
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
};

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
  }
}
