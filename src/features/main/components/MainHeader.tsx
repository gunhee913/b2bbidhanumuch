"use client";

import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { ChevronDown, LogOut, User } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Wordmark } from "@/components/brand/Wordmark";
import { HouseLabel } from "@/features/entry/components/HouseLabel";
import { useCurrentHouse } from "@/features/entry/hooks/useCurrentHouse";
import { HOUSE_QUERY_KEY } from "@/features/entry/constants";
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

/**
 * PC 페이지 공통 컨테이너 · 경매장(`LiveAuctionRoom`) 기준 1360px, 와이드 모니터 1600px.
 * 헤더·본문·푸터가 같은 값을 써야 좌우 끝이 한 X 에 정렬된다.
 */
const PAGE_CONTAINER_CLASS = "max-w-[1360px] min-[1700px]:max-w-[1600px]";

/**
 * 우측 유틸리티(고객센터·앱·계정) 공통 hover 영역 · 세 항목이 같은 언어(텍스트만)를 쓰도록.
 * 팝오버 트리거는 열린 동안 hover 와 같은 상태를 유지한다(data-state=open).
 */
const UTILITY_ITEM_CLASS =
  "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13.5px] font-medium text-content-mid transition-colors hover:bg-surface-accent hover:text-content data-[state=open]:bg-surface-accent data-[state=open]:text-content";

/** 헤더 팝오버 공통 · 클릭 토글 · Esc·바깥 클릭으로 닫힘 · 키보드 포커스 이동 */
const HEADER_POPOVER_CLASS =
  "rounded-xl border-0 bg-surface p-0 text-content shadow-xl ring-1 ring-line";

interface MainHeaderProps {
  /** 좌우 폭 제한 없이 화면 끝까지 · 표를 넓게 쓰는 경매장 */
  fluid?: boolean;
}

export function MainHeader({ fluid = false }: MainHeaderProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isDealer = !!session?.dealer?.id || !!session?.employee?.dealerId;
  const visibleItems = GNB_ITEMS.filter((item) => !item.dealerOnly || isDealer);

  return (
    <header className="sticky top-0 z-40 w-full bg-canvas">
      <div
        className={cn(
          "mx-auto flex h-12 items-center justify-between gap-6 whitespace-nowrap px-8",
          !fluid && PAGE_CONTAINER_CLASS,
        )}
      >
        <div className="flex min-w-0 items-center gap-6">
          <div className="flex shrink-0 items-center">
            {/* 홈 = 경매장 · `/main` 은 공판장 선택 게이트라 로그인 후에는 돌아갈 이유가 없다 */}
            <Link href="/auction/live" className="flex items-center gap-1.5">
              <div className="relative h-5 w-5 shrink-0">
                <Image
                  src={LOGO_SRC}
                  alt="농협부분육경매 로고"
                  fill
                  sizes="20px"
                  className="object-contain"
                  priority
                  unoptimized
                />
              </div>
              <Wordmark height={15} className="text-content" />
            </Link>
            {/* 지금 들어와 있는 공판장 · 워드마크의 부속 정보 (메뉴가 아니다 · 전환 없음) */}
            <Suspense fallback={null}>
              <HouseLabel className="ml-2.5" />
            </Suspense>
          </div>

          <nav>
            <ul className="flex items-center">
              {visibleItems.map((item) => {
                const isActive = isGnbActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex h-12 items-center px-3 text-[14px] font-semibold transition-colors",
                        isActive
                          ? "text-content"
                          : "text-content-soft hover:text-content",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <Suspense fallback={<AuthMenuSkeleton />}>
            <AuthMenu />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

function AuthMenuSkeleton() {
  return (
    <div className="h-5 w-24 animate-pulse rounded bg-surface-accent" aria-hidden />
  );
}

/**
 * 로그인 진입 · 로그인 화면(공판장 선택 → 로그인)과 같은 흐름.
 * 공판장을 이미 알면 그 공판장의 로그인 단계로, 모르면 공판장 선택부터.
 */
function buildLoginHref(
  houseKey: string | null,
  callbackTarget: string,
): string {
  if (!houseKey) return "/main";
  const params = new URLSearchParams({
    [HOUSE_QUERY_KEY]: houseKey,
    callbackUrl: callbackTarget,
  });
  return `/login?${params.toString()}`;
}

function AuthMenu() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { house } = useCurrentHouse();
  const callbackTarget = buildPcCallbackUrl(pathname);

  if (status === "loading") return <AuthMenuSkeleton />;

  if (status !== "authenticated" || !session) {
    return (
      <Link
        href={buildLoginHref(house?.key ?? null, callbackTarget)}
        className="inline-flex h-8 items-center rounded-[2px] bg-inverse px-3.5 text-[13.5px] font-semibold text-inverse-content transition-colors hover:bg-inverse"
      >
        로그인
      </Link>
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
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${displayName} · ${roleLabel} · 계정 메뉴`}
          className={cn(
            UTILITY_ITEM_CLASS,
            "pl-1.5 font-semibold text-content",
          )}
        >
          <span
            aria-hidden
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-inverse text-[11px] font-bold leading-none text-inverse-content"
          >
            {displayName.trim().charAt(0) || <User className="h-3.5 w-3.5" />}
          </span>
          <span className="max-w-[90px] truncate">{displayName}</span>
          {/* 역할 · 관리자/업체/중도매인 계정을 한눈에 구분 */}
          <span className="text-[11.5px] font-medium text-content-faint">
            {roleLabel}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-content-faint" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className={cn(HEADER_POPOVER_CLASS, "w-[220px] overflow-hidden")}
      >
        <div className="border-b border-line-soft px-4 py-3">
          <div className="text-xs font-semibold text-content-faint">
            {roleLabel}
          </div>
          <div className="mt-0.5 truncate text-sm font-bold text-content">
            {displayName}
          </div>
        </div>

        <ul className="py-1 text-sm">
          {dashboardHref ? (
            <li>
              <Link
                href={dashboardHref}
                className="block px-4 py-2 text-content-mid outline-none hover:bg-surface-muted focus-visible:bg-surface-muted"
              >
                마이페이지
              </Link>
            </li>
          ) : null}
          <li>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/main" })}
              className="flex w-full items-center gap-2 border-t border-line-soft px-4 py-2 text-left text-content-mid outline-none hover:bg-surface-muted focus-visible:bg-surface-muted"
            >
              <LogOut className="h-3.5 w-3.5" />
              로그아웃
            </button>
          </li>
        </ul>
      </PopoverContent>
    </Popover>
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
 * - `/auction/live` `/history` `/delivery` `/insight` 같은 PC 전용 경로는 그대로 유지
 * - `/` (모바일 root) · `/login` · `/signup` · 그 외 예상 밖 경로는 안전하게 `/main` 으로 폴백
 * - 모바일 앱 라우트(`/bids`, `/trade`, `/market` 등) 로 로그인 후 튕겨나가지 않게 방지
 */
function buildPcCallbackUrl(pathname: string | null): string {
  if (!pathname) return "/main";
  const PC_ROUTE_PREFIXES = [
    "/auction/live",
    "/main",
    "/history",
    "/delivery",
    "/insight",
  ];
  if (
    PC_ROUTE_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    )
  ) {
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
