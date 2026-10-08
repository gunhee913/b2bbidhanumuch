"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// 오늘 날짜 코드 (YYMMDD)
const getTodayDateCode = () => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
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
  status: "highest" | "secondHighest";
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
  result: "won" | "lost";
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

// ============== 개체별/부위별 연동을 위한 공통 데이터 ==============

// 부위별 최저단가 (auction/page.tsx의 partMinPrices와 동일)
const partMinPrices: Record<string, number> = {
  "등심(좌)": 85000,
  "등심(우)": 85000,
  안심: 95000,
  채끝: 82000,
  치마: 65000,
  부채: 60000,
  업진: 55000,
  "토시·제비": 70000,
  앞다리: 55000,
  우둔: 58000,
  목심: 62000,
  "양지(좌)": 52000,
  "양지(우)": 52000,
  "설도(좌)": 56000,
  "설도(우)": 56000,
  사태: 48000,
  꼬리: 35000,
  족: 25000,
  사골: 20000,
  잡뼈: 15000,
};

// 전체 부위 순서 (auction/page.tsx와 동일) - 상장번호 partNo 계산용
const allSubPartsOrder = [
  "등심(좌)",
  "등심(우)",
  "안심",
  "채끝",
  "치마",
  "부채",
  "업진",
  "토시·제비",
  "앞다리",
  "우둔",
  "목심",
  "양지(좌)",
  "양지(우)",
  "설도(좌)",
  "설도(우)",
  "사태",
  "꼬리",
  "족",
  "사골",
  "잡뼈",
];

// 개체 정보 (auction/page.tsx의 auctionEntities와 동일)
const auctionEntities: Array<{
  id: number;
  type: string;
  grade: string;
  gradeCategory: "1++" | "1+" | "1" | "2" | "3";
  company: string;
}> = [
  // 건화 (101~106)
  {
    id: 101,
    type: "한우거세",
    grade: "1++A(9)",
    gradeCategory: "1++",
    company: "건화",
  },
  {
    id: 102,
    type: "한우거세",
    grade: "1+A",
    gradeCategory: "1+",
    company: "건화",
  },
  {
    id: 103,
    type: "한우거세",
    grade: "1++B(8)",
    gradeCategory: "1++",
    company: "건화",
  },
  {
    id: 104,
    type: "한우거세",
    grade: "1B",
    gradeCategory: "1",
    company: "건화",
  },
  {
    id: 105,
    type: "한우거세",
    grade: "1++A(7)",
    gradeCategory: "1++",
    company: "건화",
  },
  {
    id: 106,
    type: "한우암",
    grade: "1+B",
    gradeCategory: "1+",
    company: "건화",
  },
  // 대진엠이스 (201~206)
  {
    id: 201,
    type: "한우거세",
    grade: "1++A(9)",
    gradeCategory: "1++",
    company: "대진엠이스",
  },
  {
    id: 202,
    type: "한우거세",
    grade: "1++A(8)",
    gradeCategory: "1++",
    company: "대진엠이스",
  },
  {
    id: 203,
    type: "한우거세",
    grade: "1+B",
    gradeCategory: "1+",
    company: "대진엠이스",
  },
  {
    id: 204,
    type: "한우거세",
    grade: "1A",
    gradeCategory: "1",
    company: "대진엠이스",
  },
  {
    id: 205,
    type: "한우거세",
    grade: "1++B(7)",
    gradeCategory: "1++",
    company: "대진엠이스",
  },
  {
    id: 206,
    type: "한우암",
    grade: "1+A",
    gradeCategory: "1+",
    company: "대진엠이스",
  },
  // 안심엘피시 (301~306)
  {
    id: 301,
    type: "한우거세",
    grade: "1++B(9)",
    gradeCategory: "1++",
    company: "안심엘피시",
  },
  {
    id: 302,
    type: "한우거세",
    grade: "1+A",
    gradeCategory: "1+",
    company: "안심엘피시",
  },
  {
    id: 303,
    type: "한우거세",
    grade: "1++A(8)",
    gradeCategory: "1++",
    company: "안심엘피시",
  },
  {
    id: 304,
    type: "한우거세",
    grade: "1B",
    gradeCategory: "1",
    company: "안심엘피시",
  },
  {
    id: 305,
    type: "한우거세",
    grade: "1++C(7)",
    gradeCategory: "1++",
    company: "안심엘피시",
  },
  {
    id: 306,
    type: "한우암",
    grade: "1+C",
    gradeCategory: "1+",
    company: "안심엘피시",
  },
  // 정직한고기 (401~406)
  {
    id: 401,
    type: "한우거세",
    grade: "1++C(9)",
    gradeCategory: "1++",
    company: "정직한고기",
  },
  {
    id: 402,
    type: "한우거세",
    grade: "1++C(8)",
    gradeCategory: "1++",
    company: "정직한고기",
  },
  {
    id: 403,
    type: "한우거세",
    grade: "1+C",
    gradeCategory: "1+",
    company: "정직한고기",
  },
  {
    id: 404,
    type: "한우거세",
    grade: "1C",
    gradeCategory: "1",
    company: "정직한고기",
  },
  {
    id: 405,
    type: "한우거세",
    grade: "1++A(7)",
    gradeCategory: "1++",
    company: "정직한고기",
  },
  {
    id: 406,
    type: "한우암",
    grade: "1+A",
    gradeCategory: "1+",
    company: "정직한고기",
  },
];

