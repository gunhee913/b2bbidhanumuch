// 중도매인 기본 정보
export const DEALERS = [
  { no: '7000001', name: '김철수', phone: '010-1234-5678' },
  { no: '7000002', name: '이영희', phone: '010-2345-6789' },
  { no: '7000003', name: '박민수', phone: '010-3456-7890' },
  { no: '7000004', name: '최지현', phone: '010-4567-8901' },
  { no: '7000005', name: '정대호', phone: '010-5678-9012' },
];

// 19개 부위 (부위번호 01~19 순서)
export const PART_NAMES = [
  '등심(좌)', '등심(우)', '안심', '채끝', '갈비(좌)', '갈비(우)',
  '특수부위', '설도(좌)', '설도(우)', '앞다리', '우둔', '목심', 
  '양지(좌)', '양지(우)', '사태', '꼬리', '족', '사골', '잡뼈'
];

// 부위명 -> 부위번호 매핑
export const PART_NUMBER_MAP: Record<string, string> = {
  '등심(좌)': '01', '등심(우)': '02', '안심': '03', '채끝': '04',
  '갈비(좌)': '05', '갈비(우)': '06', '특수부위': '07',
  '설도(좌)': '08', '설도(우)': '09', '앞다리': '10', '우둔': '11', '목심': '12',
  '양지(좌)': '13', '양지(우)': '14', '사태': '15', '꼬리': '16', 
  '족': '17', '사골': '18', '잡뼈': '19'
};

// 부위별 기본 단가
export const PART_PRICES: Record<string, number> = {
  '등심(좌)': 85000, '등심(우)': 85000, '안심': 95000, '채끝': 82000,
  '갈비(좌)': 78000, '갈비(우)': 78000, '특수부위': 72000, '앞다리': 55000,
  '우둔': 58000, '목심': 62000, '양지(좌)': 52000, '양지(우)': 52000,
  '설도(좌)': 56000, '설도(우)': 56000, '사태': 48000, '꼬리': 35000,
  '족': 25000, '사골': 20000, '잡뼈': 15000
};

// 부위별 기본 중량
export const PART_WEIGHTS: Record<string, number> = {
  '등심(좌)': 15.5, '등심(우)': 15.5, '안심': 4.5, '채끝': 8.0,
  '갈비(좌)': 12.5, '갈비(우)': 12.5, '특수부위': 3.5, '앞다리': 25.0,
  '우둔': 21.0, '목심': 14.5, '양지(좌)': 12.5, '양지(우)': 12.5,
  '설도(좌)': 16.5, '설도(우)': 16.5, '사태': 15.0, '꼬리': 16.0,
  '족': 10.5, '사골': 3.5, '잡뼈': 22.0
};

// 상장업체
export const COMPANIES = ['건화', '대진엠에스', '안심엘피씨', '정직한고기'];

// 등급
export const GRADES = ['1++A', '1++B', '1++C', '1+A', '1+B', '1+C', '1A', '1B', '1C', '2A', '2B', '2C'];

// 부위 상세 타입
export interface BidPartDetail {
  listingNo: string;
  partName: string;
  companyName: string;
  grade: string;
  weight: number;
  unitPrice: number;
  amount: number;
}

// 중도매인 정산 타입
export interface DealerSettlementData {
  id: string;
  dealerNo: string;
  dealerName: string;
  phone: string;
  bidParts: BidPartDetail[];
  totalWeight: number;
  totalAmount: number;
  commission: number;
  netPayment: number;
}

// 고정된 날짜 코드 (데이터 일관성을 위해)
const FIXED_DATE_CODE = '260121';

// 전역 상장번호 카운터 (중복 방지)
let globalListingCounter = 0;

