'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface BidInfo {
  myBid: number;
  highestBid: number;
  status: 'highest' | 'secondHighest';
  time: string;
  // 상품 정보
  productInfo?: {
    listingNo: string;
    partName: string;
    weight: string;
    type: string;
    grade: string;
    price: number;
  };
}

interface BidStore {
  // 상장번호를 키로 사용
  bids: Record<string, BidInfo>;
  
  // 입찰 추가/수정
  setBid: (listingNo: string, bidInfo: BidInfo) => void;
  
  // 입찰 조회
  getBid: (listingNo: string) => BidInfo | undefined;
  
  // 전체 입찰 내역 조회
  getAllBids: () => Record<string, BidInfo>;
  
  // 빠른 재입찰 금액
  quickReBidAmount: number;
  setQuickReBidAmount: (amount: number) => void;
  
  // 차순위 알림
  isSecondBidNotificationOn: boolean;
  setIsSecondBidNotificationOn: (on: boolean) => void;
}

export const useBidStore = create<BidStore>()(
  persist(
    (set, get) => ({
      bids: {},
      
      setBid: (listingNo, bidInfo) => {
        set((state) => ({
          bids: {
            ...state.bids,
            [listingNo]: bidInfo
          }
        }));
      },
      
      getBid: (listingNo) => {
        return get().bids[listingNo];
      },
      
      getAllBids: () => {
        return get().bids;
      },
      
      quickReBidAmount: 1000,
      setQuickReBidAmount: (amount) => set({ quickReBidAmount: amount }),
      
      isSecondBidNotificationOn: false,
      setIsSecondBidNotificationOn: (on) => set({ isSecondBidNotificationOn: on }),
    }),
    {
      name: 'bid-storage',
    }
  )
);

