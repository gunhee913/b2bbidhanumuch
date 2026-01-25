'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home as HomeIcon, Gavel, BarChart3, FileText, User } from 'lucide-react';

const navItems = [
  { href: '/', label: '경매장', icon: Gavel },
  { href: '/auction', label: '기타', icon: HomeIcon },
  { href: '/market', label: '시세', icon: BarChart3 },
  { href: '/trade', label: '거래', icon: FileText },
  { href: '/profile', label: '내정보', icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') {
      // 메인 페이지 또는 /auction/[id] 상세 페이지일 때 '경매' 활성화
      return pathname === '/' || (pathname.startsWith('/auction/') && pathname !== '/auction');
    }
    if (href === '/auction') {
      // /auction 정확히 일치할 때만 '기타' 활성화
      return pathname === '/auction';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex-shrink-0 bg-white border-t border-gray-200 px-2 md:px-4 pt-1.5 pb-5 safe-area-pb">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center py-1.5 transition-colors ${
                active ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              <Icon className="h-5 w-5 mb-0.5" />
              <span className={`text-[10px] ${active ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
