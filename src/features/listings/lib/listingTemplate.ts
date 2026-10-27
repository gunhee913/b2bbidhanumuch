import * as XLSX from 'xlsx';
import { DEFAULT_SLAUGHTER_HOUSE, normalizeSlaughterHouse, slaughterHouseLabel } from '@/constants/slaughterHouses';
import { DEFAULT_PARTS } from '../types';
import { createCattleDraft, DEFAULT_BREED, formatTraceNo, MAX_CATTLE_PER_SUBMIT, normalizeBreed, onlyDigits, type CattleDraft } from './listingDraft';

const CATTLE_SHEET = '개체정보';
const PARTS_SHEET = '부위별정보';

const CATTLE_HEADERS = [
  '순번', '축종', '성별', '등급', '근내지방등급', '개월령', '도체중', '경락단가(원/kg)', '이력번호',
  '등지방', '등심면적', '근내지방', '육색', '지방색', '조직감', '성숙도',
  '도축장', '도축일', '도축번호', '가공일', '가공중량',
];

const SAMPLE_CATTLE = [
  ['1', '한우', '거세', '1++A', '9', '32', '520', '28000', '0023-4567-8', '15', '98', '9', '5', '3', '1', '2', '음성', '2026-01-15', '201', '2026-01-16', '312'],
  ['2', '한우', '거세', '1+A',  '7', '30', '490', '25000', '0023-4567-9', '13', '94', '7', '5', '3', '1', '2', '음성', '2026-01-15', '202', '2026-01-16', '295'],
  ['3', '한우', '암',   '1A',   '5', '28', '440', '20000', '0023-4568-0', '11', '88', '5', '4', '3', '1', '2', '음성', '2026-01-15', '203', '2026-01-16', '264'],
  ['4', '한우', '거세', '1++B', '8', '34', '530', '27000', '0023-4568-1', '14', '96', '8', '5', '3', '1', '2', '음성', '2026-01-15', '204', '2026-01-16', '318'],
  ['5', '한우', '거세', '2A',   '3', '26', '410', '18000', '0023-4568-2', '10', '82', '3', '4', '3', '1', '2', '음성', '2026-01-15', '205', '2026-01-16', '246'],
];

/** 부위별 예시 기준 · [부위명, 기준가(1++), 최소중량, 최대중량] */
const PART_BASE: [string, number, number, number][] = [
  ['등심(좌)',   95000,  9.5, 10.5],
  ['등심(우)',   95000,  9.5, 10.5],
  ['안심',      105000,  8.0,  9.0],
  ['채끝',       90000, 11.0, 12.0],
  ['치마',       95000,  2.0,  4.0],
  ['부채',      110000,  3.5,  4.5],
  ['업진',      100000,  2.0,  3.0],
  ['토시·제비',   95000,  1.5,  2.5],
  ['설도(좌)',   25000, 11.0, 11.5],
  ['설도(우)',   25000, 11.0, 11.5],
  ['앞다리',     35000, 32.0, 34.0],
  ['우둔',       23000, 25.0, 28.0],
  ['목심',       25000, 18.0, 20.0],
  ['양지(좌)',   45000,  6.8,  7.3],
  ['양지(우)',   45000,  6.8,  7.3],
  ['사태',       23000, 18.0, 21.0],
  ['꼬리',        4500, 19.0, 20.0],
  ['족',          3000, 10.0, 12.0],
  ['사골',        1500, 25.0, 27.0],
  ['잡뼈',        1000, 24.0, 26.0],
];

const GRADE_MULTIPLIERS = [1.0, 0.9, 0.75, 1.0, 0.6];

/** 개체별 ±5% 변동 · 결정적이라 내려받을 때마다 같은 예시가 나온다 */
const VARIATION_SEEDS = [
  [1.02, 0.97, 1.04, 0.98, 1.01, 0.96, 1.03, 0.99, 1.02, 0.97, 1.04, 0.98, 1.01, 0.96, 1.03, 0.99, 1.02, 0.97, 1.04, 0.98],
  [0.98, 1.03, 0.96, 1.02, 0.97, 1.04, 0.98, 1.01, 0.97, 1.03, 0.96, 1.02, 0.98, 1.04, 0.97, 1.01, 0.98, 1.03, 0.96, 1.02],
  [1.01, 0.95, 1.03, 0.97, 1.05, 0.98, 0.96, 1.02, 1.01, 0.95, 1.03, 0.97, 1.05, 0.98, 0.96, 1.02, 1.01, 0.95, 1.03, 0.97],
  [0.97, 1.04, 0.98, 1.03, 0.96, 1.01, 1.05, 0.97, 0.98, 1.04, 0.97, 1.03, 0.96, 1.01, 1.05, 0.97, 0.98, 1.04, 0.97, 1.03],
  [1.03, 0.98, 1.01, 0.96, 1.04, 0.97, 1.02, 1.05, 1.03, 0.98, 1.01, 0.96, 1.04, 0.97, 1.02, 1.05, 1.03, 0.98, 1.01, 0.96],
];

