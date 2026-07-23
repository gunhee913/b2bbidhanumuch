import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";

const supabase = getAdminClient();

const ACTIVE_STATUSES = ["approved", "auction", "completed", "closed"] as const;
const VALID_PERIODS = ["day", "week", "month"] as const;
type Period = (typeof VALID_PERIODS)[number];

const TOP_N = 7;

function formatDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function computeRange(
  anchor: Date,
  period: Period,
): { start: string; end: string } {
  const day = new Date(anchor);
  day.setHours(0, 0, 0, 0);
  const start = new Date(day);
  const end = new Date(day);

  if (period === "week") {
    const dayOfWeek = day.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    start.setDate(day.getDate() + diffToMonday);
  } else if (period === "month") {
    start.setDate(1);
  }

  return { start: formatDate(start), end: formatDate(end) };
}

async function findLatestBidListingDate(
  slaughterHouse: string | null,
): Promise<string | null> {
  let q = supabase
    .from("cattle_parts")
    .select(
      `
      bid_at,
      cattle_listings!inner (
        listing_date,
        status,
        slaughter_house
      )
      `,
    )
    .not("winning_dealer_id", "is", null)
    .not("bid_at", "is", null)
    .in(
      "cattle_listings.status",
      ACTIVE_STATUSES as unknown as string[],
    )
    .order("bid_at", { ascending: false })
    .limit(1);

  if (slaughterHouse) {
    q = q.eq("cattle_listings.slaughter_house", slaughterHouse);
  }

  const { data, error } = await q;
  if (error) {
    console.warn("findLatestBidListingDate error:", error);
    return null;
  }
  const row = data?.[0] as any;
  return row?.cattle_listings?.listing_date ?? null;
}

function formatGradeLabel(
  grade: string | null,
  marbling: number | null,
): string {
  if (!grade) return "";
  if (grade.includes("(")) return grade;
  if (marbling && grade.startsWith("1++")) return `${grade}(${marbling})`;
  return grade;
}

type PartRow = {
  partName: string;
  grade: string;
  companyName: string;
  slaughterHouse: string;
  weight: number;
  bidPrice: number;
  bidAmount: number;
  isWinning: boolean;
};

async function fetchAllParts(
  range: { start: string; end: string },
  slaughterHouse: string | null,
): Promise<PartRow[]> {
  let listingsQuery = supabase
    .from("cattle_listings")
    .select(
      `
      id,
      listing_date,
      grade,
      marbling_score,
      slaughter_house,
      companies (
        id,
        name
      ),
      cattle_parts (
        id,
        part_name,
        weight,
        bid_price,
        bid_amount,
        winning_dealer_id,
        bid_at,
        is_included
      )
    `,
    )
    .in("status", ACTIVE_STATUSES as unknown as string[])
    .gte("listing_date", range.start)
    .lte("listing_date", range.end);

  if (slaughterHouse) {
    listingsQuery = listingsQuery.eq("slaughter_house", slaughterHouse);
  }

  const { data: listings, error } = await listingsQuery;
  if (error) {
    throw new Error(error.message);
  }

  const parts: PartRow[] = [];
  (listings ?? []).forEach((listing: any) => {
    const gradeLabel = formatGradeLabel(
      listing.grade ?? null,
      listing.marbling_score ?? null,
    );
    const companyName = listing.companies?.name ?? "";
    const slaughter = listing.slaughter_house ?? "";

    (listing.cattle_parts ?? []).forEach((p: any) => {
      if (!p.is_included) return;
      if (!p.part_name) return;

      const isWinning = !!p.winning_dealer_id;
      const price = Number(p.bid_price) || 0;
      const amount = Number(p.bid_amount) || 0;

      parts.push({
        partName: p.part_name,
        grade: gradeLabel,
        companyName,
        slaughterHouse: slaughter,
        weight: Number(p.weight) || 0,
        bidPrice: isWinning ? price : 0,
        bidAmount: isWinning ? amount : 0,
        isWinning,
      });
    });
  });

  return parts;
}

function aggregate(parts: PartRow[]) {
  const winningParts = parts.filter(
    (p) => p.isWinning && p.bidAmount > 0 && p.bidPrice > 0,
  );

  // 총경락금액 랭킹은 "개별 낙찰 건" 기준으로 상위 N 개를 보여준다.
  // (같은 부위가 여러 건 팔렸다면 각각 별개 랭킹으로 노출)
  const byAmount = winningParts
    .slice()
    .sort((a, b) => b.bidAmount - a.bidAmount)
    .slice(0, TOP_N)
    .map(({ isWinning: _isWinning, ...rest }) => rest);

  const partMap = new Map<
    string,
    { listed: number; won: number; totalAmount: number }
  >();
  parts.forEach((p) => {
    const s = partMap.get(p.partName) ?? {
      listed: 0,
      won: 0,
      totalAmount: 0,
    };
    s.listed += 1;
    if (p.isWinning) {
      s.won += 1;
      s.totalAmount += p.bidAmount;
    }
    partMap.set(p.partName, s);
  });

  const byPart = Array.from(partMap.entries())
    .map(([partName, s]) => ({
      partName,
      listingCount: s.listed,
      winningCount: s.won,
      winningRate: s.listed > 0 ? s.won / s.listed : 0,
      totalAmount: s.totalAmount,
    }))
    .sort(
      (a, b) =>
        b.winningCount - a.winningCount || b.listingCount - a.listingCount,
    )
    .slice(0, TOP_N);

  return { byAmount, byPart };
}

