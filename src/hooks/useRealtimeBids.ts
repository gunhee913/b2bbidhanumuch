'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface BidPayload {
  partId: string;
  bidPrice: number;
  dealerId: string;
  dealerName?: string;
}

interface UseRealtimeBidsOptions {
  onBidChange?: (payload?: BidPayload) => void;
  enabled?: boolean;
}

/**
 * 입찰 데이터 실시간 구독 훅
 * 비공개 입찰: 캐시에 highestBid/bidCount 등 타인 입찰 정보를 저장하지 않음
 * 변경 감지 시 콜백만 호출하여 필요한 데이터만 refetch
 */
export function useRealtimeBids({ onBidChange, enabled = true }: UseRealtimeBidsOptions) {
  const onBidChangeRef = useRef(onBidChange);
  onBidChangeRef.current = onBidChange;
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setIsConnected(false);
      return;
    }

    const supabase = createClient();

    const channel = supabase
      .channel('realtime-bids')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bids',
        },
        (payload) => {
          const newBid = payload.new as any;
          if (newBid?.part_id && newBid?.bid_price) {
            onBidChangeRef.current?.({
              partId: newBid.part_id,
              bidPrice: newBid.bid_price,
              dealerId: newBid.dealer_id,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bids',
        },
        (payload) => {
          const updatedBid = payload.new as any;
          if (updatedBid?.part_id && updatedBid?.bid_price) {
            onBidChangeRef.current?.({
              partId: updatedBid.part_id,
              bidPrice: updatedBid.bid_price,
              dealerId: updatedBid.dealer_id,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'bids',
        },
        () => {
          onBidChangeRef.current?.();
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
