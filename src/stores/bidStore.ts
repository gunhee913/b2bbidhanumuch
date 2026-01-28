'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 오늘 날짜 코드 (YYMMDD)
const getTodayDateCode = () => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
};

// 시드 기반 랜덤 숫자 생성 (매일 같은 값 생성)
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

// 오늘 날짜 기반 시드 생성
const getDailySeed = () => {
  const dateCode = getTodayDateCode();
  return parseInt(dateCode, 10);
};

// BidInfo 인터페이스 (함수에서 사용하기 위해 여기서 정의)
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

// AuctionResult 인터페이스 (함수에서 사용하기 위해 여기서 정의)
interface AuctionResult {
  listingNo: string;
  result: 'won' | 'lost';
  myBid: number;
  winningBid: number;
  time: string;
  productInfo: {
    partName: string;
    weight: string;
    type: string;
    grade: string;
  };
}

// 일일 입찰 데이터 생성 함수 (최고순위 3개 + 차순위 12개, 매일 새로 생성)
const generateDailyBids = (): Record<string, BidInfo> => {
  const dateCode = getTodayDateCode();
  const dateStr = `${dateCode.slice(0, 2)}.${dateCode.slice(2, 4)}.${dateCode.slice(4, 6)}`;
  const seed = getDailySeed();
  
  // 차순위 부위 목록 (12개)
  const secondHighestParts = [
    { name: '등심(좌)', basePrice: 95000, weight: 15.3 },
    { name: '등심(우)', basePrice: 92000, weight: 15.6 },
    { name: '안심', basePrice: 110000, weight: 4.8 },
    { name: '채끝', basePrice: 85000, weight: 8.4 },
    { name: '갈비(좌)', basePrice: 78000, weight: 12.1 },
    { name: '갈비(우)', basePrice: 76000, weight: 11.8 },
    { name: '목심', basePrice: 62000, weight: 13.5 },
    { name: '앞다리', basePrice: 55000, weight: 25.2 },
    { name: '우둔', basePrice: 52000, weight: 19.8 },
    { name: '설도(좌)', basePrice: 48000, weight: 16.5 },
    { name: '양지(좌)', basePrice: 45000, weight: 12.2 },
    { name: '사태', basePrice: 42000, weight: 15.0 },
  ];
  
  // 최고순위 부위 목록 (3개)
  const highestParts = [
    { name: '등심(좌)', basePrice: 98000, weight: 14.5 },
    { name: '안심', basePrice: 115000, weight: 5.2 },
    { name: '갈비(좌)', basePrice: 82000, weight: 13.2 },
  ];
  
  // 등급 목록
  const grades = ['1++A(9)', '1++A(8)', '1++B(7)', '1+A', '1+B', '1A', '1B', '2A'];
  const types = ['한우거세', '한우암'];
  
  const bids: Record<string, BidInfo> = {};
  
  // 차순위 12개 생성
  secondHighestParts.forEach((part, index) => {
    const itemSeed = seed + index * 137;
    const priceVariation = Math.floor(seededRandom(itemSeed) * 10000) - 5000;
    const weightVariation = (seededRandom(itemSeed + 1) * 2 - 1);
    const gradeIndex = Math.floor(seededRandom(itemSeed + 2) * grades.length);
    const typeIndex = Math.floor(seededRandom(itemSeed + 3) * types.length);
    
    const basePrice = part.basePrice + priceVariation;
    const myBid = basePrice - Math.floor(seededRandom(itemSeed + 4) * 5000) - 2000;
    const highestBid = basePrice + Math.floor(seededRandom(itemSeed + 5) * 3000) + 1000;
    const weight = (part.weight + weightVariation).toFixed(1);
    
    // 시간 생성 (09:00 ~ 10:30 사이)
    const minuteOffset = Math.floor(seededRandom(itemSeed + 6) * 90);
    const hour = 9 + Math.floor(minuteOffset / 60);
    const minute = minuteOffset % 60;
    const timeStr = `${dateStr} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    
    // 상장번호 생성 (101-XX ~ 112-XX)
    const entityNo = 101 + index;
    const partNo = String(Math.floor(seededRandom(itemSeed + 7) * 12) + 1).padStart(2, '0');
    const listingNo = `${dateCode}-${entityNo}-${partNo}`;
    
    bids[listingNo] = {
      myBid,
      highestBid,
      status: 'secondHighest' as const,
      time: timeStr,
      productInfo: {
        listingNo,
        partName: part.name,
        weight: `${weight}kg`,
        type: types[typeIndex],
        grade: grades[gradeIndex],
        price: highestBid,
      }
    };
  });
  
  // 최고순위 3개 생성
  highestParts.forEach((part, index) => {
    const itemSeed = seed + (index + 100) * 137; // 차순위와 다른 시드 사용
    const priceVariation = Math.floor(seededRandom(itemSeed) * 8000) - 4000;
    const weightVariation = (seededRandom(itemSeed + 1) * 2 - 1);
    const gradeIndex = Math.floor(seededRandom(itemSeed + 2) * 4); // 상위 등급만 (1++, 1+)
    const typeIndex = Math.floor(seededRandom(itemSeed + 3) * types.length);
    
    const basePrice = part.basePrice + priceVariation;
    const myBid = basePrice + Math.floor(seededRandom(itemSeed + 4) * 3000) + 1000; // 최고가
    const highestBid = myBid; // 최고순위이므로 내 입찰가 = 최고가
    const weight = (part.weight + weightVariation).toFixed(1);
    
    // 시간 생성 (09:30 ~ 10:00 사이)
    const minuteOffset = Math.floor(seededRandom(itemSeed + 6) * 30) + 30;
    const hour = 9 + Math.floor(minuteOffset / 60);
    const minute = minuteOffset % 60;
    const timeStr = `${dateStr} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    
    // 상장번호 생성 (201-XX ~ 203-XX)
    const entityNo = 201 + index;
    const partNo = String(Math.floor(seededRandom(itemSeed + 7) * 12) + 1).padStart(2, '0');
    const listingNo = `${dateCode}-${entityNo}-${partNo}`;
    
    bids[listingNo] = {
      myBid,
      highestBid,
      status: 'highest' as const,
      time: timeStr,
      productInfo: {
        listingNo,
        partName: part.name,
        weight: `${weight}kg`,
        type: types[typeIndex],
        grade: grades[gradeIndex],
        price: highestBid,
      }
    };
  });
  
  return bids;
};

