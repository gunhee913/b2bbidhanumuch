import { addDays, endOfWeek, format, startOfWeek } from 'date-fns';
import { chunk } from 'es-toolkit';
import type { CattleListing, CattlePart, CertificateData } from '../types';

/** 관리자 화면에서 쓰는 상장 상태 · DB 의 여섯 가지를 네 가지로 접는다 */
export type ListingViewStatus = '대기' | '승인' | '경매중' | '마감';

export const LISTING_VIEW_STATUSES: ListingViewStatus[] = ['대기', '승인', '경매중', '마감'];

export interface PartView {
  /** 부위 순번 (1~20) */
  partNo: number;
  id: string;
  name: string;
  weight: number;
  minPrice: number;
  bidPrice: number | null;
  isIncluded: boolean;
  /** 부위 사진 · 비어 있으면 경매장은 업체 대표이미지 → 개체 대표 사진 순으로 보여 준다 */
  images: string[];
}

export interface ListingView {
  id: string;
  listingNo: string;
  listingDate: string;
  breed: string;
  gender: string;
  grade: string;
  monthAge: number;
  backFat: number;
  eyeMuscle: number;
  marblingScore: number;
  meatColor: number;
  fatColor: number;
  texture: number;
  maturity: number;
  traceNo: string;
  slaughterHouse: string;
  /** 'YY.MM.DD' */
  slaughterDate: string;
  slaughterNo: string;
  carcassWeight: number;
  companyId: string;
  companyName: string;
  /** 'YY.MM.DD' */
  processDate: string;
  processWeight: number;
  status: ListingViewStatus;
  parts: PartView[];
  images: string[];
  slaughterCert: CertificateData | null;
  gradeCert: CertificateData | null;
}

const toShortDate = (iso: string | null) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return format(date, 'yy.MM.dd');
};

/** 'YY.MM.DD' → 'YYYY-MM-DD' · 수정 폼에서 서버로 돌려보낼 때 */
export const shortDateToIso = (short: string): string | null => {
  if (!short) return null;
  const parts = short.split('.');
  if (parts.length !== 3) return short;
  const year = parts[0].length === 2 ? `20${parts[0]}` : parts[0];
  return `${year}-${parts[1]}-${parts[2]}`;
};

/** 1++ 등급만 근내지방 점수를 괄호로 붙인다 */
const formatGrade = (grade: string, marblingScore: number | null) => {
  if (!grade) return '';
  if (grade.includes('(')) return grade;
  if (marblingScore && grade.startsWith('1++')) return `${grade}(${marblingScore})`;
  return grade;
};

const toViewStatus = (status: CattleListing['status']): ListingViewStatus => {
  switch (status) {
    case 'approved':
      return '승인';
    case 'auction':
      return '경매중';
    case 'completed':
    case 'closed':
      return '마감';
    default:
      return '대기';
  }
};

const toPartView = (part: CattlePart): PartView => ({
  partNo: part.partNo,
  id: part.id,
  name: part.partName,
  weight: part.weight || 0,
  minPrice: part.minPrice || 0,
  bidPrice: part.bidPrice,
  isIncluded: part.isIncluded,
  images: part.images || [],
});

/** 증명서가 PDF 인지 · 썸네일 대신 파일 아이콘을 보여 주고 새 탭으로 연다 */
export const isPdfCertificate = (cert: CertificateData) =>
  cert.fileType === 'application/pdf' || /\.pdf$/i.test(cert.fileName || '') || cert.fileData.startsWith('data:application/pdf');