/**
 * 실 데이터가 하나도 없을 때 UI 미리보기용 샘플 부위 데이터.
 * deterministic 하게 생성해 매 요청 동일한 결과 반환.
 */
function buildMockParts(): PartRow[] {
  const config: Array<{
    name: string;
    total: number;
    won: number;
    grade: string;
    weight: number;
    price: number;
  }> = [
    { name: "등심(좌)", total: 32, won: 28, grade: "1++A(9)", weight: 12.5, price: 148000 },
    { name: "안심", total: 24, won: 20, grade: "1++A(9)", weight: 8.2, price: 142000 },
    { name: "채끝", total: 22, won: 18, grade: "1++B(8)", weight: 10.4, price: 135000 },
    { name: "등심(우)", total: 30, won: 26, grade: "1++A(8)", weight: 12.3, price: 132000 },
    { name: "부채", total: 18, won: 14, grade: "1+A", weight: 6.8, price: 118000 },
    { name: "설도(좌)", total: 20, won: 16, grade: "1A", weight: 14.2, price: 88000 },
    { name: "앞다리", total: 16, won: 12, grade: "1B", weight: 15.6, price: 62000 },
    { name: "치마", total: 14, won: 10, grade: "1++A(9)", weight: 5.9, price: 92000 },
    { name: "업진", total: 12, won: 9, grade: "1A", weight: 7.1, price: 85000 },
    { name: "목심", total: 10, won: 8, grade: "1B", weight: 11.4, price: 58000 },
    { name: "우둔", total: 15, won: 11, grade: "1B", weight: 13.2, price: 55000 },
    { name: "사태", total: 12, won: 9, grade: "2A", weight: 9.4, price: 48000 },
  ];
  const companies = ["농협안심", "우진식품", "대성유통", "정직한식자재", "한우촌"];
  const houses = ["농협 음성", "농협 부천", "농협 고령", "농협 나주"];

  const parts: PartRow[] = [];
  config.forEach((c, i) => {
    for (let j = 0; j < c.total; j++) {
      const isWinning = j < c.won;
      parts.push({
        partName: c.name,
        grade: c.grade,
        companyName: companies[(i + j) % companies.length],
        slaughterHouse: houses[(i + j) % houses.length],
        weight: c.weight,
        bidPrice: isWinning ? c.price : 0,
        bidAmount: isWinning ? Math.round(c.price * c.weight) : 0,
        isWinning,
      });
    }
  });
  return parts;
}

/**
 * 현재 기간에 낙찰이 `TOP_N` 미만이면 화면이 텅 비어 보이므로,
 * 최근 낙찰이 있었던 시점을 기준으로 좀 더 넓은 기간을 다시 조회한다.
 * 실 낙찰이 하나라도 있으면 그 데이터로 표시하되 `isFallback: true` 로 표시.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const periodParam = (searchParams.get("period") ?? "day") as Period;
    const period: Period = (VALID_PERIODS as readonly string[]).includes(
      periodParam,
    )
      ? periodParam
      : "day";
    const slaughterHouse = searchParams.get("slaughter_house");

    let range = computeRange(new Date(), period);
    let parts = await fetchAllParts(range, slaughterHouse);
    let isFallback = false;
    let isMock = false;

    const winningCount = parts.filter((p) => p.isWinning).length;
    if (winningCount < TOP_N) {
      const latest = await findLatestBidListingDate(slaughterHouse);
      if (latest) {
        const [y, m, d] = latest.split("-").map(Number);
        const anchor = new Date(y, m - 1, d);
        const fallbackRange = computeRange(anchor, period);
        // 다른 기간을 조회해서 실 낙찰이 더 많으면 교체하고 fallback 표시
        const sameRange =
          fallbackRange.start === range.start && fallbackRange.end === range.end;
        if (!sameRange) {
          const fallbackParts = await fetchAllParts(
            fallbackRange,
            slaughterHouse,
          );
          const fallbackCount = fallbackParts.filter((p) => p.isWinning).length;
          if (fallbackCount > winningCount) {
            range = fallbackRange;
            parts = fallbackParts;
            isFallback = true;
          }
        }
      }
    }

    if (!parts.some((p) => p.isWinning)) {
      parts = buildMockParts();
      isMock = true;
    }

    const { byAmount, byPart } = aggregate(parts);

    return NextResponse.json({
      period,
      range,
      isFallback,
      isMock,
      byAmount,
      byPart,
    });
  } catch (err) {
    console.error("auction-rankings error:", err);
    return NextResponse.json(
      { error: "경매 랭킹 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
