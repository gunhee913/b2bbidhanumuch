// 경매 상품 데이터 (14두)
// 업체명, 등급, 성별 연동용 공통 상수

export type GenderType = '한우거세' | '한우암';
export type GradeCategory = '1++' | '1+' | '1' | '2';

export interface AuctionProduct {
  id: number;
  image: string;
  type: GenderType;
  grade: string;
  gradeCategory: GradeCategory;
  auctionNo: string;
  historyNo: string;
  company: string;
  date: string;
}

// 14두 경매 상품 데이터
// 근내지방도: 7,8,9 = 1++등급에만 표시
export const AUCTION_PRODUCTS: AuctionProduct[] = [
  // 건화 - 3두 (거세 2, 암 1)
  { id: 1, image: '/등심1.png', type: '한우거세', grade: '1++A(9)', gradeCategory: '1++', auctionNo: '250806-001', historyNo: '002-1486-7293-1', company: '건화', date: '2025.08.05.(화)' },
  { id: 2, image: '/등심2.png', type: '한우거세', grade: '1+A', gradeCategory: '1+', auctionNo: '250806-002', historyNo: '002-1486-7293-2', company: '건화', date: '2025.08.05.(화)' },
  { id: 3, image: '/등심3.png', type: '한우암', grade: '1+B', gradeCategory: '1+', auctionNo: '250806-003', historyNo: '002-1486-7293-3', company: '건화', date: '2025.08.05.(화)' },
  
  // 대진엠에스 - 4두 (거세 2, 암 2)
  { id: 4, image: '/등심4.png', type: '한우거세', grade: '1++B(8)', gradeCategory: '1++', auctionNo: '250806-004', historyNo: '002-1486-7293-4', company: '대진엠에스', date: '2025.08.05.(화)' },
  { id: 5, image: '/등심1.png', type: '한우거세', grade: '1+A', gradeCategory: '1+', auctionNo: '250806-005', historyNo: '002-1486-7293-5', company: '대진엠에스', date: '2025.08.05.(화)' },
  { id: 6, image: '/등심2.png', type: '한우암', grade: '1++A(7)', gradeCategory: '1++', auctionNo: '250806-006', historyNo: '002-1486-7293-6', company: '대진엠에스', date: '2025.08.05.(화)' },
  { id: 7, image: '/등심3.png', type: '한우암', grade: '1+B', gradeCategory: '1+', auctionNo: '250806-007', historyNo: '002-1486-7293-7', company: '대진엠에스', date: '2025.08.05.(화)' },
  
  // 안심엘피씨 - 4두 (거세 2, 암 2)
  { id: 8, image: '/등심4.png', type: '한우거세', grade: '1+A', gradeCategory: '1+', auctionNo: '250806-008', historyNo: '002-1486-7293-8', company: '안심엘피씨', date: '2025.08.05.(화)' },
  { id: 9, image: '/등심1.png', type: '한우거세', grade: '1A', gradeCategory: '1', auctionNo: '250806-009', historyNo: '002-1486-7293-9', company: '안심엘피씨', date: '2025.08.05.(화)' },
  { id: 10, image: '/등심2.png', type: '한우암', grade: '1B', gradeCategory: '1', auctionNo: '250806-010', historyNo: '002-1486-7293-10', company: '안심엘피씨', date: '2025.08.05.(화)' },
  { id: 11, image: '/등심3.png', type: '한우암', grade: '1+A', gradeCategory: '1+', auctionNo: '250806-011', historyNo: '002-1486-7293-11', company: '안심엘피씨', date: '2025.08.05.(화)' },
  
  // 정직한고기 - 3두 (거세 2, 암 1)
  { id: 12, image: '/등심4.png', type: '한우거세', grade: '1A', gradeCategory: '1', auctionNo: '250806-012', historyNo: '002-1486-7293-12', company: '정직한고기', date: '2025.08.05.(화)' },
  { id: 13, image: '/등심1.png', type: '한우거세', grade: '2A', gradeCategory: '2', auctionNo: '250806-013', historyNo: '002-1486-7293-13', company: '정직한고기', date: '2025.08.05.(화)' },
  { id: 14, image: '/등심2.png', type: '한우암', grade: '2B', gradeCategory: '2', auctionNo: '250806-014', historyNo: '002-1486-7293-14', company: '정직한고기', date: '2025.08.05.(화)' },
];

// 업체 목록
export const COMPANIES = ['건화', '대진엠에스', '안심엘피씨', '정직한고기'] as const;

// 등급 목록
export const GRADES = ['1++', '1+', '1', '2'] as const;

export type GradeCount = Record<GradeCategory, number>;

export interface CompanyAuctionSummary {
  name: string;
  steer: GradeCount;
  cow: GradeCount;
}

// 경매 상품 데이터에서 업체별 두수 현황 계산
export const getCompanyAuctionSummary = (): CompanyAuctionSummary[] => {
  const summary: CompanyAuctionSummary[] = COMPANIES.map(company => ({
    name: company,
    steer: { '1++': 0, '1+': 0, '1': 0, '2': 0 },
    cow: { '1++': 0, '1+': 0, '1': 0, '2': 0 },
  }));

  AUCTION_PRODUCTS.forEach(product => {
    const companySummary = summary.find(s => s.name === product.company);
    if (companySummary) {
      if (product.type === '한우거세') {
        companySummary.steer[product.gradeCategory]++;
      } else {
        companySummary.cow[product.gradeCategory]++;
      }
    }
  });

  return summary;
};

// 등급별 두수 합계 계산
export const calcTotal = (grades: GradeCount) => 
  Object.values(grades).reduce((sum, count) => sum + count, 0);
