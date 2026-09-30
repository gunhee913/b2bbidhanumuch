import type { LiveListing, LivePart, LivePartBid } from "../api";

/**
 * `/api/listings/by-no/[listingNo]` 응답 (`CattleListing` shape) 을
 * `LiveListing` shape 으로 변환.
 *
 * 배송지시/경매내역 등 **마감된 과거 개체** 조회 컨텍스트에서 사용.
 *
 * 주요 변환:
 * 1. `company: { id, name, companyNo }` → `companyName`, `companyNo` (flat)
 * 2. 각 part 의 `highestBid` (마스킹) + `myBid` → `allBids: LivePartBid[]` 재구성
 *    - 표는 `allBids.some(b => b.rank != null)` 로 마감 여부를 판정한다
 *    - 낙찰 확정된 개체는 최소 1개 이상의 rank-부여 bid 가 있어야 낙찰자·낙찰가 표시
 * 3. 내 dealerId 를 넘겨받으면 · myBid 를 `dealerId` 로 태그 → 표가
 *    `myBidsByPart` 를 정확히 매핑할 수 있음
 */
export function toLiveListingFromByNo(
  raw: LivByNoResponse,
  dealerId?: string | null,
): LiveListing {
  const isSettledStatus = raw.status === "closed" || raw.status === "completed";

  const parts: LivePart[] = (raw.parts || []).map((p) => {
    const allBids: LivePartBid[] = [];
    const hasWinner = !!p.hasWinner && !!p.highestBid;
    const myBidIsWinning = !!p.myBid?.isWinning;

    if (p.highestBid) {
      allBids.push({
        id: `winner-${p.id}`,
        // 내가 낙찰자면 · dealerId 로 태그해서 표가 `won` 케이스 인식
        dealerId: myBidIsWinning ? dealerId || "self-winner" : "other",
        dealerNo: p.highestBid.dealerNo || "",
        dealerName: "",
        bidPrice: p.highestBid.bidPrice,
        bidAmount: p.highestBid.bidAmount,
        bidAt: null,
        rank: 1,
        isWinning: hasWinner,
      });
    }

    // 내 입찰이 있고, 내가 낙찰자가 아니라면 · 별도 bid 로 추가
    if (p.myBid && !myBidIsWinning) {
      allBids.push({
        id: p.myBid.bidId || `mine-${p.id}`,
        dealerId: dealerId || "self",
        dealerNo: "",
        dealerName: "",
        bidPrice: p.myBid.bidPrice,
        bidAmount: p.myBid.bidAmount,
        bidAt: null,
        // 마감된 개체는 순위 부여해서 isSettled 판정 통과
        rank: isSettledStatus ? 2 : null,
        isWinning: false,
      });
    }

    // 마감 상태인데 입찰 자체가 없는 경우 · rank 부여할 대상이 없어 유찰로 처리된다
    // (유찰이지만 아무도 입찰 안 함) · 이 케이스는 UI 에서 자연스럽게 "-" 처리됨

    // 회차 결정 · 낙찰가가 있으면 낙찰 회차, 없으면 내 입찰 회차, 그 외 null
    const roundNo = p.highestBid?.roundNo ?? p.myBid?.roundNo ?? null;

    // 비공개 입찰 · 서버 topBid 는 마감 후에만 채워진다 (진행 중 null).
    // highestBid 역시 서버가 마감 후에만 내려주므로 폴백으로 사용해도 유출은 없다.
    const topBid = p.topBid
      ? {
          bidPrice: p.topBid.bidPrice,
          bidAt: p.topBid.bidAt ?? null,
          isMine: !!p.topBid.isMine,
        }
      : p.highestBid
        ? {
            bidPrice: p.highestBid.bidPrice,
            bidAt: null,
            isMine: myBidIsWinning,
          }
        : null;

    return {
      id: p.id,
      partNo: p.partNo,
      partName: p.partName,
      listingPartNo: p.listingPartNo || "",
      weight: p.weight,
      minPrice: p.minPrice,
      bidCount: p.bidCount || allBids.length,
      highestBid: allBids.find((b) => b.rank === 1) || null,
      topBid,
      allBids,
      roundNo,
    };
  });

  return {
    id: raw.id,
    listingNo: raw.listingNo,
    listingDate: raw.listingDate,
    breed: raw.breed || "",
    gender: raw.gender || "",
    grade: raw.grade,
    marblingScore: raw.marblingScore,
    slaughterHouse: raw.slaughterHouse || "",
    slaughterDate: raw.slaughterDate,
    slaughterNo: raw.slaughterNo,
    monthAge: raw.monthAge,
    traceNo: raw.traceNo,
    carcassWeight: raw.carcassWeight,
    unitPrice: raw.unitPrice,
    backFat: raw.backFat,
    eyeMuscle: raw.eyeMuscle,
    meatColor: raw.meatColor,
    fatColor: raw.fatColor,
    texture: raw.texture,
    maturity: raw.maturity,
    processDate: raw.processDate,
    processWeight: raw.processWeight,
    images: raw.images || [],
    hasGradeCert: !!raw.gradeCert,
    hasSlaughterCert: !!raw.slaughterCert,
    status: (raw.status || "closed") as LiveListing["status"],
    companyId: raw.companyId || raw.company?.id || "",
    companyName: raw.company?.name || "",
    companyNo: raw.company?.companyNo,
    parts,
  };
}

/**
 * `by-no` API 응답 shape. 서버가 반환하는 필드에 한정된 partial 타입.
 * `CattleListing` 을 확장하여 마스킹된 입찰 정보를 추가로 포함.
 */
export interface LivByNoResponse {
  id: string;
  listingNo: string;
  listingDate: string;
  companyId: string;
  breed: string | null;
  gender: string | null;
  grade: string;
  marblingScore: number | null;
  monthAge: number | null;
  traceNo: string | null;
  slaughterHouse: string | null;
  slaughterDate: string | null;
  slaughterNo: string | null;
  carcassWeight: number | null;
  unitPrice: number | null;
  backFat: number | null;
  eyeMuscle: number | null;
  meatColor: number | null;
  fatColor: number | null;
  texture: number | null;
  maturity: number | null;
  processDate: string | null;
  processWeight: number | null;
  images: string[] | null;
  gradeCert?: { fileName: string } | null;
  slaughterCert?: { fileName: string } | null;
  status: string;
  company: { id: string; name: string; companyNo?: string } | null;
  parts: Array<{
    id: string;
    partNo: number;
    partName: string;
    listingPartNo: string | null;
    weight: number | null;
    minPrice: number | null;
    isIncluded: boolean;
    bidPrice: number | null;
    bidAmount: number | null;
    winningDealerId: string | null;
    bidAt: string | null;
    bidCount?: number;
    highestBid: {
      bidPrice: number;
      bidAmount: number;
      dealerNo: string;
      roundNo?: number | null;
    } | null;
    topBid?: {
      bidPrice: number;
      bidAt: string | null;
      isMine: boolean;
    } | null;
    hasWinner?: boolean;
    allBids?: unknown[];
    myBid?: {
      bidId: string;
      bidPrice: number;
      bidAmount: number;
      isWinning: boolean;
      roundNo?: number | null;
    } | null;
  }>;
}
