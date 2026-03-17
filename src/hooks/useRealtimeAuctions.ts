'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UseRealtimeAuctionsOptions {
  onAuctionChange?: () => void;
  enabled?: boolean;
}

export function useRealtimeAuctions({ onAuctionChange, enabled = true }: UseRealtimeAuctionsOptions) {
  const onAuctionChangeRef = useRef(onAuctionChange);
  onAuctionChangeRef.current = onAuctionChange;

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();

    const channel = supabase
      .channel('realtime-auctions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'auctions',
        },
        () => {
          onAuctionChangeRef.current?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled]);
}
