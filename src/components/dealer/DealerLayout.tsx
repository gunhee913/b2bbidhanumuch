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
  Wallet,
  Building2,
} from 'lucide-react';

interface DealerLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  {
    title: '대시보드',
    href: '/dealer',
    icon: LayoutDashboard,
  },
  {
    title: '부분육 관리',
    href: '/dealer/auctions',
    icon: Gavel,
    subItems: [
      { title: '부분육 상장 조회', href: '/dealer/auctions' },
      { title: '부분육 경락 내역', href: '/dealer/auctions/bids' },
    ],
  },
  {
    title: '정산 관리',
    href: '/dealer/settlements',
    icon: ClipboardList,
    subItems: [
      { title: '낙찰서', href: '/dealer/settlements' },
    ],
  },
  {
    title: '자산 관리',
    href: '/dealer/transactions',
    icon: Wallet,
    subItems: [
      { title: '거래 내역', href: '/dealer/transactions' },
    ],
  },
  {
    title: '거래처 관리',
    href: '/dealer/partners',
    icon: Building2,
    subItems: [
      { title: '거래처 조회', href: '/dealer/partners' },
    ],
  },
  {
    title: '배송 관리',
    href: '/dealer/delivery',
    icon: Truck,
    subItems: [
      { title: '경락내역 거래처 지정', href: '/dealer/delivery' },
    ],
  },
];

const getInitialExpandedMenus = (currentPathname: string) => {
  const openMenus: string[] = [];

  if (currentPathname === '/dealer') {
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

export default function DealerLayout({ children }: DealerLayoutProps) {
  const pathname = usePathname();
  const { setTheme, theme } = useTheme();
  const { data: session } = useSession();

  const [expandedMenus, setExpandedMenus] = useState<string[]>(() => getInitialExpandedMenus(pathname));
  const [isAnimationEnabled, setIsAnimationEnabled] = useState(false);
  const prevPathnameRef = useRef(pathname);
  const previousThemeRef = useRef<string | undefined>(undefined);

  const dealerName = session?.dealer?.name || session?.employee?.name || '중도매인';

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
    const timer = setTimeout(() => {
      setIsAnimationEnabled(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

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
    if (href === '/dealer') {
      return pathname === '/dealer';
    }
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/dealer/login' });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <aside className="fixed left-0 top-0 z-40 h-screen bg-gray-900 w-64">
        <div className="flex items-center h-14 px-4 border-b border-gray-800">
          <Link href="/dealer" className="flex items-center">
            <span className="text-white font-bold text-lg">HanuMuch</span>
          </Link>
        </div>

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

        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-800">
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-800">
            <div className="w-7 h-7 bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-xs">
                {dealerName.charAt(0)}
              </span>
            </div>
            <span className="text-white text-sm">{dealerName}</span>
          </div>
        </div>
      </aside>

      <div className="ml-64">
        <header className="sticky top-0 z-30 h-10 bg-white border-b border-gray-200">
          <div className="flex items-center justify-end h-full px-4">
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-600">
                [ <span className="font-medium text-gray-700">{session?.dealer?.name}</span> ] {session?.employee?.name || session?.user?.name} 로그인
              </span>
              <span className="text-gray-200">|</span>
              <button
                onClick={handleLogout}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                로그아웃
              </button>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
