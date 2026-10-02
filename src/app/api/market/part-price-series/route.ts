import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { parseGrade } from "@/features/live-auction/lib/grade";
import { fetchAllRows } from "@/lib/supabase-paginate";

const supabase = getAdminClient();

/**
 * 부위 + 등급 조합의 최근 N일간 일별 낙찰 시세 시계열 API.
 *
 * Query:
 *   partName: 부위 그룹명 (좌/우 통합 · 예: "등심")
 *   grade:    등급 키 (예: "1++(9)", "1+", "1", "2", "3")
 *   yield:    (선택) 육량 등급 · "A" | "B" | "C" · 비우면 셋을 합친다
 *   days:     조회 일수 (default 7, max 730)
 *
 * Response:
 *   { series: { date, avg, min, max, weight, amount, count, listed }[], partName, grade, days }
 *   - count  : 낙찰 건수 (단가 통계의 분모)
 *   - weight : 평균 중량 kg · 중량이 적힌 건만 (null 이면 적힌 것이 없음)
 *   - amount : 평균 낙찰대금 원 · 단가 × 중량의 평균 · 분모는 중량이 적힌 건수
 *   - listed : 마감(closed/completed)된 상장의 부위 건수 · 낙찰률 = count / listed
 *              진행 중(auction/approved) 상장은 아직 결과가 없으므로 listed 에 넣지 않는다
 *
 * **등급 짝맞추기는 `parseGrade` 가 맡는다.** 예전에는 근내지방도를 `marbling_score`
 * 칸에서만 찾고 육량을 글자 꼬리의 `[ABC]` 로 찾았는데, 지금 자료는 `1++A(9)` 처럼 한
 * 칸에 셋이 들어 있다 — 괄호가 꼬리라 육량을 놓치고, 근내지방도는 제 칸이 비어 있어
 * `eq(marbling_score, 9)` 에 통째로 걸러졌다. 그래서 요 몇 달 치 낙찰이 시계열에서
 * 통으로 빠져 차트가 표본 자료로 떨어져 있었다.
 */
const SETTLED_STATUSES = new Set(["closed", "completed"]);

interface DailyAccumulator {
  priceSum: number;
  count: number;
  listed: number;
  min: number;
  max: number;
  weightSum: number;
  weightCount: number;
  amountSum: number;
}

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

    /** 찾는 등급 열쇠를 육질 + 근내지방도로 가른다 · `1++(9)` → 1++ · 9 */
    const wanted = parseGrade(gradeKey);
    const wantedQuality = wanted?.quality ?? gradeKey;
    const wantedMarbling = wanted?.marbling ?? null;

    /*
     * 거친 체만 DB 에 맡긴다. `1%` 는 `1++` 와 `1+` 까지 함께 걸러 오지만, 정확한
     * 짝맞추기는 아래 `parseGrade` 가 한 번 더 본다 — SQL 쪽에서 괄호·육량이 섞인
     * 글자를 정확히 맞추려다 앞서처럼 조용히 다 떨어뜨리는 쪽이 훨씬 위험하다.
     */
    const targetPart = partName.trim();

    /*
     * 부위도 SQL 에서 먼저 거른다 · `등심(좌)` 까지 걸리게 앞글자로 맞춘다.
     * 두 해치를 열일곱 부위 통째로 끌어오면 쪽수가 예순 번을 넘는다.
     */
    const data = await fetchAllRows((from, to) =>
      supabase
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
        .ilike("cattle_listings.grade", `${wantedQuality}%`)
        .ilike("part_name", `${targetPart}%`)
        .order("id", { ascending: true })
        .range(from, to),
    );

    const dailyMap = new Map<string, DailyAccumulator>();

    interface ListingJoin {
      listing_date: string | null;
      grade: string | null;
      marbling_score: number | null;
      status: string | null;
    }

    for (const row of data ?? []) {
      const rawName = (row.part_name as string | null) ?? "";
      if (rawName.replace(/\(좌\)|\(우\)/g, "").trim() !== targetPart) continue;

      const listingRaw = row.cattle_listings as unknown as
        ListingJoin | ListingJoin[] | null;
      const listing = Array.isArray(listingRaw) ? listingRaw[0] : listingRaw;
      const date = listing?.listing_date;
      if (!date) continue;

      const parsed = parseGrade(listing?.grade);
      if (!parsed || parsed.quality !== wantedQuality) continue;

      /* 근내지방도는 등급 글자에 붙어 있으면 그걸, 없으면 제 칸을 본다 */
      if (wantedMarbling != null) {
        const marbling = parsed.marbling ?? listing?.marbling_score ?? null;
        if (marbling !== wantedMarbling) continue;
      }
      if (yieldFilter && parsed.yieldGrade !== yieldFilter) continue;

      const price = row.bid_price as number | null;
      const weight = row.weight as number | null;
      const isWon = !!row.winning_dealer_id && !!price && price > 0;
      const isSettled = SETTLED_STATUSES.has(listing?.status ?? "");
      if (!isWon && !isSettled) continue;

      const acc = dailyMap.get(date) ?? {
        priceSum: 0,
        count: 0,
        listed: 0,
        min: Infinity,
        max: 0,
        weightSum: 0,
        weightCount: 0,
        amountSum: 0,
      };
      if (isSettled) acc.listed += 1;
      if (isWon && price) {
        acc.priceSum += price;
        acc.count += 1;
        acc.min = Math.min(acc.min, price);
        acc.max = Math.max(acc.max, price);
        if (weight && weight > 0) {
          acc.weightSum += weight;
          acc.weightCount += 1;
          acc.amountSum += price * weight;
        }
      }
      dailyMap.set(date, acc);
    }

    /* days 범위의 모든 날짜를 채운다 (낙찰 0 인 날도 자리를 남긴다 · 차트의 빈 칸) */
    const series: {
      date: string;
      avg: number | null;
      min: number | null;
      max: number | null;
      weight: number | null;
      amount: number | null;
      count: number;
      listed: number;
    }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const acc = dailyMap.get(dateStr);
      if (!acc || acc.count === 0) {
        series.push({
          date: dateStr,
          avg: null,
          min: null,
          max: null,
          weight: null,
          amount: null,
          count: 0,
          listed: acc?.listed ?? 0,
        });
        continue;
      }
      series.push({
        date: dateStr,
        avg: Math.round(acc.priceSum / acc.count),
        min: acc.min,
        max: acc.max,
        weight:
          acc.weightCount > 0
            ? Math.round((acc.weightSum / acc.weightCount) * 10) / 10
            : null,
        amount:
          acc.weightCount > 0
            ? Math.round(acc.amountSum / acc.weightCount)
            : null,
        count: acc.count,
        listed: acc.listed,
      });
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