export const toListingView = (listing: CattleListing): ListingView => ({
  id: listing.id,
  listingNo: listing.listingNo,
  listingDate: listing.listingDate,
  breed: listing.breed,
  gender: listing.gender,
  grade: formatGrade(listing.grade, listing.marblingScore),
  monthAge: listing.monthAge || 0,
  backFat: listing.backFat || 0,
  eyeMuscle: listing.eyeMuscle || 0,
  marblingScore: listing.marblingScore || 0,
  meatColor: listing.meatColor || 0,
  fatColor: listing.fatColor || 0,
  texture: listing.texture || 0,
  maturity: listing.maturity || 0,
  // 일부 데이터는 '002-' 접두까지 저장돼 있다 · 화면은 접두를 따로 붙이므로 여기서 뗀다
  traceNo: (listing.traceNo || '').replace(/^002-/, ''),
  slaughterHouse: listing.slaughterHouse || '',
  slaughterDate: toShortDate(listing.slaughterDate),
  slaughterNo: listing.slaughterNo || '',
  carcassWeight: listing.carcassWeight || 0,
  companyId: listing.companyId,
  companyName: listing.companyName || '',
  processDate: toShortDate(listing.processDate),
  processWeight: listing.processWeight || 0,
  status: toViewStatus(listing.status),
  parts: (listing.parts || []).map(toPartView).sort((a, b) => a.partNo - b.partNo),
  images: listing.images || [],
  slaughterCert: listing.slaughterCert,
  gradeCert: listing.gradeCert,
});

/** 접수번호 뒤 숫자 기준 오름차순 */
export const sortByListingNo = (a: ListingView, b: ListingView) => {
  const suffixA = parseInt(a.listingNo.split('-').pop() || '0', 10);
  const suffixB = parseInt(b.listingNo.split('-').pop() || '0', 10);
  return suffixA - suffixB;
};

/** 부위 상장번호 · 접수번호-01 처럼 두 자리 */
export const partListingNo = (listingNo: string, partNo: number) => `${listingNo}-${String(partNo).padStart(2, '0')}`;

export const partTotals = (parts: PartView[]) => {
  const included = parts.filter((part) => part.isIncluded);
  return {
    includedCount: included.length,
    totalCount: parts.length,
    weight: included.reduce((sum, part) => sum + part.weight, 0),
    minPriceTotal: included.reduce((sum, part) => sum + part.minPrice * part.weight, 0),
    bidTotal: included.reduce((sum, part) => sum + (part.bidPrice ? part.bidPrice * part.weight : 0), 0),
  };
};

export const PART_COLUMN_COUNT = 3;
const PART_ROWS_PER_COLUMN = 7;

/** 부위를 7행 × 3열(1~7 / 8~14 / 15~20)로 나눈다 · 조회·수정 화면이 같은 배치를 쓴다 */
export const splitPartsIntoColumns = <T>(parts: T[]): T[][] => {
  const rowsPerColumn = Math.max(PART_ROWS_PER_COLUMN, Math.ceil(parts.length / PART_COLUMN_COUNT));
  return chunk(parts, rowsPerColumn);
};

export const hasPhotos = (listing: ListingView) => listing.images.length > 0;

/** 상태별 건수 · 탭에 붙인다 */
export const countByStatus = (listings: ListingView[]) =>
  listings.reduce<Record<ListingViewStatus, number>>(
    (acc, listing) => ({ ...acc, [listing.status]: acc[listing.status] + 1 }),
    { 대기: 0, 승인: 0, 경매중: 0, 마감: 0 },
  );

// ---- 상장일 기간 프리셋 ----

export interface DateRange {
  start: string;
  end: string;
}

export type ListingDatePreset = 'today' | 'tomorrow' | 'thisWeek';

export const LISTING_DATE_PRESETS: { value: ListingDatePreset; label: string }[] = [
  { value: 'today', label: '오늘' },
  { value: 'tomorrow', label: '내일' },
  { value: 'thisWeek', label: '이번 주' },
];

export const DEFAULT_LISTING_DATE_PRESET: ListingDatePreset = 'today';

const iso = (date: Date) => format(date, 'yyyy-MM-dd');

export const rangeForListingPreset = (preset: ListingDatePreset, today = new Date()): DateRange => {
  switch (preset) {
    case 'today':
      return { start: iso(today), end: iso(today) };
    case 'tomorrow': {
      const tomorrow = addDays(today, 1);
      return { start: iso(tomorrow), end: iso(tomorrow) };
    }
    case 'thisWeek':
      return { start: iso(startOfWeek(today, { weekStartsOn: 1 })), end: iso(endOfWeek(today, { weekStartsOn: 1 })) };
  }
};

export const presetForListingRange = (range: DateRange, today = new Date()): ListingDatePreset | null =>
  LISTING_DATE_PRESETS.find(({ value }) => {
    const candidate = rangeForListingPreset(value, today);
    return candidate.start === range.start && candidate.end === range.end;
  })?.value ?? null;
