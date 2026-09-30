import type { AssignmentInfo, WinningPart } from "../types";

/** 개체(상장) 단위로 묶은 내 낙찰 부위 · 헤더에 쓰는 개체 정보는 첫 부위에서 가져온다 */
export interface DeliveryEntity {
  listingId: string;
  listingNo: string;
  listingDate: string;
  slaughterHouse: string;
  companyName: string;
  grade: string;
  marbling: number;
  breed: string;
  gender: string;
  monthAge: number;
  carcassWeight: number;
  backFat: number;
  eyeMuscle: number;
  meatColor: number;
  fatColor: number;
  texture: number;
  maturity: number;
  traceNo: string;
  slaughterDate: string;
  images: string[];
  /** 내 낙찰 부위 · 부위번호 순 */
  parts: WinningPart[];
  totalAmount: number;
  totalWeight: number;
}

/** 같은 낙찰일 · 같은 공판장의 개체 묶음 · 화면의 날짜 그룹 헤더 */
export interface DeliveryDayGroup {
  key: string;
  date: string;
  slaughterHouse: string;
  entities: DeliveryEntity[];
  partCount: number;
  totalAmount: number;
}

export function groupPartsByEntity(parts: readonly WinningPart[]): DeliveryEntity[] {
  const map = new Map<string, DeliveryEntity>();
  for (const p of parts) {
    const key = p.listingId || p.listingNo;
    const entity = map.get(key);
    if (entity) {
      entity.parts.push(p);
      entity.totalAmount += p.bidAmount;
      entity.totalWeight += p.weight;
      continue;
    }
    map.set(key, {
      listingId: p.listingId,
      listingNo: p.listingNo,
      listingDate: p.listingDate,
      slaughterHouse: p.slaughterHouse,
      companyName: p.companyName,
      grade: p.grade,
      marbling: p.marbling,
      breed: p.breed,
      gender: p.gender,
      monthAge: p.monthAge,
      carcassWeight: p.carcassWeight,
      backFat: p.backFat,
      eyeMuscle: p.eyeMuscle,
      meatColor: p.meatColor,
      fatColor: p.fatColor,
      texture: p.texture,
      maturity: p.maturity,
      traceNo: p.traceNo,
      slaughterDate: p.slaughterDate,
      images: p.images ?? [],
      parts: [p],
      totalAmount: p.bidAmount,
      totalWeight: p.weight,
    });
  }
  return Array.from(map.values())
    .map((e) => ({ ...e, parts: [...e.parts].sort((a, b) => a.partNo - b.partNo) }))
    .sort((a, b) => a.listingNo.localeCompare(b.listingNo, "ko-KR", { numeric: true }));
}

/** 날짜 내림차순(최근 먼저) · 같은 날은 공판장 이름순 */
export function groupEntitiesByDay(entities: readonly DeliveryEntity[]): DeliveryDayGroup[] {
  const map = new Map<string, DeliveryDayGroup>();
  for (const e of entities) {
    const key = `${e.listingDate}|${e.slaughterHouse}`;
    const g = map.get(key);
    if (g) {
      g.entities.push(e);
      g.partCount += e.parts.length;
      g.totalAmount += e.totalAmount;
      continue;
    }
    map.set(key, {
      key,
      date: e.listingDate,
      slaughterHouse: e.slaughterHouse,
      entities: [e],
      partCount: e.parts.length,
      totalAmount: e.totalAmount,
    });
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.slaughterHouse.localeCompare(b.slaughterHouse, "ko-KR");
  });
}

export interface EntityAssignProgress {
  /** 저장 완료된 부위 수 */
  saved: number;
  /** 저장 전 변경(dirty) 부위 수 */
  pending: number;
  /** 아직 아무 것도 안 된 부위 수 */
  unassigned: number;
  total: number;
  /** 저장 완료 == 전체 */
  done: boolean;
}

export function computeEntityProgress(
  entity: DeliveryEntity,
  saved: Record<string, AssignmentInfo>,
  dirty: Record<string, string | null>,
): EntityAssignProgress {
  let s = 0;
  let p = 0;
  for (const part of entity.parts) {
    if (saved[part.partId]) s++;
    else if (dirty[part.partId]) p++;
  }
  const total = entity.parts.length;
  return { saved: s, pending: p, unassigned: total - s - p, total, done: s === total && total > 0 };
}

export interface DirtySummary {
  entityCount: number;
  partCount: number;
  /** 거래처별 건수 · 많은 순 */
  byPartner: { name: string; count: number }[];
}

/** dirty 변경분 요약 · SaveBar 확인 문구 `3두 6건 → 한우명가 4 · 삼성정육 2` */
export function summarizeDirty(
  dirty: Record<string, string | null>,
  parts: readonly WinningPart[],
  partnerNameById: (id: string) => string,
): DirtySummary {
  const listingByPart = new Map(parts.map((p) => [p.partId, p.listingId || p.listingNo]));
  const counts = new Map<string, number>();
  const entities = new Set<string>();
  let partCount = 0;
  for (const [partId, partnerId] of Object.entries(dirty)) {
    if (!partnerId) continue;
    partCount++;
    counts.set(partnerId, (counts.get(partnerId) ?? 0) + 1);
    const listing = listingByPart.get(partId);
    if (listing) entities.add(listing);
  }
  const byPartner = Array.from(counts.entries())
    .map(([id, count]) => ({ name: partnerNameById(id), count }))
    .sort((a, b) => b.count - a.count);
  return { entityCount: entities.size, partCount, byPartner };
}
