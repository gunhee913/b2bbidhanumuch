import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";

const supabase = getAdminClient();

/**
 * 부위 × 등급 조합별 낙찰 시세 요약 API.
 *
 * Query:
 *   startDate: YYYY-MM-DD (필수)
 *   endDate:   YYYY-MM-DD (필수)
 *   grade:     (선택) 육질등급 exact 필터 · "1++" | "1+" | "1" | "2" | "3"
 *
 * Response:
 *   {
 *     startDate, endDate, grade,
 *     rows: [{
 *       partName,             // "등심" (좌/우 통합)
 *       grade,                // "1++(9)" | "1++(8)" | "1++(7)" | "1+" | "1" | "2" | "3"
 *       minWeight, maxWeight, avgWeight,   // kg
 *       minPrice, maxPrice, avgPrice,      // 원/kg
 *       minAmount, maxAmount, avgAmount,   // 원 (bid_price * weight)
 *       count,
 *     }]
 *   }
 */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const todayStr = () => new Date().toISOString().split("T")[0];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startRaw = searchParams.get("startDate");
    const endRaw = searchParams.get("endDate");
    const startDate =
      startRaw && DATE_PATTERN.test(startRaw) ? startRaw : todayStr();
    const endDate =
      endRaw && DATE_PATTERN.test(endRaw) ? endRaw : todayStr();

    const gradeRaw = searchParams.get("grade");
    const gradeFilter = gradeRaw && gradeRaw !== "all" ? gradeRaw : null;

    let query = supabase
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
      .lte("cattle_listings.listing_date", endDate);

    if (gradeFilter) {
      // 등급 컬럼은 "1++" | "1+" | "1" | "2" | "3" 문자열 저장 · exact match 로 필터
      // marbling 세부(9/8/7)는 컬럼 병합이 아니라 별도 컬럼이므로 exact 로 충분
      query = query.eq("cattle_listings.grade", gradeFilter);
    }

    const { data, error } = await query;
    if (error) {
      console.error("part-grade-prices query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    interface ListingRow {
      grade: string | null;
      marbling_score: number | null;
    }

    interface Bucket {
      prices: number[];
      weights: number[];
      amounts: number[];
    }

    const buckets = new Map<string, Bucket>(); // key = `${part}||${grade}`

    for (const row of data ?? []) {
      const price = row.bid_price as number | null;
      const weight = row.weight as number | null;
      if (!price || price <= 0) continue;

      const rawName = (row.part_name as string | null) ?? "";
      const partName = rawName.replace(/\(좌\)|\(우\)/g, "").trim();
      if (!partName) continue;

      const listingRaw = row.cattle_listings as unknown as
        | ListingRow
        | ListingRow[]
        | null;
      const listing = Array.isArray(listingRaw) ? listingRaw[0] : listingRaw;
      const gradeStr = (listing?.grade ?? "").trim();
      const qualityMatch = gradeStr.match(/^(1\+\+|1\+|1|2|3)/);
      const quality = qualityMatch?.[1];
      if (!quality) continue;

      const gradeKey =
        quality === "1++" && listing?.marbling_score != null
          ? `1++(${listing.marbling_score})`
          : quality;

      const key = `${partName}||${gradeKey}`;
      const bucket = buckets.get(key) ?? {
        prices: [],
        weights: [],
        amounts: [],
      };
      bucket.prices.push(price);
      if (weight && weight > 0) {
        bucket.weights.push(weight);
        bucket.amounts.push(price * weight);
      }
      buckets.set(key, bucket);
    }

    const rows = Array.from(buckets.entries()).map(([key, b]) => {
      const [partName, grade] = key.split("||");
      const priceSum = b.prices.reduce((a, x) => a + x, 0);
      const weightSum = b.weights.reduce((a, x) => a + x, 0);
      const amountSum = b.amounts.reduce((a, x) => a + x, 0);
      return {
        partName,
        grade,
        minWeight: b.weights.length > 0 ? Math.min(...b.weights) : 0,
        maxWeight: b.weights.length > 0 ? Math.max(...b.weights) : 0,
        avgWeight:
          b.weights.length > 0
            ? Math.round((weightSum / b.weights.length) * 10) / 10
            : 0,
        minPrice: Math.min(...b.prices),
        maxPrice: Math.max(...b.prices),
        avgPrice: Math.round(priceSum / b.prices.length),
        minAmount: b.amounts.length > 0 ? Math.min(...b.amounts) : 0,
        maxAmount: b.amounts.length > 0 ? Math.max(...b.amounts) : 0,
        avgAmount:
          b.amounts.length > 0 ? Math.round(amountSum / b.amounts.length) : 0,
        count: b.prices.length,
      };
    });

    return NextResponse.json({
      startDate,
      endDate,
      grade: gradeFilter || "all",
      rows,
    });
  } catch (err) {
    console.error("part-grade-prices error:", err);
    return NextResponse.json(
      { error: "부위·등급 시세 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