// 부위별 중량 범위 (auction/page.tsx와 동일)
const partWeightRanges: Record<string, [number, number]> = {
  "등심(좌)": [15, 16],
  "등심(우)": [15, 16],
  안심: [4, 5],
  채끝: [7.5, 8.5],
  치마: [3.5, 4.5],
  부채: [2.5, 3.5],
  업진: [4, 5],
  "토시·제비": [1.5, 2.5],
  앞다리: [24, 26],
  우둔: [20, 22],
  목심: [14, 15],
  "양지(좌)": [12, 13],
  "양지(우)": [12, 13],
  "설도(좌)": [16, 17.5],
  "설도(우)": [16, 17.5],
  사태: [14.5, 15.5],
  꼬리: [15.5, 16.5],
  족: [10, 11],
  사골: [3, 4],
  잡뼈: [21, 23],
};

// 등급 카테고리별 가격 배수 (auction/page.tsx와 동일한 로직)
const getGradeMultiplier = (gradeCategory: string, grade: string): number => {
  if (gradeCategory === "1++") {
    const marblingMatch = grade.match(/\((\d+)\)/);
    const marblingNo = marblingMatch ? parseInt(marblingMatch[1]) : 8;
    if (marblingNo === 9) return 1.2;
    if (marblingNo === 8) return 1.15;
    return 1.1;
  } else if (gradeCategory === "1+") {
    return 1.05;
  } else if (gradeCategory === "1") {
    return 1.0;
  } else if (gradeCategory === "2") {
    return 0.9;
  }
  return 0.8;
};

// 최저단가 계산 함수 (auction/page.tsx의 partProducts와 완전히 동일한 로직)
const calculateMinPrice = (
  partName: string,
  gradeCategory: string,
  grade: string,
): number => {
  const basePrice = partMinPrices[partName] || 50000;
  const gradeMultiplier = getGradeMultiplier(gradeCategory, grade);
  return Math.round((basePrice * gradeMultiplier) / 1000) * 1000;
};

// 중량 계산 함수 (auction/page.tsx의 partProducts와 완전히 동일한 로직)
const calculateWeight = (partName: string, entityId: number): string => {
  const [minW, maxW] = partWeightRanges[partName] || [10, 15];
  const variation = (entityId * 0.17) % 1;
  return (minW + (maxW - minW) * variation).toFixed(1);
};

