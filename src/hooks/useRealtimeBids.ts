'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface RealtimeBidPayload {
  partId: string;
  bidPrice: number;
  dealerId: string;
  isTopBid?: boolean;
}

interface UseRealtimeBidsOptions {
  /** 모든 입찰 이벤트 (INSERT/UPDATE/DELETE) 발생 시 호출 · 캐시 무효화용 */
  onBidChange?: (payload?: RealtimeBidPayload) => void;
  enabled?: boolean;
}

/**
 * 입찰 데이터 실시간 구독 훅.
 *
 * 오픈 최고가 경매 정책 하에서:
 * - 최고가 갱신은 `place_bid` RPC 가 부위 row lock 을 걸고 원자적으로 처리
 * - 클라이언트는 realtime INSERT/UPDATE 이벤트를 받으면 관련 쿼리를 무효화
 *   → 리스트/상세를 서버에서 다시 가져오면서 topBid/isMine 이 자연스럽게 반영됨
 *
 * 서버가 이미 신원 마스킹을 적용해 반환하므로 payload 자체에는
 * 매참인 이름 등 민감 정보는 포함되지 않는다. dealer_id 는 UI 에서
 * "내 입찰이 밀렸는지" 판정하는 용도로만 사용한다.
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
              isTopBid: !!newBid.is_top_bid,
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
              isTopBid: !!updatedBid.is_top_bid,
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