const WEIGHT_SEEDS = [
  [0.5, 0.6, 0.4, 0.7, 0.3, 0.8, 0.5, 0.6, 0.4, 0.7, 0.5, 0.3, 0.6, 0.4, 0.7, 0.5, 0.3, 0.6, 0.4, 0.5],
  [0.3, 0.7, 0.5, 0.4, 0.6, 0.3, 0.7, 0.4, 0.6, 0.3, 0.7, 0.5, 0.4, 0.6, 0.3, 0.7, 0.5, 0.4, 0.6, 0.3],
  [0.7, 0.3, 0.6, 0.5, 0.4, 0.7, 0.3, 0.5, 0.7, 0.4, 0.3, 0.6, 0.5, 0.7, 0.4, 0.3, 0.6, 0.5, 0.7, 0.4],
  [0.4, 0.8, 0.3, 0.6, 0.7, 0.4, 0.6, 0.3, 0.5, 0.8, 0.4, 0.7, 0.3, 0.5, 0.8, 0.4, 0.7, 0.3, 0.5, 0.6],
  [0.6, 0.4, 0.7, 0.3, 0.5, 0.6, 0.4, 0.7, 0.3, 0.5, 0.6, 0.4, 0.7, 0.3, 0.5, 0.6, 0.4, 0.7, 0.3, 0.7],
];

const roundTo1000 = (value: number) => Math.round(value / 1000) * 1000;

const buildSampleParts = (): string[][] =>
  SAMPLE_CATTLE.flatMap((_, cattleIndex) =>
    PART_BASE.map(([name, basePrice, minWeight, maxWeight], partIndex) => {
      const price = roundTo1000(basePrice * GRADE_MULTIPLIERS[cattleIndex] * VARIATION_SEEDS[cattleIndex][partIndex]);
      const weight = minWeight + (maxWeight - minWeight) * WEIGHT_SEEDS[cattleIndex][partIndex];
      return [String(cattleIndex + 1), name, weight.toFixed(1), price.toLocaleString('ko-KR')];
    }),
  );

/** 예시 5두가 든 등록 템플릿을 내려받는다 */
export const downloadListingTemplate = () => {
  const cattleSheet = XLSX.utils.aoa_to_sheet([CATTLE_HEADERS, ...SAMPLE_CATTLE]);
  cattleSheet['!cols'] = CATTLE_HEADERS.map(() => ({ wch: 12 }));

  const partsSheet = XLSX.utils.aoa_to_sheet([['순번', '부위명', '중량(kg)', '최저가격(원)'], ...buildSampleParts()]);
  partsSheet['!cols'] = [{ wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, cattleSheet, CATTLE_SHEET);
  XLSX.utils.book_append_sheet(workbook, partsSheet, PARTS_SHEET);
  XLSX.writeFile(workbook, '부분육_상장등록_템플릿.xlsx');
};

// ---- 읽기 ----

export interface ImportResult {
  drafts: CattleDraft[];
  /** 불러오긴 했지만 짚고 넘어갈 것 · 모르는 부위명, 부위 없는 개체 등 */
  warnings: string[];
}

type Row = Record<string, string | number | undefined>;

const text = (value: string | number | undefined) => (value === undefined || value === null ? '' : String(value).trim());

/** 날짜 칸 · 엑셀이 날짜 서식으로 저장한 숫자(일련번호)도 'YYYY-MM-DD' 로 */
const dateText = (value: string | number | undefined) => {
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return '';
    return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
  }
  return text(value).replace(/\./g, '-').replace(/\s/g, '');
};

const KNOWN_PART_NAMES = new Set(DEFAULT_PARTS.map((part) => part.partName));

const readFile = (file: File) =>
  new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'));
    reader.readAsArrayBuffer(file);
  });

/** 템플릿 형식의 엑셀 파일을 읽어 개체 초안으로 */
export const parseListingWorkbook = async (file: File): Promise<ImportResult> => parseListingWorkbookData(await readFile(file));

/**
 * 템플릿 형식의 엑셀 바이트를 개체 초안으로 · 형식이 어긋나면 사유를 담아 던진다.
 * 순번은 두 시트를 잇는 열쇠일 뿐이라 돌려주는 초안의 seqNo 는 부르는 쪽이 다시 매긴다.
 */