// 상장번호 생성 함수 (auction/page.tsx의 partProducts와 완전히 동일한 로직)
const generateListingNo = (
  dateCode: string,
  entityId: number,
  partName: string,
): string => {
  const partIndex = allSubPartsOrder.indexOf(partName);
  const listingNumber = partIndex + 1;
  return `${dateCode}-${String(entityId).padStart(3, "0")}-${String(listingNumber).padStart(2, "0")}`;
};

// ============== 일일 입찰 데이터 생성 ==============
// 상장번호로 개체별/부위별 연동됨
const generateDailyBids = (): Record<string, BidInfo> => {
  const dateCode = getTodayDateCode();
  const dateStr = `${dateCode.slice(0, 2)}.${dateCode.slice(2, 4)}.${dateCode.slice(4, 6)}`;
  const seed = getDailySeed();

  const bids: Record<string, BidInfo> = {};

  // 차순위 입찰 타겟: 특정 개체의 특정 부위 (상장번호로 연동)
  const secondHighestTargets = [
    { entityId: 101, partName: "등심(우)" }, // 260127-101-02
    { entityId: 102, partName: "등심(좌)" }, // 260127-102-01
    { entityId: 102, partName: "등심(우)" }, // 260127-102-02
    { entityId: 103, partName: "등심(좌)" }, // 260127-103-01
    { entityId: 201, partName: "안심" }, // 260127-201-03
    { entityId: 202, partName: "채끝" }, // 260127-202-04
    { entityId: 301, partName: "치마" }, // 260127-301-05
    { entityId: 302, partName: "부채" }, // 260127-302-06
    { entityId: 401, partName: "목심" }, // 260127-401-10
    { entityId: 402, partName: "앞다리" }, // 260127-402-08
    { entityId: 403, partName: "우둔" }, // 260127-403-09
    { entityId: 404, partName: "설도(좌)" }, // 260127-404-13
  ];

  // 최고순위 입찰 타겟
  const highestTargets = [
    { entityId: 101, partName: "등심(좌)" }, // 260127-101-01 (부위별 등심 첫 행)
    { entityId: 201, partName: "등심(좌)" }, // 260127-201-01
    { entityId: 301, partName: "안심" }, // 260127-301-03
  ];

  // 차순위 입찰 생성
  secondHighestTargets.forEach((target, index) => {
    const entity = auctionEntities.find((e) => e.id === target.entityId);
    if (!entity) return;

    const itemSeed = seed + index * 137;
    const listingNo = generateListingNo(dateCode, entity.id, target.partName);
    const weight = calculateWeight(target.partName, entity.id);

    // 최저단가 계산 (개체의 등급 기준) - auction/page.tsx와 완전히 동일
    const minPrice = calculateMinPrice(
      target.partName,
      entity.gradeCategory,
      entity.grade,
    );

    // 최고입찰가 = 최저단가 + 3000~8000원
    const highestBid =
      minPrice + Math.floor(seededRandom(itemSeed + 5) * 5000) + 3000;
    // 내 입찰가 = 최고입찰가 - 2000~7000원
    const myBid =
      highestBid - Math.floor(seededRandom(itemSeed + 4) * 5000) - 2000;

    // 시간 생성
    const minuteOffset = Math.floor(seededRandom(itemSeed + 6) * 90);
    const hour = 9 + Math.floor(minuteOffset / 60);
    const minute = minuteOffset % 60;
    const timeStr = `${dateStr} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

    bids[listingNo] = {
      myBid,
      highestBid,
      status: "secondHighest" as const,
      time: timeStr,
      productInfo: {
        listingNo,
        partName: target.partName,
        weight: `${weight}kg`,
        type: entity.type,
        grade: entity.grade,
        price: minPrice,
      },
    };
  });

  // 최고순위 입찰 생성
  highestTargets.forEach((target, index) => {
    const entity = auctionEntities.find((e) => e.id === target.entityId);
    if (!entity) return;

    const itemSeed = seed + (index + 100) * 137;
    const listingNo = generateListingNo(dateCode, entity.id, target.partName);
    const weight = calculateWeight(target.partName, entity.id);

    // 최저단가 계산
    const minPrice = calculateMinPrice(
      target.partName,
      entity.gradeCategory,
      entity.grade,
    );

    // 최고입찰가 = 최저단가 + 5000~10000원
    const highestBid =
      minPrice + Math.floor(seededRandom(itemSeed + 5) * 5000) + 5000;
    const myBid = highestBid; // 최고순위이므로 내 입찰가 = 최고가

    // 시간 생성
    const minuteOffset = Math.floor(seededRandom(itemSeed + 6) * 30) + 30;
    const hour = 9 + Math.floor(minuteOffset / 60);
    const minute = minuteOffset % 60;
    const timeStr = `${dateStr} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

    bids[listingNo] = {
      myBid,
      highestBid,
      status: "highest" as const,
      time: timeStr,
      productInfo: {
        listingNo,
        partName: target.partName,
        weight: `${weight}kg`,
        type: entity.type,
        grade: entity.grade,
        price: minPrice,
      },
    };
  });

  return bids;
};

