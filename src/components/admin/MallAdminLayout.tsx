'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useSession, signOut } from 'next-auth/react';
import {
  ArrowLeftRight,
  Boxes,
  ChevronDown,
  FileSignature,
  Gauge,
  Menu,
  PackageCheck,
  UserRound,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MallAdminLayoutProps {
  children: React.ReactNode;
}

interface SubItem {
  title: string;
  href: string;
  /** 아직 화면이 없는 메뉴 · 구조만 먼저 보여준다 */
  soon?: boolean;
}

interface MenuItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  subItems?: SubItem[];
}

export const MALL_ADMIN_HOME = '/admin/mall';
export const AUCTION_ADMIN_HOME = '/admin';

const menuItems: MenuItem[] = [
  { title: '대시보드', href: MALL_ADMIN_HOME, icon: Gauge },
  {
    title: '공동구매',
    href: '/admin/mall/group-buy',
    icon: Boxes,
    subItems: [
      { title: 'kg 수요 풀', href: '/admin/mall/group-buy/pools' },
      { title: '상품(구좌)', href: '/admin/mall/group-buy' },
      { title: '주문·예약', href: '/admin/mall/group-buy/orders', soon: true },
      { title: '선물세트', href: '/admin/mall/group-buy/gift' },
      { title: '매장 관리', href: '/admin/mall/group-buy/stores' },
      { title: '부위 이미지', href: '/admin/mall/group-buy/part-images' },
      { title: '부위별 기본 설정', href: '/admin/mall/group-buy/part-defaults' },
      { title: '설정', href: '/admin/mall/group-buy/settings' },
    ],
  },
  {
    title: '견적받기',
    href: '/admin/mall/quotes',
    icon: FileSignature,
    subItems: [
      { title: '견적 요청', href: '/admin/mall/quotes', soon: true },
      { title: '견적 설정', href: '/admin/mall/quotes/settings', soon: true },
    ],
  },
  {
    title: '소비자',
    href: '/admin/mall/consumers',
    icon: UserRound,
    subItems: [{ title: '회원 관리', href: '/admin/mall/consumers', soon: true }],
  },
  {
    title: '배송·정산',
    href: '/admin/mall/fulfillment',
    icon: PackageCheck,
    subItems: [
      { title: '소분·출고', href: '/admin/mall/fulfillment', soon: true },
      { title: '환불 내역', href: '/admin/mall/refunds', soon: true },
    ],
  },
];

/** 상세 페이지(/admin/mall/group-buy/[id])도 '상품(구좌)' 메뉴로 묶기 위한 매칭 */
const isSubItemActive = (pathname: string, sub: SubItem, siblings: SubItem[]) => {
  if (pathname === sub.href) return true;
  if (!pathname.startsWith(`${sub.href}/`)) return false;
  // 더 구체적인 형제 메뉴가 있으면 그쪽이 활성화된다
  return !siblings.some((s) => s.href !== sub.href && s.href.length > sub.href.length && pathname.startsWith(s.href));
};

const getInitialExpandedMenus = (pathname: string) =>
  menuItems.filter((item) => item.subItems && pathname.startsWith(item.href)).map((item) => item.href);

