import { partition } from "es-toolkit";
import type { AssignmentInfo, WinningPart } from "../types";
import type { DeliveryGroupBy } from "../hooks/useDeliveryPrefs";

/**
 * 표 한 묶음 · 머리에서 묶음 전체를 한 거래처로 보낼 수 있다.
 *
 * 축이 셋인 이유는 중도매인이 세 가지로 생각하기 때문이다 — 「오늘 등심은 어디로」
 * (부위별), 「이 소는 통째로 어디로」(개체별), 그리고 「대한식당에 오늘 뭐가 가나」
 * (거래처별). 하나만 두면 나머지 일을 할 때 같은 결정을 열 번 되풀이하게 된다.
 *
 * 거래처별은 넣는 축이 아니라 **내보내는 축**이다. 배정을 다 끝낸 뒤 거래처별로
 * 접어 보면 그게 그대로 배송 목록이라, 송장을 뽑기 전에 눈으로 검산할 수 있다.
 */
export interface PartGroup {
  key: string;
  /** 머리에 크게 적는 이름 · 부위별이면 부위명, 개체별이면 접수번호 */
  title: string;
  /** 이름 옆에 붙는 꼬리표 · 개체별일 때 등급 */
  subtitle: string | null;
  rows: WinningPart[];
  totalWeight: number;
  totalAmount: number;
}

/** 좌/우를 떼어 한 부위로 합친다 (`등심(좌)` · `등심(우1)` → `등심`) */
const normalizePartName = (name: string): string =>
  name.replace(/\s*\([좌우][^)]*\)\s*$/, "").trim();

const compareListingNo = (a: string, b: string) =>
  a.localeCompare(b, "ko-KR", { numeric: true });

/** 거래처별에서 아직 안 정한 것들이 모이는 자리 · 늘 맨 위에 선다 */
export const UNASSIGNED_KEY = "__unassigned__";

/** 거래처별로 묶을 때 필요한 바깥 사정 · 부위별·개체별에는 쓰이지 않는다 */
export interface GroupContext {
  partnerNameById: ReadonlyMap<string, string>;
  saved: Record<string, AssignmentInfo>;
  dirty: Record<string, string | null>;
}

export function groupWinningParts(
  parts: readonly WinningPart[],
  groupBy: DeliveryGroupBy,
  ctx?: GroupContext,
): PartGroup[] {
  const map = new Map<string, PartGroup>();

  const keyOf = (p: WinningPart): string => {
    if (groupBy === "part") return normalizePartName(p.partName);
    if (groupBy === "entity") return p.listingId;
    return (
      (ctx && effectivePartnerId(p.partId, ctx.saved, ctx.dirty)) ??
      UNASSIGNED_KEY
    );
  };

  const titleOf = (p: WinningPart, key: string): string => {
    if (groupBy === "part") return normalizePartName(p.partName);
    if (groupBy === "entity") return p.listingNo;
    if (key === UNASSIGNED_KEY) return "미정";
    return ctx?.partnerNameById.get(key) ?? "거래처";
  };

  for (const p of parts) {
    const key = keyOf(p);
    const hit = map.get(key);
    if (hit) {
      hit.rows.push(p);
      hit.totalWeight += p.weight;
      hit.totalAmount += p.bidAmount;
      continue;
    }
    map.set(key, {
      key,
      title: titleOf(p, key),
      subtitle: groupBy === "entity" ? p.grade : null,
      rows: [p],
      totalWeight: p.weight,
      totalAmount: p.bidAmount,
    });
  }

  const groups = Array.from(map.values());
  for (const g of groups) {
    g.rows.sort(
      (a, b) =>
        compareListingNo(a.listingNo, b.listingNo) || a.partNo - b.partNo,
    );
  }

  /*
   * 부위별은 건수가 많은 묶음부터 · 한 번에 가장 많이 처리되는 것이 맨 위에 와야
   * 스크롤하기 전에 일이 줄어든다. 개체별은 접수번호 순 — 거기선 차례 자체가 뜻이다.
   * 거래처별은 미정을 맨 위에 놓는다 · 남은 일이 먼저 보여야 한다.
   */
  if (groupBy === "entity") {
    return groups.sort((a, b) => compareListingNo(a.title, b.title));
  }
  if (groupBy === "partner") {
    return groups.sort((a, b) => {
      if (a.key === UNASSIGNED_KEY) return -1;
      if (b.key === UNASSIGNED_KEY) return 1;
      return a.title.localeCompare(b.title, "ko-KR");
    });
  }
  return groups.sort(
    (a, b) =>
      b.rows.length - a.rows.length || a.title.localeCompare(b.title, "ko-KR"),
  );
}

/**
 * 미정 먼저 · 미정이 낀 묶음을 위로, 묶음 안에서도 미정 줄을 위로. 나머지는 제 차례대로.
 *
 * 무엇이 미정인지는 부르는 쪽이 **저장된 값**으로 묻는다. 고치는 중인 값으로 물으면
 * 숫자 키로 거래처를 넣는 순간 그 줄이 아래로 사라져, 방금 넣은 것을 눈으로 확인할
 * 수가 없다. 저장된 값이면 넣은 줄은 제자리에 남고 커서만 다음 미정으로 내려간다.
 */
export function liftUndecided(
  groups: readonly PartGroup[],
  isUndecided: (part: WinningPart) => boolean,
): PartGroup[] {
  const lifted = groups.map((g) => {
    const [undecided, decided] = partition(g.rows, isUndecided);
    return {
      group: { ...g, rows: [...undecided, ...decided] },
      hasUndecided: undecided.length > 0,
    };
  });
  const [withUndecided, rest] = partition(lifted, (x) => x.hasUndecided);
  return [...withUndecided, ...rest].map((x) => x.group);
}

/** 커서(↑/↓)가 훑는 차례 · 화면에 보이는 줄 순서 그대로 */
export function flattenGroups(groups: readonly PartGroup[]): string[] {
  return groups.flatMap((g) => g.rows.map((r) => r.partId));
}

export interface AssignCounts {
  total: number;
  /** 서버에 들어간 것 */
  saved: number;
  /** 저장 전 바꾼 것 */
  pending: number;
  /** 아직 아무것도 안 정한 것 */
  unassigned: number;
}

/**
 * 지금 이 부위에 적용되는 거래처 · 저장 전 변경이 서버 값을 덮는다.
 *
 * 저장된 것도 다시 고를 수 있어야 해서 이 순서다. 예전 화면은 저장되면 칸을 잠가
 * 버려서, 거래처를 잘못 넣으면 DB 를 직접 건드리는 수밖에 없었다.
 */
export function effectivePartnerId(
  partId: string,
  saved: Record<string, AssignmentInfo>,
  dirty: Record<string, string | null>,
): string | null {
  const pending = dirty[partId];
  if (pending !== undefined) return pending;
  return saved[partId]?.partnerId ?? null;
}

export function countAssignments(
  parts: readonly WinningPart[],
  saved: Record<string, AssignmentInfo>,
  dirty: Record<string, string | null>,
): AssignCounts {
  let savedCount = 0;
  let pending = 0;
  let unassigned = 0;

  for (const p of parts) {
    const changed = dirty[p.partId] !== undefined;
    if (changed) {
      if (dirty[p.partId]) pending++;
      else unassigned++;
      continue;
    }
    if (saved[p.partId]) savedCount++;
    else unassigned++;
  }

  return {
    total: parts.length,
    saved: savedCount,
    pending,
    unassigned,
  };
}
