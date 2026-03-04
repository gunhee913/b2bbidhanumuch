'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useUnreadCount } from '@/hooks/useUnreadCount';

export default function NotificationBell() {
  const unreadCount = useUnreadCount();

  return (
    <Link
      href="/notifications"
      className="p-2 text-gray-600 hover:text-gray-900 transition-colors flex items-center justify-center relative"
    >
      <Bell className="w-[22px] h-[22px] translate-y-[0.5px]" />
      {unreadCount > 0 && (
        <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[9px] font-medium rounded-full flex items-center justify-center">
          {unreadCount > 99 ? '99' : unreadCount}
        </span>
      )}
    </Link>
  );
}
