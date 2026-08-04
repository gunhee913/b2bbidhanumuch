"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  ChevronDown,
  Headphones,
  LogOut,
  Smartphone,
  User,
} from "lucide-react";
import { AppleIcon, GooglePlayIcon } from "@/features/main/lib/storeIcons";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/cyber_symbol%203.gif";

interface GnbItem {
  label: string;
  href: string;
  /** 딜러(중도매인/직원) 로그인 시에만 노출 */
  dealerOnly?: boolean;
}

const GNB_ITEMS: GnbItem[] = [
  { label: "경매장", href: "/auction/live" },
  { label: "경매내역", href: "/history" },
  { label: "배송지시", href: "/delivery", dealerOnly: true },
  { label: "시세·동향", href: "/insight" },
];

export function MainHeader() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isDealer =
    !!session?.dealer?.id || !!session?.employee?.dealerId;
  const visibleItems = GNB_ITEMS.filter(
    (item) => !item.dealerOnly || isDealer,
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 shadow-[0_1px_0_rgba(15,23,42,0.02)] backdrop-blur-sm">
      <div className="mx-auto flex h-[64px] max-w-[1240px] items-center justify-between px-8">
        <div className="flex items-center gap-10">
          <Link href="/main" className="flex items-center gap-3">
            <div className="relative h-8 w-8 shrink-0">
              <Image
                src={LOGO_SRC}
                alt="부분육 온라인경매 로고"
                fill
                sizes="32px"
                className="object-contain"
                priority
                unoptimized
              />
            </div>
            <div className="h-7 w-px bg-slate-200" aria-hidden />
            <div className="flex flex-col gap-0.5">
              <span className="text-[17px] font-extrabold leading-none tracking-tight text-slate-900">
                부분육 온라인경매
              </span>
              <span className="text-[11px] font-semibold leading-none tracking-normal text-slate-500">
                <span className="text-sky-700">NH</span>
                <span className="mx-1.5 text-slate-300">·</span>
                Online Auction
              </span>
            </div>
          </Link>

          <nav>
            <ul className="flex items-center gap-8">
              {visibleItems.map((item) => {
                const isActive = isGnbActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "group relative py-1 text-[16px] transition-colors",
                        isActive
                          ? "font-extrabold text-sky-700"
                          : "font-semibold text-slate-800 hover:text-sky-700",
                      )}
                    >
                      {item.label}
                      <span
                        className={cn(
                          "absolute inset-x-0 -bottom-1 h-0.5 origin-left bg-sky-600 transition-transform",
                          isActive
                            ? "scale-x-100"
                            : "scale-x-0 group-hover:scale-x-100",
                        )}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        <div className="flex items-center gap-5">
          <AuthMenu />

          <Link
            href="/support"
            className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-slate-800 hover:text-sky-700"
          >
            <Headphones className="h-4 w-4" />
            고객센터
          </Link>

          <AppDownloadMenu />
        </div>
      </div>
    </header>
  );
}

