'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home as HomeIcon, Gavel, BarChart3, FileText, User } from 'lucide-react';

const navItems = [
  { href: '/', label: '홈', icon: HomeIcon },
  { href: '/auction', label: '경매', icon: Gavel },
  { href: '/market', label: '시세', icon: BarChart3 },
  { href: '/trade', label: '거래', icon: FileText },
  { href: '/profile', label: '내정보', icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex-shrink-0 bg-white border-t border-gray-200 px-2 md:px-4 py-2 safe-area-pb">
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
              <span className={`text-xs ${active ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
