'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  Users,
  Building2,
  Settings,
  ChevronDown,
  ChevronRight,
  Gavel,
  TrendingUp,
  ClipboardList,
  Truck,
  Wallet,
  Menu,
  X,
  Megaphone,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NH_LOGO_SRC } from '@/features/entry/components/EntryBrand';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface SubItem {
  title: string;
  href: string;
}

interface MenuItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  subItems?: SubItem[];
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const ADMIN_HOME = '/admin';
const AUCTION_FLOOR_HREF = '/auction/live';

/** 사이드 메뉴 · 성격별로 묶고, 하위가 하나뿐인 메뉴는 바로 링크로 둔다 */
const MENU_GROUPS: MenuGroup[] = [
  {
    label: '운영',
    items: [
      { title: '대시보드', href: ADMIN_HOME, icon: LayoutDashboard },
      {
        title: '경매 관리',
        href: '/admin/auctions',
        icon: Gavel,
        subItems: [
          { title: '부분육 상장 조회', href: '/admin/auctions' },
          { title: '부분육 상장 등록', href: '/admin/auctions/new' },
          { title: '부분육 경매 현황(실시간)', href: '/admin/auctions/live' },
          { title: '부분육 경락 내역', href: '/admin/auctions/bids' },
          { title: '부분육 낙찰률 조회', href: '/admin/auctions/results' },
        ],
      },
      {
        title: '배송 관리',
        href: '/admin/delivery',
        icon: Truck,
        subItems: [
          { title: '경락내역 거래처 지정', href: '/admin/delivery/partners' },
          { title: '출고지시서', href: '/admin/delivery/orders' },
          { title: '증명서 조회', href: '/admin/delivery/certificates' },
        ],
      },
      {
        title: '정산 관리',
        href: '/admin/settlements',
        icon: ClipboardList,
        subItems: [
          { title: '정산서(상장업체별)', href: '/admin/settlements' },
          { title: '낙찰서(중도매인별)', href: '/admin/settlements/dealers' },
        ],
      },
      {
        title: '자산 관리',
        href: '/admin/assets',
        icon: Wallet,
        subItems: [
          { title: '중도매인 자산 관리(입출금)', href: '/admin/assets/balance' },
          { title: '중도매인 거래 내역', href: '/admin/assets/transactions' },
        ],
      },
      { title: '시세 조회', href: '/admin/market', icon: TrendingUp },
    ],
  },
  {
    label: '회원·거래처',
    items: [
      {
        title: '회원 관리',
        href: '/admin/users',
        icon: Users,
        subItems: [
          { title: '중도매인 관리', href: '/admin/users/dealers' },
          { title: '상장업체 관리', href: '/admin/users/companies' },
          { title: '관리자 관리', href: '/admin/users/admins' },
        ],
      },
      {
        title: '거래처 관리',
        href: '/admin/partners',
        icon: Building2,
        subItems: [
          { title: '거래처 등록', href: '/admin/partners' },
          { title: '거래처 조회(중도매인별)', href: '/admin/partners/dealers' },
        ],
      },
    ],
  },
  {
    label: '시스템',
    items: [
      {
        title: '고객센터 관리',
        href: '/admin/content',
        icon: Megaphone,
        subItems: [
          { title: '공지사항 관리', href: '/admin/notices' },
          { title: '이용약관 관리', href: '/admin/content/terms' },
          { title: '개인정보처리방침 관리', href: '/admin/content/privacy' },
          { title: '사업장 정보 관리', href: '/admin/content/company-info' },
        ],
      },
      {
        title: '설정',
        href: '/admin/settings',
        icon: Settings,
        subItems: [
          { title: '정산 설정', href: '/admin/settlements/settings' },
          { title: '문자/알림 설정', href: '/admin/settings/notifications' },
          { title: '경매 일정 설정', href: '/admin/settings/auction-calendar' },
          { title: '경매 예정시간 설정', href: '/admin/settings/round-schedule' },
          { title: '부위 대표이미지 설정', href: '/admin/settings/part-images' },
        ],
      },
    ],
  },
];

