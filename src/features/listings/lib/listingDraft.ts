import { isValid, parseISO } from 'date-fns';
import { z } from 'zod';
import { DEFAULT_SLAUGHTER_HOUSE } from '@/constants/slaughterHouses';
import { DEFAULT_PARTS, type CertificateData, type CreateListingInput, type CreatePartInput } from '../types';

/** 등록 폼의 부위 한 줄 · 저장 전이라 전부 문자열로 들고 있다 */
export interface PartDraft {
  /** 부위번호(1~20) · 폼 안에서는 id 로도 쓴다 */
  id: number;
  name: string;
  weight: string;
  /** 숫자만 · 보여 줄 때만 쉼표를 붙인다 */
  minPrice: string;
  isIncluded: boolean;
  /** 부위 사진 · 비우면 경매장은 대표이미지 → 메인 사진으로 대신한다 */
  images: string[];
}

/** 등록 폼의 개체 하나 */
export interface CattleDraft {
  id: number;
  seqNo: string;
  breed: string;
  gender: string;
  grade: string;
  /** 1++ 세부(7·8·9) · 접수번호 옆 표기용, 저장은 `fatMarbling` 으로 */
  marbling: string;
  monthAge: string;
  carcassWeight: string;
  unitPrice: string;
  traceNo: string;
  backFat: string;
  eyeMuscle: string;
  fatMarbling: string;
  meatColor: string;
  fatColor: string;
  texture: string;
  maturity: string;
  slaughterHouse: string;
  slaughterDate: string;
  slaughterNo: string;
  processDate: string;
  processWeight: string;
  parts: PartDraft[];
  images: string[];
  slaughterCert: CertificateData | null;
  gradeCert: CertificateData | null;
  isExpanded: boolean;
}

export const MAX_CATTLE_PER_SUBMIT = 10;
export const TRACE_NO_PREFIX = '002-';

const toOptions = (values: readonly string[]) => values.map((value) => ({ value, label: value }));
export const BREEDS = ['한우', '육우'] as const;
export const DEFAULT_BREED = BREEDS[0];
export const BREED_OPTIONS = toOptions(BREEDS);
/** 엑셀 등 자유 입력을 축종 값으로 · 모르는 값은 null */
export const normalizeBreed = (raw: string): string | null => {
  const compact = raw.replace(/\s/g, '');
  return BREEDS.find((breed) => compact.includes(breed)) ?? null;
};
export const GENDER_OPTIONS = toOptions(['거세', '암']);
export const GRADE_OPTIONS = toOptions(['1++A', '1++B', '1++C', '1+A', '1+B', '1+C', '1A', '1B', '1C', '2A', '2B', '2C']);
export const MARBLING_OPTIONS = toOptions(['9', '8', '7']);

export const isPremiumGrade = (grade: string) => grade.startsWith('1++');

export const createDefaultParts = (): PartDraft[] =>
  DEFAULT_PARTS.map(({ partNo, partName }) => ({ id: partNo, name: partName, weight: '', minPrice: '', isIncluded: true, images: [] }));

export const createCattleDraft = (id: number, seqNo: string): CattleDraft => ({
  id,
  seqNo,
  breed: DEFAULT_BREED,
  gender: '',
  grade: '',
  marbling: '',
  monthAge: '',
  carcassWeight: '',
  unitPrice: '',
  traceNo: '',
  backFat: '',
  eyeMuscle: '',
  fatMarbling: '',
  meatColor: '',
  fatColor: '',
  texture: '',
  maturity: '',
  slaughterHouse: DEFAULT_SLAUGHTER_HOUSE,
  slaughterDate: '',
  slaughterNo: '',
  processDate: '',
  processWeight: '',
  parts: createDefaultParts(),
  images: [],
  slaughterCert: null,
  gradeCert: null,
  isExpanded: true,
});

/** 입력된 것이 하나라도 있나 · 엑셀로 덮어쓰기 전에 확인창을 띄울지 가른다 */
export const isCattleDraftDirty = (draft: CattleDraft) => {
  const blank = createCattleDraft(draft.id, draft.seqNo);
  const fieldKeys: (keyof CattleDraft)[] = [
    'gender', 'grade', 'marbling', 'monthAge', 'carcassWeight', 'unitPrice', 'traceNo', 'backFat', 'eyeMuscle', 'fatMarbling',
    'meatColor', 'fatColor', 'texture', 'maturity', 'slaughterDate', 'slaughterNo', 'processDate', 'processWeight',
  ];
  if (fieldKeys.some((key) => draft[key] !== blank[key])) return true;
  if (draft.breed !== blank.breed || draft.slaughterHouse !== blank.slaughterHouse) return true;
  if (draft.images.length > 0 || draft.slaughterCert || draft.gradeCert) return true;
  return draft.parts.some((part) => part.weight !== '' || part.minPrice !== '' || !part.isIncluded || part.images.length > 0);
};

// ---- 입력 다듬기 ----

