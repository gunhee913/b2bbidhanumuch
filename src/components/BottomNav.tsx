'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, Gavel, BarChart3, Truck, User } from 'lucide-react';

const navItems = [
  { href: '/', label: '경매장', icon: Gavel },
  { href: '/bids', label: '경매내역', icon: ClipboardList },
  { href: '/trade', label: '배송지시', icon: Truck },
  { href: '/market', label: '시세', icon: BarChart3 },
  { href: '/profile', label: '내정보', icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') {
      // 메인 페이지 또는 /auction 관련 페이지일 때 '경매장' 활성화
      return pathname === '/' || pathname.startsWith('/auction');
    }
    if (href === '/bids') {
      // 경매내역 페이지
      return pathname.startsWith('/bids');
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex-shrink-0 bg-white border-t border-gray-200 px-2 md:px-4 pt-2 pb-5 safe-area-pb">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center py-2 transition-colors ${
                active ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              <Icon className="h-6 w-6 mb-1" />
              <span className={`text-[11px] ${active ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
