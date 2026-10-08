"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { ChevronDown, LogOut } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Wordmark } from "@/components/brand/Wordmark";
import { HouseLabel } from "@/features/entry/components/HouseLabel";
import { useCurrentHouse } from "@/features/entry/hooks/useCurrentHouse";
import { HOUSE_QUERY_KEY } from "@/features/entry/constants";
import { viewHref } from "@/hooks/usePersistedView";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/cyber_symbol%203.gif";

interface GnbItem {
  label: string;
  href: string;
  /** 딜러(중도매인/직원) 로그인 시에만 노출 */
  dealerOnly?: boolean;
  /**
   * 아래로 열리는 하위 메뉴 · 페이지 안 사이드 레일과 같은 이름·같은 차례.
   *
   * 둘이 어긋나면 안 된다. 머리에서 「상장표」 로 들어왔는데 왼쪽 레일에는 그런
   * 이름이 없으면, 방금 누른 것이 어디로 갔는지 찾을 데가 없다.
   */
  views?: { label: string; view: string }[];
}

/**
 * 머리 메뉴 차례 · 경매가 끝난 뒤 손이 가는 순서대로.
 *
 * 경매장에서 따면 그날 안에 거래처로 보내야 하고(배송지시), 지난 것을 되짚는 일
 * (경매내역·시세·통계)은 그 다음이다. 배송지시를 경매내역 뒤에 두었을 때는 가장
 * 급한 일이 가장 뒤에 서 있었다.
 */
