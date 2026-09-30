import type { LiveListing } from "@/features/live-auction/api";
import type { DailyListing } from "@/features/history/hooks/useDailyListings";

/**
 * 상장표(개체 비교표) 한 행의 개체 정보 뷰모델.
 *
 * 경매내역(`DailyListing`)과 경매장(`LiveListing`)이 같은 표(`EntitySheetTable`)를 쓰기 위한 공통 형태.
 * 부위는 두 화면의 타입(낙찰 스냅샷 vs 실시간 입찰)이 달라 여기 넣지 않고,
 * 각 화면이 `id` 로 자기 부위 데이터를 찾아 펼침 영역을 그린다.
 */
export interface SheetEntity {
  id: string;
  listingNo: string;
  listingDate: string;
  status: string;
  grade: string;
  marblingScore: number | null;
  breed: string;
  gender: string;
  monthAge: number | null;
  carcassWeight: number | null;
  meatColor: number | null;
  fatColor: number | null;
  texture: number | null;
  maturity: number | null;
  backFat: number | null;
  eyeMuscle: number | null;
  traceNo: string;
  slaughterHouse: string;
  slaughterDate: string | null;
  slaughterNo: string | null;
  processDate: string | null;
  processWeight: number | null;
  companyName: string;
  images: string[];
  /** 상장(포함) 부위 수 */
  partCount: number;
  /** 제외 부위까지 포함한 전체 부위 수 · `부위 20/20` 표기용 */
  partTotal: number;
}

/** 다른 표에서 행을 눌러 넘어왔을 때 · 개체를 펼치고 부위 행을 잠깐 강조 */
export interface SheetFocus {
  listingNo: string;
  partNo: number | null;
  /** 같은 행을 다시 눌러도 다시 스크롤되게 하는 시퀀스 */
  seq: number;
}

export function fromDailyListing(l: DailyListing): SheetEntity {
  return {
    id: l.id,
    listingNo: l.listingNo,
    listingDate: l.listingDate,
    status: l.status,
    grade: l.grade ?? "",
    marblingScore: l.marblingScore ?? null,
    breed: l.breed ?? "",
    gender: l.gender ?? "",
    monthAge: l.monthAge ?? null,
    carcassWeight: l.carcassWeight ?? null,
    meatColor: l.meatColor ?? null,
    fatColor: l.fatColor ?? null,
    texture: l.texture ?? null,
    maturity: l.maturity ?? null,
    backFat: l.backFat ?? null,
    eyeMuscle: l.eyeMuscle ?? null,
    traceNo: l.traceNo ?? "",
    slaughterHouse: l.slaughterHouse ?? "",
    slaughterDate: l.slaughterDate ?? null,
    slaughterNo: l.slaughterNo ?? null,
    processDate: l.processDate ?? null,
    processWeight: l.processWeight ?? null,
    companyName: l.companyName ?? "",
    images: l.images ?? [],
    partCount: l.parts.length,
    partTotal: l.partTotal,
  };
}

export function fromLiveListing(l: LiveListing): SheetEntity {
  return {
    id: l.id,
    listingNo: l.listingNo,
    listingDate: l.listingDate,
    status: l.status,
    grade: l.grade ?? "",
    marblingScore: l.marblingScore,
    breed: l.breed ?? "",
    gender: l.gender ?? "",
    monthAge: l.monthAge,
    carcassWeight: l.carcassWeight,
    meatColor: l.meatColor,
    fatColor: l.fatColor,
    texture: l.texture,
    maturity: l.maturity,
    backFat: l.backFat,
    eyeMuscle: l.eyeMuscle,
    traceNo: l.traceNo ?? "",
    slaughterHouse: l.slaughterHouse,
    slaughterDate: l.slaughterDate,
    slaughterNo: l.slaughterNo,
    processDate: l.processDate,
    processWeight: l.processWeight,
    companyName: l.companyName,
    images: l.images ?? [],
    partCount: l.parts.length,
    partTotal: l.parts.length,
  };
}