// 어제 날짜 코드 (YYMMDD)
const getYesterdayDateCode = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yy = String(yesterday.getFullYear()).slice(2);
  const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
  const dd = String(yesterday.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
};

// 경매 결과 데이터 생성 함수 (1/26 고정)
const generateDailyAuctionResults = (): AuctionResult[] => {
  const dateCode = '260126'; // 1월 26일 고정
  const dateStr = '26.01.26';
  const seed = parseInt(dateCode, 10);
  
  // 낙찰 부위 목록 (15개)
  const wonParts = [
    { name: '등심(좌)', basePrice: 105000, weight: 15.2 },
    { name: '등심(우)', basePrice: 102000, weight: 15.5 },
    { name: '안심', basePrice: 135000, weight: 4.6 },
    { name: '갈비(좌)', basePrice: 82000, weight: 12.8 },
    { name: '앞다리', basePrice: 58000, weight: 24.5 },
    { name: '등심(좌)', basePrice: 98000, weight: 14.2 },
    { name: '등심(우)', basePrice: 95000, weight: 14.5 },
    { name: '안심', basePrice: 125000, weight: 5.2 },
    { name: '갈비(좌)', basePrice: 78000, weight: 11.8 },
    { name: '갈비(우)', basePrice: 76000, weight: 12.1 },
    { name: '채끝', basePrice: 72000, weight: 7.8 },
    { name: '앞다리', basePrice: 55000, weight: 22.5 },
    { name: '우둔', basePrice: 52000, weight: 18.2 },
    { name: '목심', basePrice: 58000, weight: 12.8 },
    { name: '양지(좌)', basePrice: 48000, weight: 13.5 },
  ];
  
  // 유찰 부위 목록 (10개)
  const lostParts = [
    { name: '등심(좌)', basePrice: 98000, weight: 14.8 },
    { name: '채끝', basePrice: 75000, weight: 8.2 },
    { name: '갈비(우)', basePrice: 70000, weight: 11.5 },
    { name: '우둔', basePrice: 48000, weight: 20.1 },
    { name: '목심', basePrice: 52000, weight: 14.2 },
    { name: '양지(좌)', basePrice: 45000, weight: 12.5 },
    { name: '양지(우)', basePrice: 46000, weight: 12.8 },
    { name: '설도(좌)', basePrice: 42000, weight: 16.5 },
    { name: '설도(우)', basePrice: 43000, weight: 16.2 },
    { name: '사태', basePrice: 38000, weight: 15.0 },
  ];
  
  const grades = ['1++A(9)', '1++A(8)', '1++B(7)', '1+A', '1+B', '1A', '1B', '2A'];
  const types = ['한우거세', '한우암'];
  
  const results: AuctionResult[] = [];
  
  // 낙찰 15개 생성
  wonParts.forEach((part, index) => {
    const itemSeed = seed + index * 97;
    const priceVariation = Math.floor(seededRandom(itemSeed) * 8000) - 4000;
    const weightVariation = (seededRandom(itemSeed + 1) * 1.5 - 0.75);
    const gradeIndex = Math.floor(seededRandom(itemSeed + 2) * grades.length);
    const typeIndex = Math.floor(seededRandom(itemSeed + 3) * types.length);
    
    const myBid = part.basePrice + priceVariation;
    const weight = (part.weight + weightVariation).toFixed(1);
    
    // 시간 생성 (14:30 ~ 16:30 사이)
    const minuteOffset = Math.floor(seededRandom(itemSeed + 4) * 120);
    const baseMinutes = 14 * 60 + 30 + minuteOffset;
    const hour = Math.floor(baseMinutes / 60);
    const minute = baseMinutes % 60;
    const timeStr = `${dateStr} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    
    const entityNo = 101 + index;
    const partNo = String(Math.floor(seededRandom(itemSeed + 5) * 12) + 1).padStart(2, '0');
    const listingNo = `${dateCode}-${entityNo}-${partNo}`;
    
    results.push({
      listingNo,
      result: 'won' as const,
      myBid,
      winningBid: myBid,
      time: timeStr,
      productInfo: {
        partName: part.name,
        weight: `${weight}kg`,
        type: types[typeIndex],
        grade: grades[gradeIndex],
      }
    });
  });
  
  // 유찰 10개 생성
  lostParts.forEach((part, index) => {
    const itemSeed = seed + (index + 50) * 97;
    const priceVariation = Math.floor(seededRandom(itemSeed) * 6000) - 3000;
    const weightVariation = (seededRandom(itemSeed + 1) * 1.5 - 0.75);
    const gradeIndex = Math.floor(seededRandom(itemSeed + 2) * grades.length);
    const typeIndex = Math.floor(seededRandom(itemSeed + 3) * types.length);
    
    const myBid = part.basePrice + priceVariation;
    const priceDiff = Math.floor(seededRandom(itemSeed + 6) * 10000) + 5000;
    const winningBid = myBid + priceDiff;
    const weight = (part.weight + weightVariation).toFixed(1);
    
    // 시간 생성 (14:50 ~ 16:00 사이)
    const minuteOffset = Math.floor(seededRandom(itemSeed + 4) * 70);
    const baseMinutes = 14 * 60 + 50 + minuteOffset;
    const hour = Math.floor(baseMinutes / 60);
    const minute = baseMinutes % 60;
    const timeStr = `${dateStr} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    
    const entityNo = 201 + index;
    const partNo = String(Math.floor(seededRandom(itemSeed + 5) * 12) + 1).padStart(2, '0');
    const listingNo = `${dateCode}-${entityNo}-${partNo}`;
    
    results.push({
      listingNo,
      result: 'lost' as const,
      myBid,
      winningBid,
      time: timeStr,
      productInfo: {
        partName: part.name,
        weight: `${weight}kg`,
        type: types[typeIndex],
        grade: grades[gradeIndex],
      }
    });
  });
  
  return results;
};