const ALL_ITEMS = MENU_GROUPS.flatMap((group) => group.items);

const matchesHref = (pathname: string, href: string) => {
  if (href === ADMIN_HOME) return pathname === ADMIN_HOME;
  return pathname === href || pathname.startsWith(`${href}/`);
};

interface Location {
  item: MenuItem | null;
  subItem: SubItem | null;
}

/**
 * 현재 경로가 어느 메뉴에 속하는지 · 가장 긴 href 가 이긴다.
 * `/admin/settlements/settings` 는 정산 관리가 아니라 설정 › 정산 설정으로,
 * `/admin/auctions/123` 은 부분육 상장 조회로 잡힌다.
 */
const resolveLocation = (pathname: string): Location => {
  const candidates = ALL_ITEMS.flatMap((item) =>
    item.subItems
      ? item.subItems.map((subItem) => ({ item, subItem, href: subItem.href }))
      : [{ item, subItem: null, href: item.href }],
  );
  const best = candidates
    .filter((candidate) => matchesHref(pathname, candidate.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return best ? { item: best.item, subItem: best.subItem } : { item: null, subItem: null };
};

const buildCrumbs = ({ item, subItem }: Location) => {
  if (!item) return ['관리자'];
  if (!subItem) return [item.title];
  return [item.title, subItem.title];
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const location = useMemo(() => resolveLocation(pathname), [pathname]);
  const crumbs = buildCrumbs(location);

  const [expandedHref, setExpandedHref] = useState<string | null>(() => location.item?.subItems ? location.item.href : null);
  const [isAnimationEnabled, setIsAnimationEnabled] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const prevPathnameRef = useRef(pathname);

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/admin/login' });
  };

  // 첫 그리기 뒤에만 아코디언 애니메이션 · 처음 열리는 메뉴가 펼쳐지는 모션을 보이지 않게
  useEffect(() => {
    const timer = setTimeout(() => setIsAnimationEnabled(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // 경로가 바뀌면 그 경로의 메뉴만 열어 둔다 (모션 없이)
  useEffect(() => {
    if (prevPathnameRef.current === pathname) return;
    setIsAnimationEnabled(false);
    setExpandedHref(location.item?.subItems ? location.item.href : null);
    setSidebarOpen(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsAnimationEnabled(true));
    });
    prevPathnameRef.current = pathname;
  }, [pathname, location.item]);

  const toggleMenu = (href: string) => {
    setExpandedHref((prev) => (prev === href ? null : href));
  };

  const adminName = session?.admin?.name || '관리자';
  const adminDepartment = session?.admin?.department;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-14 shrink-0 items-center border-b border-slate-200 px-5">
          <Link href={ADMIN_HOME} className="flex items-center gap-2.5">
            <span className="relative h-5 w-5 shrink-0">
              <Image src={NH_LOGO_SRC} alt="" fill sizes="20px" className="object-contain" priority unoptimized />
            </span>
            <span className="text-[15px] font-bold leading-none tracking-[-0.02em] text-slate-900">부분육 온라인경매</span>
            <span className="rounded-[2px] border border-slate-300 px-1 py-px text-[10px] font-medium leading-none text-slate-500">
              관리자
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="ml-auto p-1 text-slate-400 hover:text-slate-900 lg:hidden"
            aria-label="메뉴 닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="관리자 메뉴">
          {MENU_GROUPS.map((group) => (
            <div key={group.label} className="mb-5 last:mb-0">
              <p className="px-3 pb-1.5 pt-1 text-[11px] font-medium text-slate-400">{group.label}</p>
              <ul className="space-y-px">
                {group.items.map((item) => {
                  const isCurrent = location.item?.href === item.href;
                  const isExpanded = expandedHref === item.href;

                  if (!item.subItems) {
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            'flex h-9 items-center gap-2.5 rounded-[2px] px-3 text-[13px] transition-colors',
                            isCurrent ? 'bg-slate-100 font-semibold text-slate-900' : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                          )}
                        >
                          <item.icon className={cn('h-4 w-4 shrink-0', isCurrent ? 'text-slate-900' : 'text-slate-400')} />
                          {item.title}
                        </Link>
                      </li>
                    );
                  }

                  return (
                    <li key={item.href}>
                      <button
                        type="button"
                        onClick={() => toggleMenu(item.href)}
                        aria-expanded={isExpanded}
                        className={cn(
                          'flex h-9 w-full items-center gap-2.5 rounded-[2px] px-3 text-[13px] transition-colors',
                          isCurrent ? 'font-semibold text-slate-900' : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                        )}
                      >
                        <item.icon className={cn('h-4 w-4 shrink-0', isCurrent ? 'text-slate-900' : 'text-slate-400')} />
                        <span className="flex-1 text-left">{item.title}</span>
                        <ChevronDown
                          className={cn('h-3.5 w-3.5 text-slate-400 transition-transform', isExpanded && 'rotate-180')}
                        />
                      </button>
                      <div
                        className={cn(
                          'overflow-hidden',
                          isAnimationEnabled && 'transition-[max-height] duration-200 ease-in-out',
                          isExpanded ? 'max-h-96' : 'max-h-0',
                        )}
                      >
                        <ul className="mb-1 ml-[19px] mt-0.5 border-l border-slate-200">
                          {item.subItems.map((subItem) => {
                            const isSubCurrent = location.subItem?.href === subItem.href;
                            return (
                              <li key={subItem.href}>
                                <Link
                                  href={subItem.href}
                                  aria-current={isSubCurrent ? 'page' : undefined}
                                  className={cn(
                                    'relative -ml-px block border-l-2 py-[7px] pl-4 pr-2 text-[13px] leading-[1.3] transition-colors',
                                    isSubCurrent
                                      ? 'border-slate-900 font-semibold text-slate-900'
                                      : 'border-transparent text-slate-500 hover:text-slate-900',
                                  )}
                                >
                                  {subItem.title}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <div className="overflow-x-auto lg:ml-64">
        <header className="sticky top-0 z-20 flex h-14 items-center border-b border-slate-200 bg-white px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="-ml-2 mr-3 p-1 text-slate-500 hover:text-slate-900 lg:hidden"
            aria-label="메뉴 열기"
          >
            <Menu className="h-5 w-5" />
          </button>

          <nav aria-label="현재 위치" className="flex items-center gap-1.5 text-[13px]">
            {crumbs.map((crumb, index) => {
              const isLast = index === crumbs.length - 1;
              return (
                <span key={`${crumb}-${index}`} className="flex items-center gap-1.5">
                  {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-300" />}
                  <span className={isLast ? 'font-semibold text-slate-900' : 'text-slate-500'}>{crumb}</span>
                </span>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-4 text-[13px]">
            <Link
              href={AUCTION_FLOOR_HREF}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-slate-600 transition-colors hover:text-slate-900"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              경매장 보기
            </Link>
            <span className="h-4 w-px bg-slate-200" aria-hidden />
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
                {adminName.charAt(0)}
              </span>
              <span className="font-medium text-slate-900">{adminName}</span>
              {adminDepartment && <span className="text-[12px] text-slate-400">{adminDepartment}</span>}
            </div>
            <span className="h-4 w-px bg-slate-200" aria-hidden />
            <button type="button" onClick={handleLogout} className="text-slate-500 transition-colors hover:text-slate-900">
              로그아웃
            </button>
          </div>
        </header>

        <main className="min-w-[1024px] p-6">{children}</main>
      </div>
    </div>
  );
}
