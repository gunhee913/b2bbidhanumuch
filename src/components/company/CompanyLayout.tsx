'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useSession, signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  ChevronDown,
  Gavel,
  ClipboardList,
  Truck,
} from 'lucide-react';

interface CompanyLayoutProps {
  children: React.ReactNode;
}


// 사이드바 메뉴 아이템
const menuItems = [
  {
    title: '대시보드',
    href: '/company',
    icon: LayoutDashboard,
  },
  {
    title: '부분육 관리',
    href: '/company/auctions',
    icon: Gavel,
    subItems: [
      { title: '부분육 상장 조회', href: '/company/auctions' },
      { title: '부분육 상장 등록', href: '/company/auctions/new' },
      { title: '부분육 경매 현황(실시간)', href: '/company/auctions/live' },
      { title: '부분육 경락 내역', href: '/company/auctions/bids' },
      { title: '부분육 낙찰 조회', href: '/company/auctions/results' },
    ],
  },
  {
    title: '정산 관리',
    href: '/company/settlements',
    icon: ClipboardList,
    subItems: [
      { title: '정산서', href: '/company/settlements' },
    ],
  },
  {
    title: '배송 관리',
    href: '/company/delivery',
    icon: Truck,
    subItems: [
      { title: '출고지시서', href: '/company/delivery' },
    ],
  },
];


// 현재 경로에 해당하는 메뉴를 계산하는 함수
const getInitialExpandedMenus = (currentPathname: string) => {
  const openMenus: string[] = [];
  
  if (currentPathname === '/company') {
    return openMenus;
  }
  
  menuItems.forEach(item => {
    if (item.subItems) {
      const isSubItemActive = item.subItems.some(subItem => currentPathname.startsWith(subItem.href));
      if (isSubItemActive || currentPathname.startsWith(item.href)) {
        openMenus.push(item.href);
      }
    }
  });
  return openMenus;
};

export default function CompanyLayout({ children }: CompanyLayoutProps) {
  const pathname = usePathname();
  const { setTheme, theme } = useTheme();
  const { data: session } = useSession();
  
  // 초기값을 현재 경로 기반으로 설정 (애니메이션 없이 바로 열림)
  const [expandedMenus, setExpandedMenus] = useState<string[]>(() => getInitialExpandedMenus(pathname));
  const [isAnimationEnabled, setIsAnimationEnabled] = useState(false);
  const prevPathnameRef = useRef(pathname);
  const previousThemeRef = useRef<string | undefined>(undefined);
  
  
  // 라이트 모드 강제 적용
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
  

  // 마운트 후 애니메이션 활성화
  useEffect(() => {
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
    if (href === '/company') {
      return pathname === '/company';
    }
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/company/login' });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 사이드바 - 항상 고정 */}
      <aside className="fixed left-0 top-0 z-40 h-screen bg-gray-900 w-64">
        {/* 로고 영역 */}
        <div className="flex items-center h-14 px-4 border-b border-gray-800">
          <Link href="/company" className="flex items-center">
            <span className="text-white font-bold text-lg">HanuMuch</span>
          </Link>
        </div>

        {/* 네비게이션 메뉴 */}
        <nav className="px-3 py-4 overflow-y-auto h-[calc(100vh-56px-56px)]">
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

        {/* 하단 영역: 사용자 정보 */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-800">
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-800">
            <div className="w-7 h-7 bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-xs">
                {session?.company?.name?.charAt(0) || '업'}
              </span>
            </div>
            <span className="text-white text-sm">{session?.company?.name || '상장업체'}</span>
          </div>
        </div>
      </aside>

      {/* 메인 콘텐츠 영역 - 항상 사이드바 오른쪽에 */}
      <div className="ml-64">
        {/* 미니 상단 바 */}
        <header className="sticky top-0 z-30 h-10 bg-white border-b border-gray-200">
          <div className="flex items-center justify-end h-full px-4">
            {/* 오른쪽: 로그인 정보 + 로그아웃 */}
            <div className="flex items-center gap-4">
              {/* 로그인 정보 */}
              <span className="text-xs text-gray-600">
                [ <span className="font-medium text-gray-700">{session?.company?.name}</span> ] {session?.companyEmployee?.name || session?.user?.name} 로그인
              </span>

              {/* 구분선 */}
              <span className="text-gray-200">|</span>

              {/* 로그아웃 */}
              <button
                onClick={handleLogout}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                로그아웃
              </button>
            </div>
          </div>
        </header>

        {/* 메인 콘텐츠 */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
