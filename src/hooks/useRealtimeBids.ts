'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UseRealtimeBidsOptions {
  onBidChange?: () => void;
  enabled?: boolean;
}

/**
 * 입찰 데이터 실시간 구독 훅
 * bids 테이블 또는 cattle_parts 테이블에 변경이 생기면 콜백 실행
 */
export function useRealtimeBids({ onBidChange, enabled = true }: UseRealtimeBidsOptions) {
  useEffect(() => {
    if (!enabled || !onBidChange) return;

    const supabase = createClient();

    // bids 테이블 변경 구독
    const channel = supabase
      .channel('realtime-bids')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE 모두 감지
          schema: 'public',
          table: 'bids',
        },
        (payload) => {
          console.log('[Realtime] 입찰 변경 감지:', payload.eventType);
          onBidChange();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cattle_parts',
        },
        (payload) => {
          // bid_price, winning_dealer_id 등이 변경되면 감지
          console.log('[Realtime] 부위 정보 변경 감지:', payload.eventType);
          onBidChange();
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] 구독 상태:', status);
      });

    // 클린업
    return () => {
      console.log('[Realtime] 구독 해제');
      supabase.removeChannel(channel);
    };
  }, [enabled, onBidChange]);
}