// 어제 날짜 코드 (YYMMDD)
const getYesterdayDateCode = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yy = String(yesterday.getFullYear()).slice(2);
  const mm = String(yesterday.getMonth() + 1).padStart(2, "0");
  const dd = String(yesterday.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
};

// 경매 결과 데이터 생성 함수 (1/26 고정)
const generateDailyAuctionResults = (): AuctionResult[] => {
  const dateCode = "260126"; // 1월 26일 고정
  const dateStr = "26.01.26";
  const seed = parseInt(dateCode, 10);

  // 낙찰 부위 목록 (15개)
  const wonParts = [
    { name: "등심(좌)", basePrice: 105000, weight: 15.2 },
    { name: "등심(우)", basePrice: 102000, weight: 15.5 },
    { name: "안심", basePrice: 135000, weight: 4.6 },
    { name: "치마", basePrice: 68000, weight: 4.2 },
    { name: "앞다리", basePrice: 58000, weight: 24.5 },
    { name: "등심(좌)", basePrice: 98000, weight: 14.2 },
    { name: "등심(우)", basePrice: 95000, weight: 14.5 },
    { name: "안심", basePrice: 125000, weight: 5.2 },
    { name: "부채", basePrice: 63000, weight: 3.1 },
    { name: "업진", basePrice: 57000, weight: 4.6 },
    { name: "채끝", basePrice: 72000, weight: 7.8 },
    { name: "앞다리", basePrice: 55000, weight: 22.5 },
    { name: "우둔", basePrice: 52000, weight: 18.2 },
    { name: "목심", basePrice: 58000, weight: 12.8 },
    { name: "양지(좌)", basePrice: 48000, weight: 13.5 },
  ];

  // 유찰 부위 목록 (10개)
  const lostParts = [
    { name: "등심(좌)", basePrice: 98000, weight: 14.8 },
    { name: "채끝", basePrice: 75000, weight: 8.2 },
    { name: "토시·제비", basePrice: 72000, weight: 2.0 },
    { name: "우둔", basePrice: 48000, weight: 20.1 },
    { name: "목심", basePrice: 52000, weight: 14.2 },
    { name: "양지(좌)", basePrice: 45000, weight: 12.5 },
    { name: "양지(우)", basePrice: 46000, weight: 12.8 },
    { name: "설도(좌)", basePrice: 42000, weight: 16.5 },
    { name: "설도(우)", basePrice: 43000, weight: 16.2 },
    { name: "사태", basePrice: 38000, weight: 15.0 },
  ];

  const grades = [
    "1++A(9)",
    "1++A(8)",
    "1++B(7)",
    "1+A",
    "1+B",
    "1A",
    "1B",
    "2A",
  ];
  const types = ["한우거세", "한우암"];

  const results: AuctionResult[] = [];

  // 낙찰 15개 생성
  wonParts.forEach((part, index) => {
    const itemSeed = seed + index * 97;
    const priceVariation = Math.floor(seededRandom(itemSeed) * 8000) - 4000;
    const weightVariation = seededRandom(itemSeed + 1) * 1.5 - 0.75;
    const gradeIndex = Math.floor(seededRandom(itemSeed + 2) * grades.length);
    const typeIndex = Math.floor(seededRandom(itemSeed + 3) * types.length);

    const myBid = part.basePrice + priceVariation;
    const weight = (part.weight + weightVariation).toFixed(1);

    // 시간 생성 (14:30 ~ 16:30 사이)
    const minuteOffset = Math.floor(seededRandom(itemSeed + 4) * 120);
    const baseMinutes = 14 * 60 + 30 + minuteOffset;
    const hour = Math.floor(baseMinutes / 60);
    const minute = baseMinutes % 60;
    const timeStr = `${dateStr} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

    const entityNo = 101 + index;
    const partNo = String(
      Math.floor(seededRandom(itemSeed + 5) * 12) + 1,
    ).padStart(2, "0");
    const listingNo = `${dateCode}-${entityNo}-${partNo}`;

    results.push({
      listingNo,
      result: "won" as const,
      myBid,
      winningBid: myBid,
      time: timeStr,
      productInfo: {
        partName: part.name,
        weight: `${weight}kg`,
        type: types[typeIndex],
        grade: grades[gradeIndex],
      },
    });
  });

  // 유찰 10개 생성
  lostParts.forEach((part, index) => {
    const itemSeed = seed + (index + 50) * 97;
    const priceVariation = Math.floor(seededRandom(itemSeed) * 6000) - 3000;
    const weightVariation = seededRandom(itemSeed + 1) * 1.5 - 0.75;
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
    const timeStr = `${dateStr} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

    const entityNo = 201 + index;
    const partNo = String(
      Math.floor(seededRandom(itemSeed + 5) * 12) + 1,
    ).padStart(2, "0");
    const listingNo = `${dateCode}-${entityNo}-${partNo}`;

    results.push({
      listingNo,
      result: "lost" as const,
      myBid,
      winningBid,
      time: timeStr,
      productInfo: {
        partName: part.name,
        weight: `${weight}kg`,
        type: types[typeIndex],
        grade: grades[gradeIndex],
      },
    });
  });

  return results;
};

