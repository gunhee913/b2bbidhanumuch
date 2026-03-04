'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useSession, signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  Settings,
  ChevronDown,
  Gavel,
  TrendingUp,
  ClipboardList,
  Truck,
  Wallet,
  Menu,
  X,
  Megaphone,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}


// 사이드바 메뉴 아이템
const menuItems = [
  {
    title: '대시보드',
    href: '/admin',
    icon: LayoutDashboard,
  },
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
    title: '거래처 관리',
    href: '/admin/partners',
    icon: Building2,
    subItems: [
      { title: '거래처 등록', href: '/admin/partners' },
      { title: '거래처 조회(중도매인별)', href: '/admin/partners/dealers' },
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
    title: '시세 관리',
    href: '/admin/market',
    icon: TrendingUp,
    subItems: [
      { title: '시세 조회', href: '/admin/market' },
    ],
  },
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
    ],
  },
];

// 현재 경로에 해당하는 메뉴를 계산하는 함수
const getInitialExpandedMenus = (currentPathname: string) => {
  const openMenus: string[] = [];
  
  if (currentPathname === '/admin') {
    return openMenus;
  }
  
  menuItems.forEach(item => {
    if (item.subItems) {
      const isSubItemActive = item.subItems.some(subItem => currentPathname.startsWith(subItem.href));
      if (currentPathname === '/admin/settlements/settings' && item.href === '/admin/settlements') {
        return;
      }
      if (isSubItemActive || currentPathname.startsWith(item.href)) {
        openMenus.push(item.href);
      }
    }
  });
  return openMenus;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme, theme } = useTheme();
  const { data: session } = useSession();
  
  // 초기값을 현재 경로 기반으로 설정 (애니메이션 없이 바로 열림)
  const [expandedMenus, setExpandedMenus] = useState<string[]>(() => getInitialExpandedMenus(pathname));
  const [isAnimationEnabled, setIsAnimationEnabled] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const prevPathnameRef = useRef(pathname);
  const previousThemeRef = useRef<string | undefined>(undefined);
  
  // 로그아웃 처리
  const handleLogout = async () => {
    await signOut({ callbackUrl: '/admin/login' });
  };
  
  // 관리자 페이지에서는 항상 라이트 모드 강제 적용
  useEffect(() => {
    // 이전 테마 저장 (최초 마운트 시에만)
    if (previousThemeRef.current === undefined && theme) {
      previousThemeRef.current = theme;
    }
    
    // 강제로 라이트 모드 적용
    setTheme('light');
    
    // 언마운트 시 이전 테마 복원
    return () => {
      if (previousThemeRef.current && previousThemeRef.current !== 'light') {
        setTheme(previousThemeRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // 마운트 후 애니메이션 활성화
  useEffect(() => {
    // 약간의 지연 후 애니메이션 활성화
    const timer = setTimeout(() => {
      setIsAnimationEnabled(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // 경로 변경 시 메뉴 상태 업데이트 (애니메이션 없이)
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      setIsAnimationEnabled(false);
      setExpandedMenus(getInitialExpandedMenus(pathname));
      setSidebarOpen(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimationEnabled(true);
        });
      });
      prevPathnameRef.current = pathname;
    }
  }, [pathname]);

  const toggleMenu = (href: string) => {
    setExpandedMenus(prev =>
      prev.includes(href)
        ? prev.filter(item => item !== href)
        : [...prev, href]
    );
  };

  const isActiveLink = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    // 대시보드 경로에서는 리포트 메뉴 비활성화
    if (pathname === '/admin' && href === '/admin/reports') {
      return false;
    }
    // 정산설정 경로에서는 정산관리 메뉴 비활성화 (설정 메뉴는 활성화)
    if (pathname === '/admin/settlements/settings' && href === '/admin/settlements') {
      return false;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 모바일 오버레이 배경 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <aside className={`fixed left-0 top-0 z-40 h-screen bg-gray-900 w-64 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* 로고 영역 */}
        <div className="flex items-center h-16 px-4 border-b border-gray-800">
          <Link href="/admin" className="flex items-center">
            <span className="flex flex-col gap-1">
              <span className="text-white font-bold text-[15px] tracking-tight">부분육 온라인경매 플랫폼</span>
              <span className="inline-flex self-start px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-gray-300 font-medium">관리자 센터</span>
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto p-1 text-gray-400 hover:text-white lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 네비게이션 메뉴 */}
        <nav className="px-3 py-4 overflow-y-auto h-[calc(100vh-64px-56px)]">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.href}>
                {item.subItems ? (
                  <>
                    <button
                      onClick={() => toggleMenu(item.href)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                        isActiveLink(item.href)
                          ? 'bg-gray-700 text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="w-5 h-5" />
                        <span className="text-sm font-medium">{item.title}</span>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          expandedMenus.includes(item.href) ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    <div
                      className={`overflow-hidden ${
                        isAnimationEnabled ? 'transition-all duration-200 ease-in-out' : ''
                      } ${
                        expandedMenus.includes(item.href)
                          ? 'max-h-96'
                          : 'max-h-0'
                      }`}
                    >
                      <ul className="mt-1 ml-4 pl-4 border-l border-gray-700 space-y-1">
                        {item.subItems.map((subItem) => (
                          <li key={subItem.href}>
                            <Link
                              href={subItem.href}
                              className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                                pathname === subItem.href
                                  ? 'text-white bg-gray-800 font-medium'
                                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
                              }`}
                            >
                              {subItem.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      isActiveLink(item.href)
                        ? 'bg-gray-700 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.title}</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* 하단 영역: 관리자 정보 */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-800">
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-800">
            <div className="w-7 h-7 bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-xs">
                {session?.admin?.name?.charAt(0) || '관'}
              </span>
            </div>
            <span className="text-white text-sm">{session?.admin?.name || '관리자'}</span>
          </div>
        </div>
      </aside>

      {/* 메인 콘텐츠 영역 */}
      <div className="lg:ml-64 overflow-x-auto">
        {/* 상단 바 */}
        <header className="sticky top-0 z-20 h-10 bg-white border-b border-gray-200">
          <div className="flex items-center h-full px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1 -ml-1 text-gray-500 hover:text-gray-700 lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 text-xs ml-auto">
              <span className="text-gray-600">중부미트센터</span>
              <span className="text-gray-300">|</span>
              <span className="text-gray-600">[ <span className="font-medium text-gray-700">{session?.admin?.name || '관리자'}</span> ]</span>
              <span className="text-gray-300">|</span>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700"
              >
                로그아웃
              </button>
            </div>
          </div>
        </header>

        {/* 메인 콘텐츠 */}
        <main className="p-4 lg:p-6 min-w-[1024px]">
          {children}
        </main>
      </div>
    </div>
  );
}
