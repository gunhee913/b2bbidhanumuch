/**
 * 부위별 뷰에서 사용하는 부위 그룹핑 유틸.
 *
 * - 좌/우는 대분류(등심, 설도, 양지)로 통합해 사이드바에 노출한다.
 * - `groupPartsByName` 은 각 상장(개체)의 부위를 펼쳐(flat) 부위 그룹별로 묶어 준다.
 *   그룹 내부 순서는 좌 → 우 → 접수번호 순으로 정렬해 좌/우 배지 컬럼이
 *   시각적으로 자연스럽게 배치되도록 한다.
 */

import type { LiveListing, LivePart } from "../api";
import { CATTLE_PART_NAMES } from "@/constants/cattleParts";

/** "등심(좌)" / "설도(우)" 등에서 `(좌)`, `(우)` 를 제거해 대분류 이름을 만든다. */
export function toPartGroupName(partName: string): string {
  return partName.replace(/\s*\((?:좌|우)\)\s*$/, "").trim();
}

/** 부위명에서 좌/우 정보를 추출. 없으면 null. */
export function extractSide(partName: string): "좌" | "우" | null {
  const match = partName.match(/\((좌|우)\)\s*$/);
  if (!match) return null;
  return match[1] === "좌" ? "좌" : "우";
}

export interface PartGroupItem {
  listing: LiveListing;
  part: LivePart;
  side: "좌" | "우" | null;
}

export interface PartGroupEntry {
  group: string; // "등심", "안심" 등
  count: number; // 좌+우 통합 인스턴스 수
  items: PartGroupItem[];
}

/**
 * `CATTLE_PART_NAMES` 순서를 유지하기 위해 미리 계산된 대분류 순서 리스트.
 * (중복 제거 및 원본 순서 유지)
 */
const PART_GROUP_ORDER: string[] = (() => {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const name of CATTLE_PART_NAMES) {
    const group = toPartGroupName(name);
    if (!seen.has(group)) {
      seen.add(group);
      ordered.push(group);
    }
  }
  return ordered;
})();

export function getPartGroupOrder(): readonly string[] {
  return PART_GROUP_ORDER;
}

/**
 * 상장 목록을 부위 대분류별로 그룹핑.
 *
 * 정렬:
 * - 그룹 순서: `CATTLE_PART_NAMES` 원본 순서 (등심 → 안심 → ...)
 * - 그룹 내부: 접수번호 오름차순 (좌/우 무관 · 같은 개체의 좌/우 는 자연스럽게 인접 배치)
 */
export function groupPartsByName(listings: LiveListing[]): PartGroupEntry[] {
  const bucket = new Map<string, PartGroupItem[]>();

  for (const listing of listings) {
    for (const part of listing.parts) {
      const group = toPartGroupName(part.partName);
      const side = extractSide(part.partName);
      const list = bucket.get(group);
      const item: PartGroupItem = { listing, part, side };
      if (list) {
        list.push(item);
      } else {
        bucket.set(group, [item]);
      }
    }
  }

  const sideRank = (s: "좌" | "우" | null): number =>
    s === "좌" ? 0 : s === "우" ? 1 : 2;

  const entries: PartGroupEntry[] = [];
  for (const group of PART_GROUP_ORDER) {
    const items = bucket.get(group);
    if (!items || items.length === 0) continue;
    items.sort((a, b) => {
      const byNo = a.listing.listingNo.localeCompare(
        b.listing.listingNo,
        "ko",
      );
      if (byNo !== 0) return byNo;
      // 같은 접수번호(같은 개체) 내에서는 좌 → 우 → null 순.
      return sideRank(a.side) - sideRank(b.side);
    });
    entries.push({ group, count: items.length, items });
  }

  return entries;
}
