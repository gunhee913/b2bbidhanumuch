import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";

const supabase = getAdminClient();

/**
 * 부위 + 등급 조합의 최근 N일간 일별 낙찰 시세 시계열 API.
 *
 * Query:
 *   partName: 부위 그룹명 (좌/우 통합 · 예: "등심")
 *   grade:    등급 키 (예: "1++(9)", "1+", "1", "2", "3")
 *   yield:    (선택) 육량 등급 · "A" | "B" | "C" · 지정 시 grade 문자열 suffix 로 매칭
 *   days:     조회 일수 (default 7, max 730)
 *
 * Response:
 *   { series: { date, avg, min, max, count, listed }[], partName, grade, days }
 *   - count  : 낙찰 건수 (가격 통계의 분모)
 *   - listed : 마감(closed/completed)된 상장의 부위 건수 · 낙찰률 = count / listed
 *              진행 중(auction/approved) 상장은 아직 결과가 없으므로 listed 에 넣지 않는다
 */
const SETTLED_STATUSES = new Set(["closed", "completed"]);
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const partName = searchParams.get("partName");
    const gradeKey = searchParams.get("grade");
    const yieldParamRaw = searchParams.get("yield");
    const yieldFilter =
      yieldParamRaw === "A" || yieldParamRaw === "B" || yieldParamRaw === "C"
        ? yieldParamRaw
        : null;
    const days = Math.max(
      1,
      Math.min(730, parseInt(searchParams.get("days") || "7", 10)),
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
        winning_dealer_id,
        is_included,
        cattle_listings!inner (
          listing_date,
          grade,
          marbling_score,
          status
        )
      `,
      )
      .eq("is_included", true)
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
      listed: number;
      min: number;
      max: number;
    }
    const dailyMap = new Map<string, DailyAccumulator>();

    type ListingJoin = {
      listing_date: string | null;
      grade: string | null;
      status: string | null;
    };

    for (const row of data ?? []) {
      const rawName = (row.part_name as string | null) ?? "";
      const baseName = rawName.replace(/\(좌\)|\(우\)/g, "").trim();
      if (baseName !== targetPart) continue;

      const listingRaw = row.cattle_listings as unknown as
        | ListingJoin
        | ListingJoin[]
        | null;
      const listing = Array.isArray(listingRaw) ? listingRaw[0] : listingRaw;
      const date = listing?.listing_date;
      if (!date) continue;

      // 육량 후처리 필터 · grade 문자열 마지막 문자가 A/B/C 인지 확인.
      // Supabase ilike 는 `A/B/C` suffix 매칭이 애매해 클라이언트 필터로 처리.
      if (yieldFilter) {
        const g = (listing?.grade ?? "").trim();
        const suffix = g.match(/[ABC]$/)?.[0] ?? null;
        if (suffix !== yieldFilter) continue;
      }

      const price = row.bid_price as number | null;
      const isWon = !!row.winning_dealer_id && !!price && price > 0;
      const isSettled = SETTLED_STATUSES.has(listing?.status ?? "");
      if (!isWon && !isSettled) continue;

      const acc = dailyMap.get(date) ?? {
        sum: 0,
        count: 0,
        listed: 0,
        min: Infinity,
        max: -Infinity,
      };
      if (isSettled) acc.listed += 1;
      if (isWon) {
        acc.sum += price;
        acc.count += 1;
        acc.min = Math.min(acc.min, price);
        acc.max = Math.max(acc.max, price);
      }
      dailyMap.set(date, acc);
    }

    // days 범위의 모든 날짜를 채워 시계열 배열 생성 (건수 0 인 날짜도 포함).
    const series: {
      date: string;
      avg: number | null;
      min: number | null;
      max: number | null;
      count: number;
      listed: number;
    }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const acc = dailyMap.get(dateStr);
      if (acc && acc.count > 0) {
        series.push({
          date: dateStr,
          avg: Math.round(acc.sum / acc.count),
          min: acc.min,
          max: acc.max,
          count: acc.count,
          listed: acc.listed,
        });
      } else {
        series.push({
          date: dateStr,
          avg: null,
          min: null,
          max: null,
          count: 0,
          listed: acc?.listed ?? 0,
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