// 앱 로드 시 즉시 잘못된 입찰 데이터 삭제 (스토어 생성 전에 실행)
if (typeof window !== 'undefined') {
  // 모든 이전 버전 삭제
  ['bid-storage', 'bid-storage-v2', 'bid-storage-v3', 'bid-storage-v4', 'bid-storage-v5', 'bid-storage-v6', 'bid-storage-v7', 'bid-storage-v8', 'bid-storage-v9', 'bid-storage-v10', 'bid-storage-v11', 'bid-storage-v12', 'bid-storage-v13', 'bid-storage-v14', 'bid-storage-v15', 'bid-storage-v16', 'bid-storage-v17'].forEach(key => {
    localStorage.removeItem(key);
  });
  
  // 현재 버전에서 잘못된 데이터 정리
  const currentKey = 'bid-storage-v18';
  const data = localStorage.getItem(currentKey);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (parsed.state?.bids) {
        const cleanedBids: Record<string, any> = {};
        Object.entries(parsed.state.bids).forEach(([listingNo, bid]) => {
          const parts = listingNo.split('-');
          // 올바른 형식: YYMMDD-XXX-YY (6자리-3자리-2자리), 개체번호 >= 100
          if (parts.length === 3 && 
              parts[0].length === 6 && 
              parts[1].length === 3 && 
              parts[2].length === 2 &&
              parseInt(parts[1]) >= 100) {
            cleanedBids[listingNo] = bid;
          }
        });
        parsed.state.bids = cleanedBids;
        localStorage.setItem(currentKey, JSON.stringify(parsed));
      }
    } catch (e) {
      localStorage.removeItem(currentKey);
    }
  }
}

