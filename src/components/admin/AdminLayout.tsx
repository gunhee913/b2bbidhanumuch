'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  Settings,
  Bell,
  ChevronDown,
  Menu,
  X,
  LogOut,
  Gavel,
  TrendingUp,
  ClipboardList
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
      { title: '부분육 경락 내역', href: '/admin/auctions/bids' },
      { title: '부분육 낙찰율 조회', href: '/admin/auctions/results' },
    ],
  },
  {
    title: '거래처 관리',
    href: '/admin/partners',
    icon: Building2,
  },
  {
    title: '시세 관리',
    href: '/admin/market',
    icon: TrendingUp,
  },
  {
    title: '정산 관리',
    href: '/admin/settlements',
    icon: ClipboardList,
  },
  {
    title: '리포트',
    href: '/admin/reports',
    icon: FileText,
  },
  {
    title: '설정',
    href: '/admin/settings',
    icon: Settings,
  },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // 현재 경로에 해당하는 메뉴를 자동으로 열기
  useEffect(() => {
    const openMenus: string[] = [];
    menuItems.forEach(item => {
      if (item.subItems) {
        const isSubItemActive = item.subItems.some(subItem => pathname.startsWith(subItem.href));
        if (isSubItemActive || pathname.startsWith(item.href)) {
          openMenus.push(item.href);
        }
      }
    });
    if (openMenus.length > 0) {
      setExpandedMenus(prev => {
        const newMenus = [...new Set([...prev, ...openMenus])];
        return newMenus;
      });
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
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 사이드바 */}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } bg-gray-900 w-64`}
      >
        {/* 로고 영역 */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <span className="text-white font-bold text-lg">HanuMuch</span>
          </Link>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 관리자 정보 */}
        <div className="px-4 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-sm">관리</span>
            </div>
            <div>
              <p className="text-white font-medium text-sm">관리자</p>
              <p className="text-gray-400 text-xs">admin@hanumuch.co.kr</p>
            </div>
          </div>
        </div>

        {/* 네비게이션 메뉴 */}
        <nav className="px-3 py-4 overflow-y-auto h-[calc(100vh-180px)]">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.href}>
                {item.subItems ? (
                  <>
                    <button
                      onClick={() => toggleMenu(item.href)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                        isActiveLink(item.href)
                          ? 'bg-red-600 text-white'
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
                    {expandedMenus.includes(item.href) && (
                      <ul className="mt-1 ml-4 pl-4 border-l border-gray-700 space-y-1">
                        {item.subItems.map((subItem) => (
                          <li key={subItem.href}>
                            <Link
                              href={subItem.href}
                              className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                                pathname === subItem.href
                                  ? 'text-red-400 bg-gray-800'
                                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
                              }`}
                            >
                              {subItem.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      isActiveLink(item.href)
                        ? 'bg-red-600 text-white'
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
      </aside>

      {/* 메인 콘텐츠 영역 */}
      <div className={`transition-all duration-300 ${isSidebarOpen ? 'lg:ml-64' : ''}`}>
        {/* 상단 헤더 */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between h-full px-4 lg:px-6">
            {/* 왼쪽: 메뉴 토글 */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="hidden md:block">
                <h1 className="text-lg font-semibold text-gray-800">관리자 페이지</h1>
              </div>
            </div>

            {/* 오른쪽: 알림, 사용자 메뉴 */}
            <div className="flex items-center gap-2">
              {/* 알림 */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-800">알림</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      <div className="px-4 py-3 hover:bg-gray-50 cursor-pointer">
                        <p className="text-sm text-gray-800">새로운 입찰이 등록되었습니다.</p>
                        <p className="text-xs text-gray-500 mt-1">2분 전</p>
                      </div>
                      <div className="px-4 py-3 hover:bg-gray-50 cursor-pointer">
                        <p className="text-sm text-gray-800">경매 #001이 마감되었습니다.</p>
                        <p className="text-xs text-gray-500 mt-1">10분 전</p>
                      </div>
                      <div className="px-4 py-3 hover:bg-gray-50 cursor-pointer">
                        <p className="text-sm text-gray-800">신규 회원이 가입했습니다.</p>
                        <p className="text-xs text-gray-500 mt-1">1시간 전</p>
                      </div>
                    </div>
                    <div className="px-4 py-2 border-t border-gray-100">
                      <Link href="/admin/notifications" className="text-sm text-red-600 hover:text-red-700">
                        모든 알림 보기
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* 사용자 메뉴 */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 font-medium text-xs">관리</span>
                  </div>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                    <Link
                      href="/admin/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      프로필 설정
                    </Link>
                    <Link
                      href="/admin/settings"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      시스템 설정
                    </Link>
                    <hr className="my-2 border-gray-100" />
                    <button
                      onClick={() => {/* 로그아웃 처리 */}}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      로그아웃
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* 메인 콘텐츠 */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* 모바일 사이드바 오버레이 */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