/** 이력번호 · 숫자만 받아 0000-0000-0 으로 */
export const formatTraceNo = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 4) return digits;
  if (digits.length <= 8) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`;
};

/** 금액 입력은 숫자만 받고 앞자리 0 은 뗀다 */
export const onlyDigits = (value: string) => value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
export const withCommas = (digits: string) => (digits ? Number(digits).toLocaleString('ko-KR') : '');

// ---- 번호 ----

/** 'YYYY-MM-DD' → 'YYMMDD' */
export const listingDateCode = (listingDate: string) => listingDate.replace(/-/g, '').slice(2);

/**
 * 접수번호 미리보기 · 업체번호 첫 자리 + 순번 (대구축협 200 · 순번 3 → 260205-203).
 * 실제 번호는 서버가 저장할 때 다시 매긴다 · 여기서는 화면에 보여 주기 위한 값이다.
 */
export const previewAuctionNo = (listingDate: string, companyNo: string | undefined, seqNo: string) => {
  if (!companyNo || !listingDate) return '-';
  const seq = parseInt(`${companyNo.charAt(0)}00`, 10) + (parseInt(seqNo, 10) || 1);
  return `${listingDateCode(listingDate)}-${seq}`;
};

// ---- 검증 ----

/** 칸 경로('gender', 'parts.3.weight', 'parts') → 짧은 사유 */
export type DraftErrors = Record<string, string>;

const REQUIRED = '필수 입력';
const requiredText = z.string().trim().min(1, REQUIRED);
const positiveNumber = requiredText.refine((value) => Number(value) > 0, '0보다 큰 숫자');
const isoDate = requiredText.refine((value) => isValid(parseISO(value)), '날짜 형식');

const partDraftSchema = z
  .object({ isIncluded: z.boolean(), weight: z.string(), minPrice: z.string() })
  .superRefine((part, ctx) => {
    if (!part.isIncluded) return;
    if (!(Number(part.weight) > 0)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['weight'], message: REQUIRED });
    if (!(Number(part.minPrice) > 0)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['minPrice'], message: REQUIRED });
  });

const cattleDraftSchema = z.object({
  breed: requiredText,
  gender: requiredText,
  grade: requiredText,
  monthAge: positiveNumber,
  carcassWeight: positiveNumber,
  traceNo: z.string().regex(/^\d{4}-\d{4}-\d$/, '0000-0000-0 형식'),
  backFat: positiveNumber,
  eyeMuscle: positiveNumber,
  fatMarbling: positiveNumber,
  meatColor: positiveNumber,
  fatColor: positiveNumber,
  texture: positiveNumber,
  maturity: positiveNumber,
  slaughterHouse: requiredText,
  slaughterDate: isoDate,
  slaughterNo: requiredText,
  processDate: isoDate,
  processWeight: positiveNumber,
  parts: z.array(partDraftSchema).refine((parts) => parts.some((part) => part.isIncluded), '상장할 부위가 없습니다'),
});

/**
 * 개체 하나를 검증해 틀린 칸만 돌려준다 · 비어 있으면 통과.
 * DOM 이 아니라 데이터를 보므로 접어 둔 개체도 빠짐없이 걸린다.
 */
export const validateCattleDraft = (draft: CattleDraft): DraftErrors => {
  const result = cattleDraftSchema.safeParse(draft);
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message]));
};

export const countErrors = (errors: DraftErrors | undefined) => (errors ? Object.keys(errors).length : 0);

// ---- 서버 입력으로 ----

const numberOrUndefined = (value: string, parse: (v: string) => number = parseFloat) => {
  const parsed = parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};
const intOrUndefined = (value: string) => numberOrUndefined(value, (v) => parseInt(v, 10));

const toCreatePartInput = (part: PartDraft): CreatePartInput => ({
  partNo: part.id,
  partName: part.name,
  weight: part.isIncluded ? numberOrUndefined(part.weight) ?? 0 : 0,
  minPrice: part.isIncluded ? intOrUndefined(part.minPrice) ?? 0 : 0,
  isIncluded: part.isIncluded,
  images: part.images,
});

export const toCreateListingInput = (draft: CattleDraft, listingDate: string, companyId: string): CreateListingInput => ({
  listingDate,
  companyId,
  breed: draft.breed,
  gender: draft.gender,
  grade: draft.grade,
  marblingScore: intOrUndefined(draft.fatMarbling),
  monthAge: intOrUndefined(draft.monthAge),
  carcassWeight: numberOrUndefined(draft.carcassWeight),
  unitPrice: intOrUndefined(draft.unitPrice),
  traceNo: draft.traceNo || undefined,
  backFat: numberOrUndefined(draft.backFat),
  eyeMuscle: numberOrUndefined(draft.eyeMuscle),
  meatColor: intOrUndefined(draft.meatColor),
  fatColor: intOrUndefined(draft.fatColor),
  texture: intOrUndefined(draft.texture),
  maturity: intOrUndefined(draft.maturity),
  slaughterHouse: draft.slaughterHouse || undefined,
  slaughterDate: draft.slaughterDate || undefined,
  slaughterNo: draft.slaughterNo || undefined,
  processDate: draft.processDate || undefined,
  processWeight: numberOrUndefined(draft.processWeight),
  images: draft.images,
  slaughterCert: draft.slaughterCert ?? undefined,
  gradeCert: draft.gradeCert ?? undefined,
  // 제외한 부위도 isIncluded=false 로 함께 보낸다 · 부위번호가 1~20 자리를 지켜야 조회·수정 화면의 격자와 상장번호가 맞는다
  parts: draft.parts.map(toCreatePartInput),
});
