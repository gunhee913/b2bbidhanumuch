import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";

const supabase = getAdminClient();

/**
 * 부위 + 등급 조합의 최근 N일간 일별 낙찰 시세 시계열 API.
 *
 * Query:
 *   partName: 부위 그룹명 (좌/우 통합 · 예: "등심")
 *   grade:    등급 키 (예: "1++(9)", "1+", "1", "2", "3")
 *   days:     조회 일수 (default 7)
 *
 * Response:
 *   { series: { date, avg, min, max, count }[], partName, grade, days }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const partName = searchParams.get("partName");
    const gradeKey = searchParams.get("grade");
    const days = Math.max(
      1,
      Math.min(30, parseInt(searchParams.get("days") || "7", 10)),
    );

    if (!partName || !gradeKey) {
      return NextResponse.json(
        { error: "partName · grade 는 필수 파라미터입니다." },
        { status: 400 },
      );
    }

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days + 1);
    const sinceDateStr = sinceDate.toISOString().split("T")[0];

    // gradeKey → 등급 매칭 prefix. "1++(9)" 는 marbling_score=9 로 별도 필터.
    const qualityMatch = gradeKey.match(/^(1\+\+|1\+|1|2|3)/);
    const qualityGrade = qualityMatch?.[1] ?? gradeKey;
    const marblingMatch = gradeKey.match(/\((\d+)\)/);
    const marblingScore = marblingMatch ? parseInt(marblingMatch[1], 10) : null;

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
      .gte("cattle_listings.listing_date", sinceDateStr)
      .ilike("cattle_listings.grade", `${qualityGrade}%`);

    if (marblingScore != null) {
      query = query.eq("cattle_listings.marbling_score", marblingScore);
    }

    const { data, error } = await query;
    if (error) {
      console.error("part-price-series query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const targetPart = partName.trim();

    interface DailyAccumulator {
      sum: number;
      count: number;
      min: number;
      max: number;
    }
    const dailyMap = new Map<string, DailyAccumulator>();

    for (const row of data ?? []) {
      const rawName = (row.part_name as string | null) ?? "";
      const baseName = rawName.replace(/\(좌\)|\(우\)/g, "").trim();
      if (baseName !== targetPart) continue;

      const price = row.bid_price as number | null;
      if (!price || price <= 0) continue;

      const listingRaw = row.cattle_listings as unknown as
        | { listing_date: string | null }
        | { listing_date: string | null }[]
        | null;
      const listing = Array.isArray(listingRaw) ? listingRaw[0] : listingRaw;
      const date = listing?.listing_date;
      if (!date) continue;

      const acc = dailyMap.get(date) ?? {
        sum: 0,
        count: 0,
        min: Infinity,
        max: -Infinity,
      };
      acc.sum += price;
      acc.count += 1;
      acc.min = Math.min(acc.min, price);
      acc.max = Math.max(acc.max, price);
      dailyMap.set(date, acc);
    }

    // days 범위의 모든 날짜를 채워 시계열 배열 생성 (건수 0 인 날짜도 포함).
    const series: {
      date: string;
      avg: number | null;
      min: number | null;
      max: number | null;
      count: number;
    }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const acc = dailyMap.get(dateStr);
      if (acc) {
        series.push({
          date: dateStr,
          avg: Math.round(acc.sum / acc.count),
          min: acc.min,
          max: acc.max,
          count: acc.count,
        });
      } else {
        series.push({
          date: dateStr,
          avg: null,
          min: null,
          max: null,
          count: 0,
        });
      }
    }

    return NextResponse.json({
      series,
      partName: targetPart,
      grade: gradeKey,
      days,
    });
  } catch (error) {
    console.error("part-price-series error:", error);
    return NextResponse.json(
      { error: "시세 시계열 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