// 중도매인별 낙찰 데이터 생성 (고정된 결과를 위해 결정론적 로직 사용)
export const generateDealerSettlements = (): DealerSettlementData[] => {
  // 카운터 초기화
  globalListingCounter = 0;
  
  return DEALERS.map((dealer, dealerIdx) => {
    const bidParts: BidPartDetail[] = [];
    
    // 각 중도매인당 30~50개 부위 낙찰
    const partCount = 30 + (dealerIdx * 5) % 21;
    
    for (let i = 0; i < partCount; i++) {
      const partIdx = (dealerIdx * 7 + i * 3) % 19;
      const partName = PART_NAMES[partIdx];
      const companyIdx = (dealerIdx + i) % 4;
      // 등급을 더 다양하게 섞기 (A, B, C 골고루)
      const gradeIdx = (dealerIdx * 7 + i * 11 + partIdx * 3) % GRADES.length;
      
      // 개체번호: 업체별로 100번대 시작 (건화:101~, 대진:201~, 안심:301~, 정직:401~)
      const cattleNo = 100 * (companyIdx + 1) + Math.floor(globalListingCounter / 19) + 1;
      // 부위번호: 부위명에 따라 고정된 번호 (01~19)
      const partNo = PART_NUMBER_MAP[partName];
      globalListingCounter++;
      
      const baseWeight = PART_WEIGHTS[partName];
      const weightVariation = ((dealerIdx * 5 + i * 2) % 20 - 10) / 10;
      const weight = Number((baseWeight + weightVariation).toFixed(1));
      
      const basePrice = PART_PRICES[partName];
      // 등급별 기본 배수 (1++(9)가 가장 비쌈)
      const gradeMultipliers: Record<string, number> = {
        '1++A': 1.25, // 1++(9) - 최고급
        '1++B': 1.20, // 1++(8)
        '1++C': 1.15, // 1++(7)
        '1+A': 1.05,  // 1+
        '1+B': 1.03,
        '1+C': 1.00,
        '1A': 0.90,   // 1등급
        '1B': 0.88,
        '1C': 0.85,
        '2A': 0.75,   // 2등급
        '2B': 0.72,
        '2C': 0.70,
      };
      const gradeMultiplier = gradeMultipliers[GRADES[gradeIdx]] || 1.0;
      // 가격 변동 추가 (딜러/부위/인덱스별로 다른 변동)
      const priceVariation = 1 + ((dealerIdx * 17 + i * 23 + partIdx * 7) % 160 - 80) / 1000; // ±8% 변동
      const randomFactor = 1 + ((dealerIdx * 31 + i * 13) % 80 - 40) / 500; // 추가 ±8% 변동
      const unitPrice = Math.round(basePrice * gradeMultiplier * priceVariation * randomFactor);
      const amount = Math.round(weight * unitPrice);

      bidParts.push({
        listingNo: `${FIXED_DATE_CODE}-${cattleNo}-${partNo}`,
        partName,
        companyName: COMPANIES[companyIdx],
        grade: GRADES[gradeIdx],
        weight,
        unitPrice,
        amount,
      });
    }

    // 상장번호 중간 숫자(개체번호) 기준으로 정렬 (101 -> 102 -> 201 -> 202 순)
    const sortedBidParts = [...bidParts].sort((a, b) => {
      const aCattleNo = parseInt(a.listingNo.split('-')[1]);
      const bCattleNo = parseInt(b.listingNo.split('-')[1]);
      if (aCattleNo !== bCattleNo) {
        return aCattleNo - bCattleNo;
      }
      // 같은 개체번호면 부위번호로 정렬
      const aPartNo = parseInt(a.listingNo.split('-')[2]);
      const bPartNo = parseInt(b.listingNo.split('-')[2]);
      return aPartNo - bPartNo;
    });

    const totalWeight = Number(sortedBidParts.reduce((sum, p) => sum + p.weight, 0).toFixed(1));
    const totalAmount = sortedBidParts.reduce((sum, p) => sum + p.amount, 0);
    const commission = 0; // 중도매인 수수료 없음
    const netPayment = totalAmount; // 수수료 공제 없이 전액

    return {
      id: dealer.no,
      dealerNo: dealer.no,
      dealerName: dealer.name,
      phone: dealer.phone,
      bidParts: sortedBidParts,
      totalWeight,
      totalAmount,
      commission,
      netPayment,
    };
  });
};

// 중도매인별 낙찰금액 (잔액현황에서 사용)
export const getDealerNetPayments = (): Record<string, number> => {
  const settlements = generateDealerSettlements();
  const result: Record<string, number> = {};
  settlements.forEach(s => {
    result[s.dealerNo] = s.netPayment;
  });
  return result;
};
