'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  X
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface OpenTab {
  href: string;
  title: string;
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
      { title: '중도매인 자산 관리', href: '/admin/assets/balance' },
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
    title: '설정',
    href: '/admin/settings',
    icon: Settings,
    subItems: [
      { title: '정산 설정', href: '/admin/settlements/settings' },
      { title: '문자/알림 설정', href: '/admin/settings/notifications' },
      { title: '경매시간 설정', href: '/admin/settings/auction-time' },
    ],
  },
];

// href로 페이지 타이틀 찾기
const getPageTitle = (href: string): string => {
  if (href === '/admin') return '대시보드';
  
  for (const item of menuItems) {
    if (item.href === href && !item.subItems) return item.title;
    if (item.subItems) {
      for (const subItem of item.subItems) {
        if (subItem.href === href) return subItem.title;
      }
    }
  }
  return '페이지';
};

// 탭 저장 키
const TABS_STORAGE_KEY = 'admin_open_tabs';

// 현재 경로에 해당하는 메뉴를 계산하는 함수
const getInitialExpandedMenus = (currentPathname: string) => {
  const openMenus: string[] = [];
  
  // 대시보드는 최상위 메뉴이므로 하위 메뉴 열기에서 제외
  if (currentPathname === '/admin') {
    return openMenus;
  }
  
  menuItems.forEach(item => {
    if (item.subItems) {
      const isSubItemActive = item.subItems.some(subItem => currentPathname.startsWith(subItem.href));
      // 정산설정 경로일 때 정산관리 메뉴는 열지 않음 (설정 메뉴만 열림)
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
  // 초기값을 현재 경로 기반으로 설정 (애니메이션 없이 바로 열림)
  const [expandedMenus, setExpandedMenus] = useState<string[]>(() => getInitialExpandedMenus(pathname));
  const [isAnimationEnabled, setIsAnimationEnabled] = useState(false);
  const prevPathnameRef = useRef(pathname);
  
  // 열린 탭 관리
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [isTabsLoaded, setIsTabsLoaded] = useState(false);
  
  // 탭 초기화 (localStorage에서 불러오기)
  useEffect(() => {
    const savedTabs = localStorage.getItem(TABS_STORAGE_KEY);
    if (savedTabs) {
      try {
        const parsed = JSON.parse(savedTabs) as OpenTab[];
        setOpenTabs(parsed);
      } catch {
        setOpenTabs([{ href: '/admin', title: '대시보드' }]);
      }
    } else {
      setOpenTabs([{ href: '/admin', title: '대시보드' }]);
    }
    setIsTabsLoaded(true);
  }, []);
  
  // 현재 경로를 탭에 추가 (경로 변경 시에만)
  useEffect(() => {
    if (!isTabsLoaded) return;
    
    setOpenTabs(prevTabs => {
      const existingTab = prevTabs.find(tab => tab.href === pathname);
      if (!existingTab) {
        const title = getPageTitle(pathname);
        const newTabs = [...prevTabs, { href: pathname, title }];
        localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(newTabs));
        return newTabs;
      }
      return prevTabs;
    });
  }, [pathname, isTabsLoaded]);
  
  // 탭 닫기
  const closeTab = (href: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    // 대시보드 탭은 닫지 않음
    if (href === '/admin') return;
    
    const newTabs = openTabs.filter(tab => tab.href !== href);
    setOpenTabs(newTabs);
    localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(newTabs));
    
    // 현재 탭을 닫으면 이전 탭으로 이동
    if (pathname === href) {
      const currentIdx = openTabs.findIndex(tab => tab.href === href);
      const prevTab = newTabs[currentIdx - 1] || newTabs[0];
      if (prevTab) {
        router.push(prevTab.href);
      }
    }
  };
  
  // 탭 클릭 (해당 페이지로 이동)
  const handleTabClick = (href: string) => {
    router.push(href);
  };

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
      // 애니메이션 일시 비활성화
      setIsAnimationEnabled(false);
      // 새 경로에 맞는 메뉴 상태로 업데이트
      setExpandedMenus(getInitialExpandedMenus(pathname));
      // 다음 프레임에서 애니메이션 다시 활성화
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
      {/* 사이드바 - 항상 고정 */}
      <aside className="fixed left-0 top-0 z-40 h-screen bg-gray-900 w-64">
        {/* 로고 영역 */}
        <div className="flex items-center h-14 px-4 border-b border-gray-800">
          <Link href="/admin" className="flex items-center">
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

        {/* 하단 영역: 관리자 정보 */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-800">
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-800">
            <div className="w-7 h-7 bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-xs">관</span>
            </div>
            <span className="text-white text-sm">관리자</span>
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
                [ <span className="font-medium text-gray-700">관리자</span> ] 로그인
              </span>

              {/* 구분선 */}
              <span className="text-gray-200">|</span>

              {/* 로그아웃 */}
              <button
                onClick={() => {/* 로그아웃 처리 */}}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                로그아웃
              </button>
            </div>
          </div>
        </header>

        {/* 메인 콘텐츠 */}
        <main className="p-4 lg:p-6 pb-16">
          {children}
        </main>

        {/* 하단 탭 바 */}
        {isTabsLoaded && openTabs.length > 0 && (
          <div className="fixed bottom-0 left-64 right-0 z-40 bg-gray-200 border-t border-gray-300">
            <div className="flex items-center h-8 gap-px px-1 overflow-x-auto">
              {openTabs.map((tab) => (
                <button
                  key={tab.href}
                  onClick={() => handleTabClick(tab.href)}
                  className={`flex items-center gap-1 h-full px-3 text-xs transition-colors whitespace-nowrap ${
                    pathname === tab.href
                      ? 'bg-white text-gray-900 font-medium border-t-2 border-gray-900'
                      : 'bg-gray-100 text-gray-600 border-t-2 border-transparent hover:bg-gray-50 hover:text-gray-800'
                  } ${tab.href !== '/admin' ? 'pr-1.5' : ''}`}
                >
                  <span className="max-w-32 truncate">{tab.title}</span>
                  {tab.href !== '/admin' && (
                    <span
                      onClick={(e) => closeTab(tab.href, e)}
                      className="ml-1.5 p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3 h-3" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
