import type { AuctionResult } from "@/features/bids/types";
import type { AssignmentInfo } from "@/features/delivery/types";

/**
 * 거래처로 거르기 · 경매통계 머리의 고르개가 쓴다.
 *
 * **거래처는 딴 것에만 붙는다.** 배정이란 「이 고기를 어디로 보낼까」 라서, 못 딴
 * 건에는 보낼 물건 자체가 없다. 그래서 거래처를 하나 고르는 순간 미낙찰은 통째로
 * 빠지고 남는 것은 낙찰뿐이다 — 거르개가 「어디로 갔나」 를 묻는 이상 피할 수 없고,
 * 부르는 쪽은 이걸 알고 낙찰률 도넛과 미낙찰 탭을 접어야 한다.
 */

/** 「거르지 않음」 · `TableFilterPicker` 와 같은 약속 */
export const PARTNER_ALL = "";

/**
 * 아직 거래처를 안 정한 낙찰 건.
 *
 * 한 칸을 따로 내준 건 이게 **대부분**이기 때문이다. 이 딜러는 딴 933건 중 205건
 * (22%)만 배정돼 있다. 「미지정」 이 없으면 나머지 728건은 전체 말고는 어디서도 못
 * 보고, 거래처 셋을 더해도 전체에 한참 못 미치는 까닭이 화면에 안 나온다.
 *
 * 거래처 이름과 같은 자리에 서는 글자라 이름이 「미지정」 인 거래처가 있으면 둘이
 * 겹친다. 실제로 그런 이름을 쓰는 곳은 없다고 보고 그대로 둔다.
 */
export const PARTNER_UNASSIGNED = "미지정";

/** `/api/delivery/assignments` 가 주는 `partId` → 배정 정보 */
export type AssignmentIndex = Record<string, AssignmentInfo>;

const partnerOf = (r: AuctionResult, assignments: AssignmentIndex) =>
  assignments[r.partId]?.partnerName || PARTNER_UNASSIGNED;

export interface PartnerOptions {
  /** 고르개에 세울 차례대로 · 「미지정」 은 늘 맨 뒤 */
  names: string[];
  /** 이름 → 낙찰 건수 · 「전체」(`PARTNER_ALL`) 는 일부러 비워 둔다 */
  counts: Record<string, number>;
}

/**
 * 고를 수 있는 거래처 · **자료에 실제로 나온 곳만** 세운다.
 *
 * 등록된 거래처를 통째로 깔면 한 건도 안 보낸 곳을 눌러 빈 화면을 보게 되는데,
 * 거른 결과가 빈 것인지 애초에 거래가 없던 것인지 구분이 안 된다.
 *
 * 차례는 건수 많은 순이다 (도넛과 같은 셈 — 큰 것이 먼저). 「미지정」 만 덩치와
 * 상관없이 맨 뒤로 뺀다. 남은 것을 모아 둔 자리라 거래처들과 같은 줄에서 크기를
 * 겨룰 것이 아니고, 대개 가장 커서 앞에 두면 진짜 거래처들을 아래로 밀어낸다.
 *
 * 「전체」 에는 건수를 안 적는다. 전체는 미낙찰까지 품는데 거래처별은 낙찰만 세므로,
 * 나란히 적으면 아래 숫자들을 더해도 위 숫자가 안 나오는 표가 된다.
 */
export function buildPartnerOptions(
  results: AuctionResult[],
  assignments: AssignmentIndex,
): PartnerOptions {
  const counts: Record<string, number> = {};
  for (const r of results) {
    if (r.result !== "won") continue;
    const name = partnerOf(r, assignments);
    counts[name] = (counts[name] ?? 0) + 1;
  }

  const names = Object.keys(counts).sort((a, b) => {
    if (a === PARTNER_UNASSIGNED) return 1;
    if (b === PARTNER_UNASSIGNED) return -1;
    return counts[b] - counts[a];
  });

  return { names, counts };
}

/** 고른 거래처로 추린 줄 · 「전체」 면 손대지 않는다 (미낙찰까지 그대로 남는다) */
export function filterByPartner(
  results: AuctionResult[],
  partner: string,
  assignments: AssignmentIndex,
): AuctionResult[] {
  if (partner === PARTNER_ALL) return results;
  return results.filter(
    (r) => r.result === "won" && partnerOf(r, assignments) === partner,
  );
}
