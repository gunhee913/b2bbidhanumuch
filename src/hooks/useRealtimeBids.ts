'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface RealtimeBidSignal {
  /** 변경이 발생한 부위 id · 캐시 무효화 범위 판단용 */
  partId: string | null;
}

interface UseRealtimeBidsOptions {
  /** 입찰 이벤트 (INSERT/UPDATE/DELETE) 발생 시 호출 · 캐시 무효화용 */
  onBidChange?: (signal?: RealtimeBidSignal) => void;
  enabled?: boolean;
}

/**
 * 입찰 데이터 실시간 구독 훅 · **신호 전용**.
 *
 * 비공개 입찰(sealed-bid) 정책:
 * - 진행 중 회차에서 타 매참인의 입찰가·신원은 어떤 경로로도 클라이언트에
 *   전달되면 안 된다. 따라서 realtime payload 의 `bid_price` / `dealer_id` /
 *   `is_top_bid` 는 **읽지 않고 버린다**.
 * - 이 훅은 "무언가 바뀌었다" 는 신호만 전달하고, 실제 데이터는 서버 API
 *   (`/api/listings/live` 등 · 서버측 마스킹 적용) 를 다시 fetch 해 반영한다.
 *
 * TODO: publication 에서 bids 를 제거하고 트리거 broadcast(part_id only) 로
 *       전환하면 raw payload 자체가 네트워크에 실리지 않는다. (후속 작업)
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

    const emit = (row: unknown) => {
      const partId =
        row && typeof row === 'object' && 'part_id' in row
          ? ((row as { part_id?: string }).part_id ?? null)
          : null;
      onBidChangeRef.current?.({ partId });
    };

    const channel = supabase
      .channel('realtime-bids')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bids' },
        (payload) => emit(payload.new),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bids' },
        (payload) => emit(payload.new),
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'bids' },
        (payload) => emit(payload.old),
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
