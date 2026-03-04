'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

export function useUnreadCount() {
  const { data: session } = useSession();
  const isDealerUser = session?.user?.userType === 'dealer_user';

  const { data } = useQuery<{ count: number }>({
    queryKey: ['unread-count'],
    queryFn: async () => {
      const res = await fetch('/api/notifications/unread-count');
      if (!res.ok) return { count: 0 };
      return res.json();
    },
    enabled: isDealerUser,
    refetchInterval: 30000,
  });

  return data?.count || 0;
}
