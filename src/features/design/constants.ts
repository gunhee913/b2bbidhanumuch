export interface FontCandidate {
  id: string;
  name: string;
  /** 한 줄 성격 · 왜 후보인지 */
  note: string;
  /** `layout.tsx` 가 등록한 CSS 변수 */
  cssVar: string;
  license: string;
  /** 가변 woff2 용량 (MB) · 첫 화면 비용 */
  weightMb: number;
}

export const FONT_CANDIDATES: readonly FontCandidate[] = [
  {
    id: "pretendard",
    name: "Pretendard",
    note: "지금 쓰는 글꼴 · Inter 계열 · 중립적이고 한글 자폭이 좁다",
    cssVar: "--font-pretendard",
    license: "OFL",
    weightMb: 2.0,
  },
  {
    id: "wanted",
    name: "Wanted Sans",
    note: "원티드랩 · 지오메트릭 · x-height 가 크고 기본 자간이 조여 있다",
    cssVar: "--font-wanted",
    license: "OFL",
    weightMb: 1.2,
  },
] as const;

/** 견본 표 한 행 · 상장표(부위별) 와 같은 열 구성 */
export interface SpecimenRow {
  listingNo: string;
  part: string;
  grade: string;
  weight: string;
  minPrice: string;
  myBid: string;
  /** 낙찰가 대비 등락 · 상승(+)은 빨강, 하락(−)은 파랑 */
  change: string;
}

/** 실제 상장 데이터 결 · 값 길이가 들쭉날쭉해야 자폭 차이가 드러난다 */
export const SPECIMEN_ROWS: readonly SpecimenRow[] = [
  {
    listingNo: "260929-101-01",
    part: "등심(좌)",
    grade: "1++A(9)",
    weight: "12.4kg",
    minPrice: "92,000",
    myBid: "97,300",
    change: "+5.76%",
  },
  {
    listingNo: "260929-101-02",
    part: "등심(우)",
    grade: "1++A(9)",
    weight: "10.1kg",
    minPrice: "92,000",
    myBid: "95,000",
    change: "+3.26%",
  },
  {
    listingNo: "260929-104-07",
    part: "안심",
    grade: "1+B",
    weight: "4.8kg",
    minPrice: "118,000",
    myBid: "119,400",
    change: "+1.19%",
  },
  {
    listingNo: "260929-107-03",
    part: "채끝",
    grade: "1++A(8)",
    weight: "7.2kg",
    minPrice: "84,500",
    myBid: "83,000",
    change: "-1.78%",
  },
  {
    listingNo: "260929-112-11",
    part: "토시·제비",
    grade: "2C",
    weight: "1.9kg",
    minPrice: "36,000",
    myBid: "36,000",
    change: "0.00%",
  },
  {
    listingNo: "260929-118-05",
    part: "앞다리",
    grade: "1A",
    weight: "23.7kg",
    minPrice: "21,800",
    myBid: "20,400",
    change: "-6.42%",
  },
  {
    listingNo: "260929-121-09",
    part: "설도",
    grade: "1+A",
    weight: "31.2kg",
    minPrice: "19,500",
    myBid: "19,900",
    change: "+2.05%",
  },
  {
    listingNo: "260929-125-02",
    part: "사골",
    grade: "3C",
    weight: "8.0kg",
    minPrice: "4,200",
    myBid: "4,200",
    change: "0.00%",
  },
] as const;
