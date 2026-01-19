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

// 오늘 날짜를 YYMMDD 형식으로 반환
export const getTodayDateCode = () => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
};

// 오늘 날짜를 YYYY.MM.DD.(요일) 형식으로 반환
export const getTodayDateFormatted = () => {
  const now = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const day = days[now.getDay()];
  return `${yyyy}.${mm}.${dd}.(${day})`;
};

// 어제 날짜를 YYYY.MM.DD.(요일) 형식으로 반환 (도축일자용)
export const getYesterdayDateFormatted = () => {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const day = days[now.getDay()];
  return `${yyyy}.${mm}.${dd}.(${day})`;
};

// 오늘 날짜와 시간을 YY.MM.DD.(요일) HH:MM 형식으로 반환 (입찰시간용)
export const getTodayTimeFormatted = (hoursOffset = 0, minutesOffset = 0) => {
  const now = new Date();
  now.setHours(now.getHours() - hoursOffset);
  now.setMinutes(now.getMinutes() - minutesOffset);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const day = days[now.getDay()];
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${yy}.${mm}.${dd}.(${day}) ${hh}:${min}`;
};

// 14두 경매 상품 데이터 생성 함수
// 근내지방도: 7,8,9 = 1++등급에만 표시
const createAuctionProducts = (): AuctionProduct[] => {
  const dateCode = getTodayDateCode();
  const slaughterDate = getYesterdayDateFormatted();
  
  return [
    // 건화 - 3두 (거세 2, 암 1)
    { id: 1, image: '/등심1.png', type: '한우거세', grade: '1++A(9)', gradeCategory: '1++', auctionNo: `${dateCode}-001`, historyNo: '002-1486-7293-1', company: '건화', date: slaughterDate },
    { id: 2, image: '/등심2.png', type: '한우거세', grade: '1+A', gradeCategory: '1+', auctionNo: `${dateCode}-002`, historyNo: '002-1486-7293-2', company: '건화', date: slaughterDate },
    { id: 3, image: '/등심3.png', type: '한우암', grade: '1+B', gradeCategory: '1+', auctionNo: `${dateCode}-003`, historyNo: '002-1486-7293-3', company: '건화', date: slaughterDate },
    
    // 대진엠에스 - 4두 (거세 2, 암 2)
    { id: 4, image: '/등심4.png', type: '한우거세', grade: '1++B(8)', gradeCategory: '1++', auctionNo: `${dateCode}-004`, historyNo: '002-1486-7293-4', company: '대진엠에스', date: slaughterDate },
    { id: 5, image: '/등심1.png', type: '한우거세', grade: '1+A', gradeCategory: '1+', auctionNo: `${dateCode}-005`, historyNo: '002-1486-7293-5', company: '대진엠에스', date: slaughterDate },
    { id: 6, image: '/등심2.png', type: '한우암', grade: '1++A(7)', gradeCategory: '1++', auctionNo: `${dateCode}-006`, historyNo: '002-1486-7293-6', company: '대진엠에스', date: slaughterDate },
    { id: 7, image: '/등심3.png', type: '한우암', grade: '1+B', gradeCategory: '1+', auctionNo: `${dateCode}-007`, historyNo: '002-1486-7293-7', company: '대진엠에스', date: slaughterDate },
    
    // 안심엘피씨 - 4두 (거세 2, 암 2)
    { id: 8, image: '/등심4.png', type: '한우거세', grade: '1+A', gradeCategory: '1+', auctionNo: `${dateCode}-008`, historyNo: '002-1486-7293-8', company: '안심엘피씨', date: slaughterDate },
    { id: 9, image: '/등심1.png', type: '한우거세', grade: '1A', gradeCategory: '1', auctionNo: `${dateCode}-009`, historyNo: '002-1486-7293-9', company: '안심엘피씨', date: slaughterDate },
    { id: 10, image: '/등심2.png', type: '한우암', grade: '1B', gradeCategory: '1', auctionNo: `${dateCode}-010`, historyNo: '002-1486-7293-10', company: '안심엘피씨', date: slaughterDate },
    { id: 11, image: '/등심3.png', type: '한우암', grade: '1+A', gradeCategory: '1+', auctionNo: `${dateCode}-011`, historyNo: '002-1486-7293-11', company: '안심엘피씨', date: slaughterDate },
    
    // 정직한고기 - 3두 (거세 2, 암 1)
    { id: 12, image: '/등심4.png', type: '한우거세', grade: '1A', gradeCategory: '1', auctionNo: `${dateCode}-012`, historyNo: '002-1486-7293-12', company: '정직한고기', date: slaughterDate },
    { id: 13, image: '/등심1.png', type: '한우거세', grade: '2A', gradeCategory: '2', auctionNo: `${dateCode}-013`, historyNo: '002-1486-7293-13', company: '정직한고기', date: slaughterDate },
    { id: 14, image: '/등심2.png', type: '한우암', grade: '2B', gradeCategory: '2', auctionNo: `${dateCode}-014`, historyNo: '002-1486-7293-14', company: '정직한고기', date: slaughterDate },
  ];
};

export const AUCTION_PRODUCTS: AuctionProduct[] = createAuctionProducts();

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
