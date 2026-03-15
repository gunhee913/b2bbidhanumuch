'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UseRealtimeFavoritesOptions {
  onFavChange?: () => void;
  enabled?: boolean;
}

export function useRealtimeFavorites({ onFavChange, enabled = true }: UseRealtimeFavoritesOptions) {
  const onFavChangeRef = useRef(onFavChange);
  onFavChangeRef.current = onFavChange;

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();

    const channel = supabase
      .channel('realtime-favorites')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dealer_favorites',
        },
        () => {
          onFavChangeRef.current?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled]);
}
