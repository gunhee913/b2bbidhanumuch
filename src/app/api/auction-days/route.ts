import { NextRequest, NextResponse } from "next/server";
import { createPureClient } from "@/lib/supabase/server";
import type {
  AuctionCalendarMonth,
  AuctionDay,
  AuctionDayStatus,
} from "@/features/auction-days/types";

/** 확정된 상장으로 보는 상태 · pending/cancelled 는 아직 장에 올라온 게 아니다 */
const ACTIVE_LISTING_STATUSES = [
  "approved",
  "auction",
  "completed",
  "closed",
] as const;

interface DayRow {
  auction_date: string;
  is_open: boolean;
  note: string | null;
}

/**
 * GET /api/auction-days?month=YYYY-MM&slaughterHouse=농협 음성
 *
 * 한 달치 경매 달력. 세 곳을 한 번에 합쳐 내려보낸다.
 * - `auction_days`    · 개장/휴장 선언 (관리자)
 * - `round_schedules` · 그날 회차 수
 * - `cattle_listings` · 그날 실제 상장 두수
 *
 * 달력이 세 번 호출해서 클라이언트에서 합치면, 세 응답이 어긋난 순간에 "개장인데 회차 0"
 * 같은 중간 상태가 화면에 스친다. 서버에서 한 번에 맞춰 보내는 편이 낫다.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const slaughterHouse = searchParams.get("slaughterHouse");

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json(
      { error: "month(YYYY-MM) 파라미터가 필요합니다." },
      { status: 400 },
    );
  }

  const [year, monthNum] = month.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const monthStart = `${year}-${pad(monthNum)}-01`;
  const monthEnd = `${year}-${pad(monthNum)}-${pad(new Date(year, monthNum, 0).getDate())}`;

  const supabase = await createPureClient();
  const inMonth = <T extends { gte: (c: string, v: string) => T; lte: (c: string, v: string) => T }>(
    q: T,
    column: string,
  ) => q.gte(column, monthStart).lte(column, monthEnd);

  let dayQuery = inMonth(
    supabase.from("auction_days").select("auction_date, is_open, note"),
    "auction_date",
  );
  let roundQuery = inMonth(
    supabase.from("round_schedules").select("auction_date"),
    "auction_date",
  );
  let listingQuery = inMonth(
    supabase
      .from("cattle_listings")
      .select("listing_date")
      .in("status", ACTIVE_LISTING_STATUSES as unknown as string[]),
    "listing_date",
  );

  if (slaughterHouse) {
    dayQuery = dayQuery.eq("slaughter_house", slaughterHouse);
    roundQuery = roundQuery.eq("slaughter_house", slaughterHouse);
    listingQuery = listingQuery.eq("slaughter_house", slaughterHouse);
  }

  const [dayRes, roundRes, listingRes] = await Promise.all([
    dayQuery,
    roundQuery,
    listingQuery,
  ]);

  const failed = [roundRes, listingRes].find((r) => r.error);
  if (failed?.error) {
    console.error("auction-days query error:", failed.error);
    return NextResponse.json({ error: failed.error.message }, { status: 500 });
  }

  /*
   * 마이그레이션은 사람이 직접 적용하므로 코드가 먼저 올라가 있는 구간이 생긴다.
   * 그동안 달력을 통째로 500 으로 떨어뜨리는 대신, 선언이 없는 셈 치고 상장 기록만으로
   * 그린다 — 예전과 같은 화면이 나오고 테이블이 생기는 순간 저절로 나아진다.
   */
  const declared = new Map<string, DayRow>();
  if (dayRes.error) {
    console.warn("auction_days 조회 실패 · 상장 기록으로 대체", dayRes.error.message);
  } else {
    ((dayRes.data ?? []) as DayRow[]).forEach((r) =>
      declared.set(r.auction_date, r),
    );
  }

  const roundCounts = countBy(
    (roundRes.data ?? []) as { auction_date: string }[],
    (r) => r.auction_date,
  );
  const listingCounts = countBy(
    (listingRes.data ?? []) as { listing_date: string | null }[],
    (r) => r.listing_date,
  );

  const dates = new Set([
    ...declared.keys(),
    ...roundCounts.keys(),
    ...listingCounts.keys(),
  ]);

  const days: AuctionDay[] = Array.from(dates)
    .sort()
    .map((date) => {
      const row = declared.get(date);
      /*
       * 선언이 없어도 상장이 이미 올라온 날은 개장으로 본다.
       * 관리자가 달력을 채우기 전에도 오늘·어제가 빈칸으로 보이면 안 된다.
       */
      const status: AuctionDayStatus = row
        ? row.is_open
          ? "open"
          : "closed"
        : (listingCounts.get(date) ?? 0) > 0
          ? "open"
          : "unset";
      return {
        date,
        status,
        note: row?.note ?? null,
        roundCount: roundCounts.get(date) ?? 0,
        totalListings: listingCounts.get(date) ?? 0,
      };
    });

  const body: AuctionCalendarMonth = { month, slaughterHouse, days };
  return NextResponse.json(body);
}

function countBy<T>(
  rows: T[],
  keyOf: (row: T) => string | null,
): Map<string, number> {
  const map = new Map<string, number>();
  rows.forEach((row) => {
    const key = keyOf(row);
    if (!key) return;
    map.set(key, (map.get(key) ?? 0) + 1);
  });
  return map;
}
