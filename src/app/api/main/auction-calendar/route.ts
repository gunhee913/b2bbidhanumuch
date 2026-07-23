import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";

const supabase = getAdminClient();

const ACTIVE_STATUSES = ["approved", "auction", "completed", "closed"] as const;

/**
 * GET /api/main/auction-calendar
 *
 * 특정 월(YYYY-MM)의 일자별 상장 두수(개체 기준)를 반환한다.
 * - status 가 pending/cancelled 인 항목은 확정된 상장으로 보지 않아 제외
 * - slaughter_house 파라미터가 있으면 해당 공판장만 집계
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const slaughterHouse = searchParams.get("slaughter_house");

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: "month(YYYY-MM) 파라미터가 필요합니다." },
        { status: 400 },
      );
    }

    const [year, monthNum] = month.split("-").map(Number);
    const monthStart = `${year}-${String(monthNum).padStart(2, "0")}-01`;
    const lastDay = new Date(year, monthNum, 0).getDate();
    const monthEnd = `${year}-${String(monthNum).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    let query = supabase
      .from("cattle_listings")
      .select("listing_date")
      .in("status", ACTIVE_STATUSES as unknown as string[])
      .gte("listing_date", monthStart)
      .lte("listing_date", monthEnd);

    if (slaughterHouse) {
      query = query.eq("slaughter_house", slaughterHouse);
    }

    const { data, error } = await query;

    if (error) {
      console.error("auction-calendar query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const counts = new Map<string, number>();
    (data ?? []).forEach((row: { listing_date: string | null }) => {
      const d = row.listing_date;
      if (!d) return;
      counts.set(d, (counts.get(d) ?? 0) + 1);
    });

    const days = Array.from(counts.entries())
      .map(([date, totalListings]) => ({ date, totalListings }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    return NextResponse.json({ month, days });
  } catch (err) {
    console.error("auction-calendar error:", err);
    return NextResponse.json(
      { error: "경매 캘린더 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