export default function MallAdminLayout({ children }: MallAdminLayoutProps) {
  const pathname = usePathname();
  const { setTheme, theme } = useTheme();
  const { data: session } = useSession();

  const [expandedMenus, setExpandedMenus] = useState<string[]>(() => getInitialExpandedMenus(pathname));
  const [isAnimationEnabled, setIsAnimationEnabled] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const prevPathnameRef = useRef(pathname);
  const previousThemeRef = useRef<string | undefined>(undefined);

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/admin/login' });
  };

  // 관리자 화면은 항상 라이트 모드
  useEffect(() => {
    if (previousThemeRef.current === undefined && theme) {
      previousThemeRef.current = theme;
    }
    setTheme('light');
    return () => {
      if (previousThemeRef.current && previousThemeRef.current !== 'light') {
        setTheme(previousThemeRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimationEnabled(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (prevPathnameRef.current === pathname) return;
    setIsAnimationEnabled(false);
    setExpandedMenus((prev) => Array.from(new Set([...prev, ...getInitialExpandedMenus(pathname)])));
    setSidebarOpen(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsAnimationEnabled(true));
    });
    prevPathnameRef.current = pathname;
  }, [pathname]);

  const toggleMenu = (href: string) => {
    setExpandedMenus((prev) => (prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]));
  };

  const isActiveGroup = (href: string) => (href === MALL_ADMIN_HOME ? pathname === MALL_ADMIN_HOME : pathname.startsWith(href));

  return (
    <div className="min-h-screen bg-stone-100">
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen w-64 bg-[#1c1917] transition-transform duration-200 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center border-b border-white/10 px-4">
          <Link href={MALL_ADMIN_HOME} className="flex items-center">
            <span className="flex flex-col gap-1">
              <span className="text-[15px] font-bold tracking-tight text-white">한우 직거래몰</span>
              <span className="inline-flex self-start rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-200">
                직거래몰 관리자 센터
              </span>
            </span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto p-1 text-stone-400 hover:text-white lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="h-[calc(100vh-64px-56px-44px)] overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.href}>
                {item.subItems ? (
                  <>
                    <button
                      onClick={() => toggleMenu(item.href)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg px-3 py-2.5 transition-colors',
                        isActiveGroup(item.href) ? 'bg-white/10 text-white' : 'text-stone-300 hover:bg-white/5 hover:text-white',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5" />
                        <span className="text-sm font-medium">{item.title}</span>
                      </div>
                      <ChevronDown className={cn('h-4 w-4 transition-transform', expandedMenus.includes(item.href) && 'rotate-180')} />
                    </button>
                    <div
                      className={cn(
                        'overflow-hidden',
                        isAnimationEnabled && 'transition-all duration-200 ease-in-out',
                        expandedMenus.includes(item.href) ? 'max-h-96' : 'max-h-0',
                      )}
                    >
                      <ul className="ml-4 mt-1 space-y-1 border-l border-white/10 pl-4">
                        {item.subItems.map((sub) => (
                          <li key={sub.href}>
                            {sub.soon ? (
                              <span className="flex cursor-default items-center justify-between rounded-lg px-3 py-2 text-sm text-stone-500">
                                {sub.title}
                                <span className="rounded bg-white/5 px-1 py-0.5 text-[10px] text-stone-500">준비 중</span>
                              </span>
                            ) : (
                              <Link
                                href={sub.href}
                                className={cn(
                                  'block rounded-lg px-3 py-2 text-sm transition-colors',
                                  isSubItemActive(pathname, sub, item.subItems!)
                                    ? 'bg-white/10 font-medium text-white'
                                    : 'text-stone-400 hover:bg-white/5 hover:text-white',
                                )}
                              >
                                {sub.title}
                              </Link>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                      isActiveGroup(item.href) ? 'bg-white/10 text-white' : 'text-stone-300 hover:bg-white/5 hover:text-white',
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{item.title}</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* 경매 관리자로 전환 */}
        <div className="absolute bottom-14 left-0 right-0 px-3">
          <Link
            href={AUCTION_ADMIN_HOME}
            className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-stone-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            경매 관리자로 전환
          </Link>
        </div>

        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10">
          <div className="flex items-center gap-2 bg-black/30 px-4 py-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-600">
              <span className="text-xs font-medium text-white">{session?.admin?.name?.charAt(0) || '관'}</span>
            </div>
            <span className="text-sm text-white">{session?.admin?.name || '관리자'}</span>
          </div>
        </div>
      </aside>

      <div className="overflow-x-auto lg:ml-64">
        <header className="sticky top-0 z-20 h-10 border-b border-stone-200 bg-white">
          <div className="flex h-full items-center px-4">
            <button onClick={() => setSidebarOpen(true)} className="-ml-1 p-1 text-stone-500 hover:text-stone-700 lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <div className="ml-auto flex items-center gap-3 text-xs">
              <span className="text-stone-600">{session?.admin?.department || '관리자'}</span>
              <span className="text-stone-300">|</span>
              <span className="text-stone-600">
                [ <span className="font-medium text-stone-700">{session?.admin?.name || '관리자'}</span> ]
              </span>
              <span className="text-stone-300">|</span>
              <button onClick={handleLogout} className="text-stone-500 hover:text-stone-700">
                로그아웃
              </button>
            </div>
          </div>
        </header>

        <main className="min-w-[1024px] p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
