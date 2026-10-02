import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { parseGrade } from "@/features/live-auction/lib/grade";
import { fetchAllRows } from "@/lib/supabase-paginate";

const supabase = getAdminClient();

/**
 * 부위 × 육질등급 × 육량등급 낙찰 시세 요약 API.
 *
 * Query:
 *   startDate: YYYY-MM-DD (필수)
 *   endDate:   YYYY-MM-DD (필수)
 *
 * Response:
 *   {
 *     startDate, endDate,
 *     rows: [{
 *       partName,    // "등심" (좌/우 통합)
 *       grade,       // "1++(9)" | "1++(8)" | "1++(7)" | "1+" | "1" | "2" | "3"
 *       yieldGrade,  // "A" | "B" | "C" | null (등급 글자에 안 적혀 있던 것)
 *       count,
 *       weightSum,   // kg · 중량이 적힌 것만
 *       weightCount, // 중량이 적힌 건수 · 평균을 내는 분모
 *       priceSum,    // 원/kg 합
 *       priceMin,    // 원/kg 최저
 *       priceMax,    // 원/kg 최고
 *       amountSum,   // 원 합 (bid_price * weight)
 *     }]
 *   }
 *
 * **평균이 아니라 합을 내보낸다.** 「육량등급 통합」 을 누르면 A·B·C 세 줄이 한
 * 줄로 합쳐지는데, 평균만 받아 두면 셋을 다시 합칠 수가 없다 (건수가 다른 평균의
 * 평균은 평균이 아니다). 토글 한 번에 서버를 다시 다녀오는 대신 합을 넘겨 받고
 * 나누는 일만 화면에서 한다. 최고·최저는 합칠 때 더 작은 쪽·더 큰 쪽만 고르면 되므로
 * 같은 차례에 함께 실어 보낸다.
 *
 * 육질등급 거르개는 뺐다. 화면이 부위 탭으로 갈려 한 번에 한 부위의 등급 줄만
 * 보이게 되면서, 거르개가 하던 일(백 줄짜리 표 좁히기)이 사라졌다. 게다가 예전
 * 필터는 `grade` 칸을 통째로 맞춰 봐서 `1++A(9)` 로 담긴 줄은 하나도 못 걸렀다.
 */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const todayStr = () => new Date().toISOString().split("T")[0];

interface Bucket {
  count: number;
  weightSum: number;
  weightCount: number;
  priceSum: number;
  priceMin: number;
  priceMax: number;
  amountSum: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startRaw = searchParams.get("startDate");
    const endRaw = searchParams.get("endDate");
    const startDate =
      startRaw && DATE_PATTERN.test(startRaw) ? startRaw : todayStr();
    const endDate = endRaw && DATE_PATTERN.test(endRaw) ? endRaw : todayStr();

    /* 기간을 한 해로 잡으면 한 번에 받는 상한을 넘는다 · 쪽을 나눠 끝까지 받는다 */
    const data = await fetchAllRows((from, to) =>
      supabase
        .from("cattle_parts")
        .select(
          `
        part_name,
        bid_price,
        weight,
        cattle_listings!inner (
          listing_date,
          grade,
          marbling_score
        )
      `,
        )
        .not("winning_dealer_id", "is", null)
        .not("bid_price", "is", null)
        .gte("cattle_listings.listing_date", startDate)
        .lte("cattle_listings.listing_date", endDate)
        .order("id", { ascending: true })
        .range(from, to),
    );

    interface ListingRow {
      grade: string | null;
      marbling_score: number | null;
    }

    /** key = `${part}||${grade}||${yield ?? ""}` */
    const buckets = new Map<string, Bucket>();

    for (const row of data ?? []) {
      const price = row.bid_price as number | null;
      const weight = row.weight as number | null;
      if (!price || price <= 0) continue;

      const rawName = (row.part_name as string | null) ?? "";
      const partName = rawName.replace(/\(좌\)|\(우\)/g, "").trim();
      if (!partName) continue;

      const listingRaw = row.cattle_listings as unknown as
        ListingRow | ListingRow[] | null;
      const listing = Array.isArray(listingRaw) ? listingRaw[0] : listingRaw;
      const parsed = parseGrade(listing?.grade);
      if (!parsed) continue;

      /* 근내지방도는 등급 글자에 붙어 있으면 그걸, 없으면 제 칸을 본다 */
      const marbling = parsed.marbling ?? listing?.marbling_score ?? null;
      const gradeKey =
        parsed.quality === "1++" && marbling != null
          ? `1++(${marbling})`
          : parsed.quality;

      const key = `${partName}||${gradeKey}||${parsed.yieldGrade ?? ""}`;
      const bucket = buckets.get(key) ?? {
        count: 0,
        weightSum: 0,
        weightCount: 0,
        priceSum: 0,
        priceMin: Infinity,
        priceMax: 0,
        amountSum: 0,
      };
      bucket.count += 1;
      bucket.priceSum += price;
      if (price < bucket.priceMin) bucket.priceMin = price;
      if (price > bucket.priceMax) bucket.priceMax = price;
      if (weight && weight > 0) {
        bucket.weightSum += weight;
        bucket.weightCount += 1;
        bucket.amountSum += price * weight;
      }
      buckets.set(key, bucket);
    }

    const rows = Array.from(buckets.entries()).map(([key, b]) => {
      const [partName, grade, yieldRaw] = key.split("||");
      return {
        partName,
        grade,
        yieldGrade: yieldRaw || null,
        count: b.count,
        weightSum: Math.round(b.weightSum * 10) / 10,
        weightCount: b.weightCount,
        priceSum: Math.round(b.priceSum),
        priceMin: Math.round(b.priceMin),
        priceMax: Math.round(b.priceMax),
        amountSum: Math.round(b.amountSum),
      };
    });

    return NextResponse.json({ startDate, endDate, rows });
  } catch (err) {
    console.error("part-grade-prices error:", err);
    return NextResponse.json(
      { error: "부위·등급 시세 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
