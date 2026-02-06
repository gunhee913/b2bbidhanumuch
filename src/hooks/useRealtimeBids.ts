'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { listingKeys } from '@/features/listings/hooks';

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
 * 입찰 데이터 실시간 구독 훅 (Optimistic Update)
 * bids 테이블 변경 시 React Query 캐시를 직접 업데이트하여 즉시 반영
 */
export function useRealtimeBids({ onBidChange, enabled = true }: UseRealtimeBidsOptions) {
  const queryClient = useQueryClient();
  const onBidChangeRef = useRef(onBidChange);
  onBidChangeRef.current = onBidChange;

  // 캐시 업데이트 함수
  const updateCache = useCallback((partId: string, bidPrice: number, dealerId: string) => {
    // 모든 listings 캐시를 순회하며 해당 part의 highestBid 업데이트
    queryClient.setQueriesData(
      { queryKey: listingKeys.lists() },
      (oldData: any) => {
        if (!oldData || !Array.isArray(oldData)) return oldData;
        
        return oldData.map((listing: any) => {
          if (!listing.parts) return listing;
          
          const updatedParts = listing.parts.map((part: any) => {
            if (part.id === partId) {
              // 현재 최고입찰가보다 높을 때만 업데이트
              const currentHighest = part.highestBid?.bidPrice || 0;
              if (bidPrice > currentHighest) {
                return {
                  ...part,
                  highestBid: {
                    ...part.highestBid,
                    bidPrice,
                    dealerId,
                  },
                  bidCount: (part.bidCount || 0) + 1,
                };
              }
            }
            return part;
          });
          
          return { ...listing, parts: updatedParts };
        });
      }
    );

    // byNo 캐시도 업데이트
    queryClient.setQueriesData(
      { queryKey: [...listingKeys.all, 'byNo'] },
      (oldData: any) => {
        if (!oldData || !oldData.parts) return oldData;
        
        const updatedParts = oldData.parts.map((part: any) => {
          if (part.id === partId) {
            const currentHighest = part.highestBid?.bidPrice || 0;
            if (bidPrice > currentHighest) {
              return {
                ...part,
                highestBid: {
                  ...part.highestBid,
                  bidPrice,
                  dealerId,
                },
                bidCount: (part.bidCount || 0) + 1,
              };
            }
          }
          return part;
        });
        
        return { ...oldData, parts: updatedParts };
      }
    );
  }, [queryClient]);

  useEffect(() => {
    if (!enabled) return;

    console.log('[Realtime] 구독 시작 (Optimistic Update 모드)');
    const supabase = createClient();

    const channel = supabase
      .channel('realtime-bids-optimistic')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bids',
        },
        (payload) => {
          console.log('[Realtime] 새 입찰 감지:', payload.new);
          const newBid = payload.new as any;
          
          if (newBid && newBid.part_id && newBid.bid_price) {
            // 캐시 즉시 업데이트
            updateCache(newBid.part_id, newBid.bid_price, newBid.dealer_id);
            
            // 콜백 호출 (추가 처리가 필요한 경우)
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
          console.log('[Realtime] 입찰 수정 감지:', payload.new);
          const updatedBid = payload.new as any;
          
          if (updatedBid && updatedBid.part_id && updatedBid.bid_price) {
            updateCache(updatedBid.part_id, updatedBid.bid_price, updatedBid.dealer_id);
            
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
        (payload) => {
          console.log('[Realtime] 입찰 삭제 감지');
          // 삭제 시에는 정확한 최고입찰가를 알 수 없으므로 refetch 필요
          onBidChangeRef.current?.();
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] 구독 상태:', status);
      });

    return () => {
      console.log('[Realtime] 구독 해제');
      supabase.removeChannel(channel);
    };
  }, [enabled, updateCache]);
}