const GNB_ITEMS: GnbItem[] = [
  { label: "경매장", href: "/auction/live" },
  { label: "배송지시", href: "/delivery", dealerOnly: true },
  {
    label: "경매내역",
    href: "/history",
    views: [
      { label: "경매결과", view: "history" },
      { label: "입찰내역", view: "bids" },
      { label: "상장표", view: "sheet" },
    ],
  },
  {
    label: "시세·통계",
    href: "/insight",
    views: [
      { label: "시세", view: "market" },
      { label: "경매통계", view: "stats" },
    ],
  },
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
              {visibleItems.map((item) => (
                <GnbEntry
                  key={item.href}
                  item={item}
                  active={isGnbActive(pathname, item.href)}
                />
              ))}
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

/**
 * 머리 메뉴 한 칸 · 하위 화면이 있으면 아래로 연다.
 *
 * **윗글자는 그대로 링크다.** 열리는 메뉴는 「어디로 갈까」 를 미리 집어 주는 지름길일
 * 뿐이고, 그냥 누르면 지난번에 보던 화면으로 들어간다 — 늘 같은 곳만 보는 사람에게
 * 메뉴를 한 번 더 고르게 할 까닭이 없다.
 *
 * 마우스(hover)와 키보드(focus) 둘 다로 열린다. hover 로만 열면 Tab 으로 머리를
 * 훑는 사람에게는 하위 화면이 아예 없는 것이 되고, 누르기로만 열면 손이 한 번 더
 * 간다. 닫는 길은 셋이다 — 떠나기, 포커스가 밖으로 나가기, Esc.
 */
function GnbEntry({ item, active }: { item: GnbItem; active: boolean }) {
  const [open, setOpen] = useState(false);

  const trigger = (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      aria-expanded={item.views ? open : undefined}
      className={cn(
        "flex h-12 items-center gap-1 px-3 text-[14px] font-semibold transition-colors",
        active ? "text-content" : "text-content-soft hover:text-content",
      )}
    >
      {item.label}
      {item.views ? (
        <ChevronDown
          className={cn(
            "h-3 w-3 shrink-0 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      ) : null}
    </Link>
  );

  if (!item.views) return <li>{trigger}</li>;

  return (
    <li
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      /* 포커스가 이 칸 **안에서** 옮겨다니는 동안은 안 닫는다 (윗글자 → 메뉴 줄) */
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      {trigger}
      {open ? (
        /*
         * 머리 바닥에 딱 붙인다(`top-full`). 사이를 띄우면 윗글자에서 메뉴로 내려가는
         * 동안 마우스가 틈에 빠져 메뉴가 닫힌다.
         */
        <ul
          className={cn(
            HEADER_POPOVER_CLASS,
            "absolute left-0 top-full z-50 min-w-[132px] overflow-hidden py-1",
          )}
        >
          {item.views.map((v) => (
            <li key={v.view}>
              <Link
                href={viewHref(item.href, v.view)}
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-[13.5px] font-medium text-content-mid outline-none hover:bg-surface-muted hover:text-content focus-visible:bg-surface-muted"
              >
                {v.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** 계정 팝오버 한 줄 · 라벨은 왼쪽 끝, 값은 오른쪽 끝에 맞춰 세로로 줄이 선다 */
function Row({
  label,
  value,
  numeric = false,
}: {
  label: string;
  value: string;
  numeric?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-content-faint">{label}</dt>
      <dd
        className={cn(
          "truncate font-semibold text-content-mid",
          numeric && "tabular-nums",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function AuthMenuSkeleton() {
  return (
    /* 폭은 중도매인 기준(`7000001 김건희 중도매인`) · 세션이 올 때 헤더 오른쪽이 덜 튀게 맞춰 둔다 */
    <div
      className="h-5 w-44 animate-pulse rounded bg-surface-accent"
      aria-hidden
    />
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
  const { house, dealerHouse } = useCurrentHouse();
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

  const roleLabel = getRoleLabel(session.user?.userType);
  const dashboardHref = getDashboardHref(session.user?.userType);

  /**
   * 머리글자 동그라미 대신 번호를 그대로 적는다.
   *
   * 중도매인끼리는 이름보다 번호로 서로를 부르고, 낙찰자 표시·정산 내역도 전부 번호로
   * 나간다. 동그라미 속 글자 한 자는 그 번호를 대신하지 못했다 — 「김」 이든 「1」 이든
   * 라벨이 없으면 무엇을 줄인 것인지 알 길이 없다.
   *
   * 라벨(「거래인번호」)은 떼고 숫자만 둔다. 이 자리의 일곱 자리 숫자는 중도매인에게
   * 설명이 필요 없고, 처음 보는 사람을 위한 풀이는 눌러서 열었을 때 있으면 된다.
   *
   * 직원 계정도 소속 중도매인의 번호로 입찰하므로 같은 번호를 보여 준다. 번호와 이름이
   * 둘 다 필요한 까닭도 여기 있다 — 직원이 여럿이면 번호는 같고 이름만 다르다.
   */
  const dealerNo = session.dealer?.dealerNo ?? null;
  /*
   * 중도매인이 아닌 계정은 역할을 눈에 띄게 적는다.
   *
   * 경매장에 들어오는 사람은 사실상 전부 중도매인이다(관리자는 `/admin`, 상장업체는
   * `/company`). 「중도매인」 은 이름의 꼬리표로 흐리게 두고, 드물게 뜨는 나머지에만
   * 면을 깔아 눈에 걸리게 한다 — 관리자 계정으로 잘못 들어온 것일 수 있다.
   */
  const foreignRole = session.user?.userType !== "dealer_user";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={[
            dealerNo && `거래인번호 ${dealerNo}`,
            displayName,
            roleLabel,
            "계정 메뉴",
          ]
            .filter(Boolean)
            .join(" · ")}
          className={cn(UTILITY_ITEM_CLASS, "gap-2 font-semibold text-content")}
        >
          {dealerNo ? <span className="tabular-nums">{dealerNo}</span> : null}
          <span className="max-w-[90px] truncate">{displayName}</span>
          <span
            className={cn(
              "shrink-0",
              foreignRole
                ? /* 관리자·상장업체는 면을 깔아 둔다 · 경매장에 잘못 들어온 것일 수 있다 */
                  "rounded bg-surface-accent px-1.5 py-0.5 text-[11px] font-bold text-content-mid"
                : "text-[11.5px] font-medium text-content-faint",
            )}
          >
            {roleLabel}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-content-faint" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className={cn(HEADER_POPOVER_CLASS, "w-[220px] overflow-hidden")}
      >
        {/*
         * 트리거에서 뺀 설명이 여기 모인다 · 평소엔 접어 두고 확인할 때만 펼친다.
         *
         * 소속 공판장은 다른 데서 말해 주는 곳이 없다. 이 공판장 상장만 입찰되는데
         * (`getBlockReason`), 그 사실은 값을 다 적고 Enter 를 친 뒤에야 알게 된다.
         */}
        <div className="border-b border-line-soft px-4 py-3">
          <dl className="flex flex-col gap-1.5 text-[12px]">
            {dealerNo ? (
              <Row label="거래인번호" value={dealerNo} numeric />
            ) : null}
            <Row label="성함" value={displayName} />
            <Row label="구분" value={roleLabel} />
            {dealerHouse ? (
              <Row label="소속 공판장" value={dealerHouse.fullName} />
            ) : null}
          </dl>
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
 * - 배송지시(`/delivery`) · 시세·통계(`/insight`) 등도 하위 경로 포함
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

/* 직원도 「중도매인」 이다 · 바깥에서 보기엔 같은 한 중도매인이고, 권한 차이는 화면이 알아서 가린다 */
function getRoleLabel(userType: string | undefined): string {
  if (userType === "admin_user") return "관리자";
  if (userType === "company_user") return "상장업체";
  if (userType === "dealer_user") return "중도매인";
  return "회원";
}

function getDashboardHref(userType: string | undefined): string | null {
  if (userType === "admin_user") return "/admin";
  if (userType === "company_user") return "/company";
  if (userType === "dealer_user") return "/profile";
  return null;
}
