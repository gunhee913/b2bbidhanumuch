// 부분육 상장 관련 타입 정의

// DB Row 타입 - cattle_listings
export interface CattleListingRow {
  id: string;
  listing_no: string;
  listing_date: string;
  company_id: string;
  breed: string;
  gender: string;
  grade: string;
  marbling_score: number | null;
  month_age: number | null;
  trace_no: string | null;
  slaughter_house: string | null;
  slaughter_date: string | null;
  slaughter_no: string | null;
  carcass_weight: number | null;
  back_fat: number | null;
  eye_muscle: number | null;
  meat_color: number | null;
  fat_color: number | null;
  texture: number | null;
  maturity: number | null;
  process_date: string | null;
  process_weight: number | null;
  slaughter_cert: CertificateData | null;
  grade_cert: CertificateData | null;
  images: string[];
  status: ListingStatus;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// DB Row 타입 - cattle_parts
export interface CattlePartRow {
  id: string;
  listing_id: string;
  part_no: number;
  part_name: string;
  listing_part_no: string | null;
  weight: number | null;
  min_price: number | null;
  is_included: boolean;
  bid_price: number | null;
  bid_amount: number | null;
  winning_dealer_id: string | null;
  bid_at: string | null;
  created_at: string;
  updated_at: string;
}

// 증명서 데이터
export interface CertificateData {
  fileName: string;
  fileData: string;
  fileType: string;
}

// 상장 상태
export type ListingStatus = 'pending' | 'approved' | 'auction' | 'completed' | 'cancelled';

// 프론트엔드용 타입 - 개체 상장
export interface CattleListing {
  id: string;
  listingNo: string;
  listingDate: string;
  companyId: string;
  companyName?: string; // JOIN 시 포함
  breed: string;
  gender: string;
  grade: string;
  marblingScore: number | null;
  monthAge: number | null;
  traceNo: string | null;
  slaughterHouse: string | null;
  slaughterDate: string | null;
  slaughterNo: string | null;
  carcassWeight: number | null;
  backFat: number | null;
  eyeMuscle: number | null;
  meatColor: number | null;
  fatColor: number | null;
  texture: number | null;
  maturity: number | null;
  processDate: string | null;
  processWeight: number | null;
  slaughterCert: CertificateData | null;
  gradeCert: CertificateData | null;
  images: string[];
  status: ListingStatus;
  approvedAt: string | null;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  parts?: CattlePart[]; // 부위 정보 포함 시
}

// 프론트엔드용 타입 - 부위
export interface CattlePart {
  id: string;
  listingId: string;
  partNo: number;
  partName: string;
  listingPartNo: string | null;
  weight: number | null;
  minPrice: number | null;
  isIncluded: boolean;
  bidPrice: number | null;
  bidAmount: number | null;
  winningDealerId: string | null;
  winningDealerName?: string; // JOIN 시 포함
  bidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// 상장 등록 입력 타입
export interface CreateListingInput {
  listingDate: string;
  companyId: string;
  breed?: string;
  gender: string;
  grade: string;
  marblingScore?: number;
  monthAge?: number;
  traceNo?: string;
  slaughterHouse?: string;
  slaughterDate?: string;
  slaughterNo?: string;
  carcassWeight?: number;
  backFat?: number;
  eyeMuscle?: number;
  meatColor?: number;
  fatColor?: number;
  texture?: number;
  maturity?: number;
  processDate?: string;
  processWeight?: number;
  slaughterCert?: CertificateData;
  gradeCert?: CertificateData;
  images?: string[];
  parts: CreatePartInput[];
  createdBy?: string;
}

// 부위 등록 입력 타입
export interface CreatePartInput {
  partNo: number;
  partName: string;
  weight?: number;
  minPrice?: number;
  isIncluded?: boolean;
}

// 상장 수정 입력 타입
export interface UpdateListingInput {
  breed?: string;
  gender?: string;
  grade?: string;
  marblingScore?: number;
  monthAge?: number;
  traceNo?: string;
  slaughterHouse?: string;
  slaughterDate?: string;
  slaughterNo?: string;
  carcassWeight?: number;
  backFat?: number;
  eyeMuscle?: number;
  meatColor?: number;
  fatColor?: number;
  texture?: number;
  maturity?: number;
  processDate?: string;
  processWeight?: number;
  slaughterCert?: CertificateData;
  gradeCert?: CertificateData;
  images?: string[];
  status?: ListingStatus;
}

// 부위 수정 입력 타입
export interface UpdatePartInput {
  weight?: number;
  minPrice?: number;
  isIncluded?: boolean;
}

// 상장 목록 필터
export interface ListingFilter {
  companyId?: string;
  status?: ListingStatus;
  listingDateFrom?: string;
  listingDateTo?: string;
  search?: string; // 접수번호, 이력번호 검색
}

// Row -> 프론트엔드 타입 변환
export function toFrontendListing(row: CattleListingRow): CattleListing {
  return {
    id: row.id,
    listingNo: row.listing_no,
    listingDate: row.listing_date,
    companyId: row.company_id,
    breed: row.breed,
    gender: row.gender,
    grade: row.grade,
    marblingScore: row.marbling_score,
    monthAge: row.month_age,
    traceNo: row.trace_no,
    slaughterHouse: row.slaughter_house,
    slaughterDate: row.slaughter_date,
    slaughterNo: row.slaughter_no,
    carcassWeight: row.carcass_weight,
    backFat: row.back_fat,
    eyeMuscle: row.eye_muscle,
    meatColor: row.meat_color,
    fatColor: row.fat_color,
    texture: row.texture,
    maturity: row.maturity,
    processDate: row.process_date,
    processWeight: row.process_weight,
    slaughterCert: row.slaughter_cert,
    gradeCert: row.grade_cert,
    images: row.images || [],
    status: row.status,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  };
}

export function toFrontendPart(row: CattlePartRow): CattlePart {
  return {
    id: row.id,
    listingId: row.listing_id,
    partNo: row.part_no,
    partName: row.part_name,
    listingPartNo: row.listing_part_no,
    weight: row.weight,
    minPrice: row.min_price,
    isIncluded: row.is_included,
    bidPrice: row.bid_price,
    bidAmount: row.bid_amount,
    winningDealerId: row.winning_dealer_id,
    bidAt: row.bid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// 19개 기본 부위 목록
export const DEFAULT_PARTS: { partNo: number; partName: string }[] = [
  { partNo: 1, partName: '등심(좌)' },
  { partNo: 2, partName: '등심(우)' },
  { partNo: 3, partName: '안심' },
  { partNo: 4, partName: '채끝' },
  { partNo: 5, partName: '갈비(좌)' },
  { partNo: 6, partName: '갈비(우)' },
  { partNo: 7, partName: '특수부위' },
  { partNo: 8, partName: '설도(좌)' },
  { partNo: 9, partName: '설도(우)' },
  { partNo: 10, partName: '앞다리' },
  { partNo: 11, partName: '우둔' },
  { partNo: 12, partName: '목심' },
  { partNo: 13, partName: '양지(좌)' },
  { partNo: 14, partName: '양지(우)' },
  { partNo: 15, partName: '사태' },
  { partNo: 16, partName: '꼬리' },
  { partNo: 17, partName: '족' },
  { partNo: 18, partName: '사골' },
  { partNo: 19, partName: '잡뼈' },
];

// 상태 라벨
export const STATUS_LABELS: Record<ListingStatus, string> = {
  pending: '대기',
  approved: '승인',
  auction: '경매중',
  completed: '완료',
  cancelled: '취소',
};