// 알림 타입
type NotificationType = 'auctionStart' | 'secondBid' | 'auctionResult' | 'bidSuccess' | 'listingInfo';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  data?: {
    listingNo?: string;
    auctionId?: string;
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
  
  // 오래된 입찰 데이터 정리 (오늘 날짜가 아닌 것들)
  cleanOldBids: () => void;
  
  // 경매 결과 목록
  auctionResults: AuctionResult[];
  
  // 경매 결과 조회
  getAuctionResults: () => AuctionResult[];
  
  // 배송 거래처 매핑 (상장번호 -> 거래처ID)
  deliveryDealers: Record<string, string>;
  setDeliveryDealer: (listingNo: string, dealerId: string) => void;
  getDeliveryDealer: (listingNo: string) => string | undefined;
  
  // 빠른 재입찰 금액
  quickReBidAmount: number;
  setQuickReBidAmount: (amount: number) => void;
  
  // 차순위 알림
  isSecondBidNotificationOn: boolean;
  setIsSecondBidNotificationOn: (on: boolean) => void;
  
  // 경매 시작 알림
  isAuctionStartNotificationOn: boolean;
  setIsAuctionStartNotificationOn: (on: boolean) => void;
  
  // 일일 경매결과 알림
  isDailyResultNotificationOn: boolean;
  setIsDailyResultNotificationOn: (on: boolean) => void;
  
  // 상장 정보 알림
  isListingInfoNotificationOn: boolean;
  setIsListingInfoNotificationOn: (on: boolean) => void;
  
  // 다크 모드
  isDarkMode: boolean;
  setIsDarkMode: (on: boolean) => void;
  
  // 화면 꺼짐 방지
  isScreenAwakeOn: boolean;
  setIsScreenAwakeOn: (on: boolean) => void;
  
  // 관심(찜) 목록
  favorites: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  
  // 알림
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'time' | 'isRead'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAllNotifications: () => void;
  getUnreadCount: () => number;
}