function AuthMenu() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const callbackTarget = buildPcCallbackUrl(pathname);

  if (status === "loading") {
    return (
      <div className="h-5 w-24 animate-pulse rounded bg-slate-100" aria-hidden />
    );
  }

  if (status !== "authenticated" || !session) {
    return (
      <>
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(callbackTarget)}`}
          className="text-[14px] font-semibold text-slate-800 hover:text-sky-700"
        >
          로그인
        </Link>
        <Link
          href="/signup"
          className="text-[14px] font-semibold text-slate-800 hover:text-sky-700"
        >
          회원가입
        </Link>
      </>
    );
  }

  const displayName =
    session.user?.name ||
    session.dealer?.name ||
    session.employee?.name ||
    session.admin?.name ||
    session.company?.name ||
    session.companyEmployee?.name ||
    "회원";

  const roleLabel = getRoleLabel(session.user?.userType, session.user?.role);
  const dashboardHref = getDashboardHref(session.user?.userType);

  return (
    <div className="group relative">
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[14px] font-semibold text-slate-800 transition-colors hover:bg-slate-100 hover:text-sky-700"
      >
        <User className="h-4 w-4" />
        <span className="max-w-[90px] truncate">{displayName}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>

      <div className="pointer-events-none absolute right-0 top-full z-50 pt-2 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
        <div className="w-[220px] overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-slate-200">
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="text-xs font-semibold text-slate-400">
              {roleLabel}
            </div>
            <div className="mt-0.5 truncate text-sm font-bold text-slate-900">
              {displayName}
            </div>
          </div>

          <ul className="py-1 text-sm">
            {dashboardHref ? (
              <li>
                <Link
                  href={dashboardHref}
                  className="block px-4 py-2 text-slate-700 hover:bg-slate-50"
                >
                  마이페이지
                </Link>
              </li>
            ) : null}
            <li>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/main" })}
                className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2 text-left text-slate-700 hover:bg-slate-50"
              >
                <LogOut className="h-3.5 w-3.5" />
                로그아웃
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * 현재 pathname 이 GNB 항목의 활성 상태인지 판정.
 *
 * - 정확히 일치하거나, 하위 경로(`/history/xxx`, `/auction/live/xxx`) 인 경우 활성
 * - 배송지시(`/delivery`) · 시세동향(`/insight`) 등도 하위 경로 포함
 */
function isGnbActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

/**
 * PC 웹에서 사용할 callbackUrl 을 구성한다.
 *
 * - `/main` `/history` `/delivery` `/insight` 같은 PC 전용 경로는 그대로 유지
 * - `/` (모바일 root) · `/login` · `/signup` · 그 외 예상 밖 경로는 안전하게 `/main` 으로 폴백
 * - 모바일 앱 라우트(`/bids`, `/trade`, `/market` 등) 로 로그인 후 튕겨나가지 않게 방지
 */
function buildPcCallbackUrl(pathname: string | null): string {
  if (!pathname) return "/main";
  const PC_ROUTE_PREFIXES = ["/main", "/history", "/delivery", "/insight"];
  if (PC_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return pathname;
  }
  return "/main";
}

function getRoleLabel(
  userType: string | undefined,
  role: string | undefined,
): string {
  if (userType === "admin_user") return "관리자";
  if (userType === "company_user") return "상장업체";
  if (userType === "dealer_user") {
    return role === "employee" ? "중도매인 직원" : "중도매인";
  }
  return "회원";
}

function getDashboardHref(userType: string | undefined): string | null {
  if (userType === "admin_user") return "/admin";
  if (userType === "company_user") return "/company";
  if (userType === "dealer_user") return "/profile";
  return null;
}

function AppDownloadMenu() {
  return (
    <div className="group relative">
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-[13px] font-semibold text-white"
      >
        <Smartphone className="h-3.5 w-3.5" />
        앱 다운로드
      </button>

      <div className="pointer-events-none absolute right-0 top-full z-50 pt-3 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
        <div className="relative w-[280px] rounded-xl bg-white p-4 shadow-xl ring-1 ring-slate-200">
          <svg
            aria-hidden
            className="absolute right-[38px] top-0 -translate-y-full"
            width="14"
            height="8"
            viewBox="0 0 14 8"
          >
            <path d="M0 8 L7 0 L14 8 Z" fill="white" />
            <path
              d="M0 8 L7 0 L14 8"
              fill="none"
              stroke="rgb(226 232 240)"
              strokeWidth="1"
            />
          </svg>

          <div className="flex items-center gap-3">
            <div className="flex h-[92px] w-[92px] shrink-0 items-center justify-center border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-400">
              QR코드
            </div>

            <div className="flex flex-1 flex-col gap-1.5">
              <PopoverStoreButton
                label="Google Play"
                href="#"
                icon={<GooglePlayIcon className="h-3.5 w-3.5" />}
              />
              <PopoverStoreButton
                label="App Store"
                href="#"
                icon={<AppleIcon className="h-3.5 w-3.5" />}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PopoverStoreButtonProps {
  label: string;
  href: string;
  icon: React.ReactNode;
}

function PopoverStoreButton({ label, href, icon }: PopoverStoreButtonProps) {
  return (
    <a
      href={href}
      className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:border-slate-300 hover:bg-slate-50"
    >
      {icon}
      {label}
    </a>
  );
}
