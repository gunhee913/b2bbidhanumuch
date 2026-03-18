'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UseRealtimeDeliveryOptions {
  onAssignmentChange?: () => void;
  enabled?: boolean;
}

export function useRealtimeDelivery({ onAssignmentChange, enabled = true }: UseRealtimeDeliveryOptions) {
  const onChangeRef = useRef(onAssignmentChange);
  onChangeRef.current = onAssignmentChange;
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setIsConnected(false);
      return;
    }

    const supabase = createClient();

    const channel = supabase
      .channel('realtime-delivery-assignments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_assignments',
        },
        () => {
          onChangeRef.current?.();
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [enabled]);

  return { isConnected };
}