// 앱 로드 시 즉시 잘못된 입찰 데이터 삭제 (스토어 생성 전에 실행)
if (typeof window !== "undefined") {
  // 모든 이전 버전 삭제
  [
    "bid-storage",
    "bid-storage-v2",
    "bid-storage-v3",
    "bid-storage-v4",
    "bid-storage-v5",
    "bid-storage-v6",
    "bid-storage-v7",
    "bid-storage-v8",
    "bid-storage-v9",
    "bid-storage-v10",
    "bid-storage-v11",
    "bid-storage-v12",
    "bid-storage-v13",
    "bid-storage-v14",
    "bid-storage-v15",
    "bid-storage-v16",
    "bid-storage-v17",
    "bid-storage-v18",
    "bid-storage-v19",
    "bid-storage-v20",
    "bid-storage-v21",
    "bid-storage-v22",
    "bid-storage-v23",
  ].forEach((key) => {
    localStorage.removeItem(key);
  });

  // 현재 버전에서 잘못된 데이터 정리
  const currentKey = "bid-storage-v24";
  const data = localStorage.getItem(currentKey);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (parsed.state?.bids) {
        const cleanedBids: Record<string, any> = {};
        Object.entries(parsed.state.bids).forEach(([listingNo, bid]) => {
          const parts = listingNo.split("-");
          // 올바른 형식: YYMMDD-XXX-YY (6자리-3자리-2자리), 개체번호 >= 100
          if (
            parts.length === 3 &&
            parts[0].length === 6 &&
            parts[1].length === 3 &&
            parts[2].length === 2 &&
            parseInt(parts[1]) >= 100
          ) {
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
type NotificationType =
  "auctionStart" | "secondBid" | "auctionResult" | "bidSuccess" | "listingInfo";

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

  // 입찰칸 ↑↓ · +/- 한 번에 움직일 금액 (원) · 사다리는 `BID_STEPS`
  bidStep: number;
  setBidStep: (step: number) => void;

  // 화면 꺼짐 방지
  isScreenAwakeOn: boolean;
  setIsScreenAwakeOn: (on: boolean) => void;

  // 관심(찜) 목록
  favorites: string[];
  favActiveDate: string | null;
  _favSyncInProgress: boolean;
  _favReloadTimer: ReturnType<typeof setTimeout> | null;
  toggleFavorite: (id: string) => void;
  clearFavorites: () => void;
  isFavorite: (id: string) => boolean;
  loadFavoritesFromServer: (activeDate: string) => Promise<void>;
  reloadFavoritesDebounced: () => void;
  setFavActiveDate: (date: string) => void;

  // 알림
  notifications: Notification[];
  addNotification: (
    notification: Omit<Notification, "id" | "time" | "isRead">,
  ) => void;
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
            [listingNo]: bidInfo,
          },
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
          const parts = listingNo.split("-");
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
            [listingNo]: dealerId,
          },
        }));
      },
      getDeliveryDealer: (listingNo) => {
        return get().deliveryDealers[listingNo];
      },

      quickReBidAmount: 500,
      setQuickReBidAmount: (amount) => set({ quickReBidAmount: amount }),

      isSecondBidNotificationOn: false,
      setIsSecondBidNotificationOn: (on) =>
        set({ isSecondBidNotificationOn: on }),

      isAuctionStartNotificationOn: true,
      setIsAuctionStartNotificationOn: (on) =>
        set({ isAuctionStartNotificationOn: on }),

      isDailyResultNotificationOn: true,
      setIsDailyResultNotificationOn: (on) =>
        set({ isDailyResultNotificationOn: on }),

      isListingInfoNotificationOn: true,
      setIsListingInfoNotificationOn: (on) =>
        set({ isListingInfoNotificationOn: on }),

      // 경매장 기본값은 어두운 화면 · 고기 색을 보는 화면이라 밝은 판이 눈에 부담이 된다
      isDarkMode: true,
      setIsDarkMode: (on) => set({ isDarkMode: on }),

      isScreenAwakeOn: false,
      setIsScreenAwakeOn: (on) => set({ isScreenAwakeOn: on }),

      /*
       * 기본 100원 · 경락단가가 천 원대로 갈리는 자리라 한 번에 100원이 가장 손에 맞는다.
       * 끝자리로 순위를 가르는 날에는 1원으로 내려 두고 쓰는 사람이 있어 고르게 열어 둔다.
       */
      bidStep: 100,
      setBidStep: (step) => set({ bidStep: step }),

      favorites: [],
      favActiveDate: null,
      _favSyncInProgress: false,
      _favReloadTimer: null as ReturnType<typeof setTimeout> | null,
      toggleFavorite: (id) => {
        const state = get();
        const isFav = state.favorites.includes(id);
        const newFavorites = isFav
          ? state.favorites.filter((f) => f !== id)
          : [...state.favorites, id];
        set({ favorites: newFavorites, _favSyncInProgress: true });

        const activeDate = state.favActiveDate;
        if (!activeDate) {
          set({ _favSyncInProgress: false });
          return;
        }

        const isPartId = id.split("-").length >= 3;
        const targetType = isPartId ? "part" : "listing";
        const method = isFav ? "DELETE" : "POST";

        fetch("/api/dealer-favorites", {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activeDate, targetType, targetId: id }),
        })
          .then((res) => {
            if (!res.ok) throw new Error("API error");
            set({ _favSyncInProgress: false });
          })
          .catch(() => {
            if (isFav) {
              set((s) => ({
                favorites: [...s.favorites, id],
                _favSyncInProgress: false,
              }));
            } else {
              set((s) => ({
                favorites: s.favorites.filter((f) => f !== id),
                _favSyncInProgress: false,
              }));
            }
          });
      },
      /**
       * 그날 찍어 둔 관심을 통째로 비운다 · 서버에도 한 번만 부른다.
       *
       * 실패하면 되돌리되 **그 사이 새로 찍은 것은 지킨다**. 왕복하는 동안에도 별은
       * 눌릴 수 있어서, 비우기 전 목록으로 통째로 덮으면 방금 찍은 것이 조용히
       * 사라진다 (`toggleFavorite` 의 되돌리기가 한 건만 손대는 것과 같은 뜻).
       */
      clearFavorites: () => {
        const state = get();
        const removed = state.favorites;
        if (removed.length === 0) return;

        const activeDate = state.favActiveDate;
        if (!activeDate) {
          set({ favorites: [] });
          return;
        }

        set({ favorites: [], _favSyncInProgress: true });

        fetch("/api/dealer-favorites", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activeDate, all: true }),
        })
          .then((res) => {
            if (!res.ok) throw new Error("API error");
            set({ _favSyncInProgress: false });
          })
          .catch(() => {
            set((s) => ({
              favorites: [...new Set([...removed, ...s.favorites])],
              _favSyncInProgress: false,
            }));
          });
      },
      isFavorite: (id) => get().favorites.includes(id),
      setFavActiveDate: (date) => set({ favActiveDate: date }),
      loadFavoritesFromServer: async (activeDate) => {
        try {
          set({ favActiveDate: activeDate });
          if (get()._favSyncInProgress) return;
          const res = await fetch(
            `/api/dealer-favorites?activeDate=${activeDate}`,
          );
          if (!res.ok) return;
          const data = await res.json();
          const listings: string[] = data.listings || [];
          const parts: string[] = data.parts || [];
          set({ favorites: [...listings, ...parts] });
        } catch {
          // keep existing local state on error
        }
      },
      reloadFavoritesDebounced: () => {
        const state = get();
        if (state._favReloadTimer) clearTimeout(state._favReloadTimer);
        const timer = setTimeout(() => {
          const date = get().favActiveDate;
          if (date && !get()._favSyncInProgress) {
            get().loadFavoritesFromServer(date);
          }
        }, 500);
        set({ _favReloadTimer: timer });
      },

      notifications: [],
      addNotification: (notification) => {
        const now = new Date();
        const timeStr = `${now.getFullYear().toString().slice(2)}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        const newNotification: Notification = {
          ...notification,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          time: timeStr,
          isRead: false,
        };
        set((state) => ({
          notifications: [newNotification, ...state.notifications],
        }));
      },
      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, isRead: true } : n,
          ),
        }));
      },
      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({
            ...n,
            isRead: true,
          })),
        }));
      },
      deleteNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },
      clearAllNotifications: () => {
        set({ notifications: [] });
      },
      getUnreadCount: () => {
        return get().notifications.filter((n) => !n.isRead).length;
      },
    }),
    {
      name: "bid-storage-v24",
      version: 1,
      /*
       * v0 → v1 · 기본값을 어두운 화면으로 바꿨다.
       *
       * 저장소에는 예전 기본값(`false`)이 이미 박혀 있어서, 기본값만 바꾸면 한 번이라도
       * 들어와 본 사람에게는 영영 닿지 않는다. 그래서 이 항목만 한 번 되돌린다 —
       * 나머지 설정(입찰 내역·알림·즐겨찾기)은 그대로 둔다.
       */
      migrate: (persisted, version) => {
        if (version < 1 && persisted && typeof persisted === "object") {
          return {
            ...(persisted as Record<string, unknown>),
            isDarkMode: true,
          };
        }
        return persisted;
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          // 오래된 입찰 데이터 정리
          state.cleanOldBids();

          // 테스트 입찰 데이터 항상 새로 덮어쓰기 (상장번호 연동 보장)
          const dailyBids = generateDailyBids();
          Object.entries(dailyBids).forEach(([listingNo, bidInfo]) => {
            state.setBid(listingNo, bidInfo);
          });
        }
      },
    },
  ),
);