export const useBidStore = create<BidStore>()(
  persist(
    (set, get) => ({
      // 매일 새로 생성되는 테스트 데이터 (최고순위 3개 + 차순위 12개)
      bids: generateDailyBids(),
      
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
      
      cleanOldBids: () => {
        const todayCode = getTodayDateCode();
        const currentBids = get().bids;
        const cleanedBids: Record<string, BidInfo> = {};
        
        // 올바른 상장번호 형식: YYMMDD-XXX-YY (6자리-3자리-2자리)
        // 개체번호는 101, 201, 301, 401 등으로 시작해야 함
        const isValidListingNo = (listingNo: string) => {
          const parts = listingNo.split('-');
          if (parts.length !== 3) return false;
          if (parts[0].length !== 6) return false;
          if (parts[1].length !== 3) return false;
          if (parts[2].length !== 2) return false;
          // 개체번호가 001 같은 잘못된 형식인지 확인
          const entityNo = parseInt(parts[1]);
          if (entityNo < 100) return false;
          return true;
        };
        
        // 오늘 날짜 + 올바른 형식의 입찰만 유지
        Object.entries(currentBids).forEach(([listingNo, bid]) => {
          if (listingNo.startsWith(todayCode) && isValidListingNo(listingNo)) {
            cleanedBids[listingNo] = bid;
          }
        });
        
        set({ bids: cleanedBids });
      },
      
      // 매일 새로 생성되는 경매 결과 데이터 (전일자 기준, 낙찰 15개 + 유찰 10개)
      auctionResults: generateDailyAuctionResults(),
      
      getAuctionResults: () => {
        return get().auctionResults;
      },
      
      // 배송 거래처 매핑
      deliveryDealers: {},
      setDeliveryDealer: (listingNo, dealerId) => {
        set((state) => ({
          deliveryDealers: {
            ...state.deliveryDealers,
            [listingNo]: dealerId
          }
        }));
      },
      getDeliveryDealer: (listingNo) => {
        return get().deliveryDealers[listingNo];
      },
      
      quickReBidAmount: 500,
      setQuickReBidAmount: (amount) => set({ quickReBidAmount: amount }),
      
      isSecondBidNotificationOn: false,
      setIsSecondBidNotificationOn: (on) => set({ isSecondBidNotificationOn: on }),
      
      isAuctionStartNotificationOn: true,
      setIsAuctionStartNotificationOn: (on) => set({ isAuctionStartNotificationOn: on }),
      
      isDailyResultNotificationOn: true,
      setIsDailyResultNotificationOn: (on) => set({ isDailyResultNotificationOn: on }),
      
      isListingInfoNotificationOn: true,
      setIsListingInfoNotificationOn: (on) => set({ isListingInfoNotificationOn: on }),
      
      isDarkMode: false,
      setIsDarkMode: (on) => set({ isDarkMode: on }),
      
      isScreenAwakeOn: false,
      setIsScreenAwakeOn: (on) => set({ isScreenAwakeOn: on }),
      
      favorites: [],
      toggleFavorite: (id) => {
        set((state) => {
          const isFav = state.favorites.includes(id);
          return {
            favorites: isFav 
              ? state.favorites.filter(f => f !== id)
              : [...state.favorites, id]
          };
        });
      },
      isFavorite: (id) => get().favorites.includes(id),
      
      notifications: [],
      addNotification: (notification) => {
        const now = new Date();
        const timeStr = `${now.getFullYear().toString().slice(2)}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const newNotification: Notification = {
          ...notification,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          time: timeStr,
          isRead: false,
        };
        set((state) => ({
          notifications: [newNotification, ...state.notifications]
        }));
      },
      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map(n => 
            n.id === id ? { ...n, isRead: true } : n
          )
        }));
      },
      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map(n => ({ ...n, isRead: true }))
        }));
      },
      deleteNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id)
        }));
      },
      clearAllNotifications: () => {
        set({ notifications: [] });
      },
      getUnreadCount: () => {
        return get().notifications.filter(n => !n.isRead).length;
      },
    }),
    {
      name: 'bid-storage-v19',
      onRehydrateStorage: () => (state) => {
        if (state) {
          // 오래된 입찰 데이터 정리
          state.cleanOldBids();
          
          // 오늘 날짜의 입찰 데이터가 없으면 새로 생성
          const todayCode = getTodayDateCode();
          const todayBids = Object.keys(state.bids).filter(key => key.startsWith(todayCode));
          
          if (todayBids.length === 0) {
            const dailyBids = generateDailyBids();
            Object.entries(dailyBids).forEach(([listingNo, bidInfo]) => {
              state.setBid(listingNo, bidInfo);
            });
          }
        }
      },
    }
  )
);