export const parseListingWorkbookData = (data: ArrayBuffer | Uint8Array): ImportResult => {
  const workbook = XLSX.read(data instanceof Uint8Array ? data : new Uint8Array(data), { type: 'array' });

  const cattleSheet = workbook.Sheets[CATTLE_SHEET];
  if (!cattleSheet) throw new Error(`「${CATTLE_SHEET}」 시트를 찾을 수 없습니다. 템플릿을 내려받아 형식을 확인해 주세요.`);
  const partsSheet = workbook.Sheets[PARTS_SHEET];
  if (!partsSheet) throw new Error(`「${PARTS_SHEET}」 시트를 찾을 수 없습니다. 템플릿을 내려받아 형식을 확인해 주세요.`);

  const cattleRows = XLSX.utils.sheet_to_json<Row>(cattleSheet);
  const partRows = XLSX.utils.sheet_to_json<Row>(partsSheet);
  if (cattleRows.length === 0) throw new Error('불러올 개체가 없습니다. 「개체정보」 시트에 한 줄 이상 적어 주세요.');

  const warnings: string[] = [];
  const seqNos = new Set(cattleRows.map((row, index) => text(row['순번']) || String(index + 1)));

  partRows.forEach((row, index) => {
    const seqNo = text(row['순번']);
    const name = text(row['부위명']);
    if (seqNo && !seqNos.has(seqNo)) warnings.push(`부위별정보 ${index + 2}행: 개체정보에 없는 순번 ${seqNo}`);
    else if (name && !KNOWN_PART_NAMES.has(name)) warnings.push(`부위별정보 ${index + 2}행: 알 수 없는 부위명 「${name}」 (순번 ${seqNo})`);
  });

  const drafts = cattleRows.slice(0, MAX_CATTLE_PER_SUBMIT).map((row, index) => {
    const seqNo = text(row['순번']) || String(index + 1);
    const draft = createCattleDraft(index + 1, seqNo);
    const ownParts = partRows.filter((part) => text(part['순번']) === seqNo);
    if (ownParts.length === 0) warnings.push(`순번 ${seqNo}: 부위별정보가 없어 부위 중량·최저가격이 비어 있습니다`);

    const houseText = text(row['도축장']);
    const slaughterHouse = normalizeSlaughterHouse(houseText) ?? DEFAULT_SLAUGHTER_HOUSE;
    if (houseText && !normalizeSlaughterHouse(houseText)) {
      warnings.push(`순번 ${seqNo}: 도축장 「${houseText}」 을 알 수 없어 ${slaughterHouseLabel(DEFAULT_SLAUGHTER_HOUSE)}으로 두었습니다`);
    }

    const breedText = text(row['축종']);
    const breed = normalizeBreed(breedText) ?? DEFAULT_BREED;
    if (breedText && !normalizeBreed(breedText)) {
      warnings.push(`순번 ${seqNo}: 축종 「${breedText}」 을 알 수 없어 ${DEFAULT_BREED}로 두었습니다`);
    }

    return {
      ...draft,
      breed,
      gender: text(row['성별']),
      grade: text(row['등급']),
      marbling: text(row['근내지방등급']),
      monthAge: text(row['개월령']),
      carcassWeight: text(row['도체중']),
      unitPrice: onlyDigits(text(row['경락단가(원/kg)'])),
      traceNo: formatTraceNo(text(row['이력번호'])),
      backFat: text(row['등지방']),
      eyeMuscle: text(row['등심면적']),
      fatMarbling: text(row['근내지방']),
      meatColor: text(row['육색']),
      fatColor: text(row['지방색']),
      texture: text(row['조직감']),
      maturity: text(row['성숙도']),
      slaughterHouse,
      slaughterDate: dateText(row['도축일']),
      slaughterNo: text(row['도축번호']),
      processDate: dateText(row['가공일']),
      processWeight: text(row['가공중량']),
      parts: draft.parts.map((part) => {
        const match = ownParts.find((candidate) => text(candidate['부위명']) === part.name);
        if (!match) return part;
        return { ...part, weight: text(match['중량(kg)']).replace(/,/g, ''), minPrice: onlyDigits(text(match['최저가격(원)'])) };
      }),
    };
  });

  if (cattleRows.length > MAX_CATTLE_PER_SUBMIT) warnings.unshift(`최대 ${MAX_CATTLE_PER_SUBMIT}두까지 · 처음 ${MAX_CATTLE_PER_SUBMIT}두만 불러왔습니다 (${cattleRows.length}두 중)`);

  return { drafts, warnings };
};
