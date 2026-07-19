import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { getAdminClient } from "@/lib/supabase-admin";
import { SLAUGHTER_HOUSES } from "@/constants/slaughterHouses";

const supabase = getAdminClient();

interface SlaughterHouseSummary {
  slaughterHouse: string;
  listingCount: number;
  approvedCount: number;
  auctionCount: number;
  closedCount: number;
  totalParts: number;
  winningParts: number;
  currentRound: {
    id: string;
    roundNo: number;
    status: "scheduled" | "open" | "closed" | "cancelled";
    startedAt: string | null;
    endedAt: string | null;
    roundDurationMin: number | null;
  } | null;
}

/**
 * GET /api/auction/live-summary?date=YYYY-MM-DD
 *
 * 랜딩(공판장 카드 그리드)에서 4개 공판장의 오늘 진행 상태를 한번에 조회.
 * - 각 공판장별 상장/낙찰 카운트
 * - 각 공판장에 배정된 상장이 속한 현재 진행 회차 (auction_listings ↔ cattle_listings 조인)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const targetDate = dateParam || format(new Date(), "yyyy-MM-dd");

    // 오늘 날짜의 상장 (부위 요약 포함)
    const { data: listings, error: listingsError } = await supabase
      .from("cattle_listings")
      .select(
        `
          id,
          slaughter_house,
          status,
          cattle_parts (
            id,
            is_included,
            winning_dealer_id
          )
        `,
      )
      .eq("listing_date", targetDate)
      .in("status", ["approved", "auction", "closed", "completed"]);

    if (listingsError) {
      return NextResponse.json(
        { error: listingsError.message },
        { status: 500 },
      );
    }

    // 오늘 날짜의 모든 회차
    const { data: rounds, error: roundsError } = await supabase
      .from("auctions")
      .select(
        "id, round_no, status, started_at, ended_at, round_duration_min, session_id",
      )
      .eq("auction_date", targetDate)
      .not("round_no", "is", null)
      .order("round_no", { ascending: true });

    if (roundsError) {
      return NextResponse.json(
        { error: roundsError.message },
        { status: 500 },
      );
    }

    // 회차별 배정된 상장 조회 → 공판장 → open 회차 매핑
    const roundIds = (rounds || []).map((r) => r.id);
    const listingIdToSlaughterHouse = new Map<string, string>();
    (listings || []).forEach((l: any) => {
      listingIdToSlaughterHouse.set(l.id, l.slaughter_house || "");
    });

    let openRoundByHouse: Record<
      string,
      NonNullable<SlaughterHouseSummary["currentRound"]>
    > = {};

    if (roundIds.length > 0) {
      const { data: auctionListings } = await supabase
        .from("auction_listings")
        .select("auction_id, listing_id")
        .in("auction_id", roundIds);

      const openRoundIds = new Set(
        (rounds || [])
          .filter((r) => r.status === "open")
          .map((r) => r.id),
      );

      const roundInfoById = new Map(
        (rounds || []).map((r) => [
          r.id,
          {
            id: r.id,
            roundNo: r.round_no,
            status: r.status as SlaughterHouseSummary["currentRound"] extends null
              ? never
              : "scheduled" | "open" | "closed" | "cancelled",
            startedAt: r.started_at,
            endedAt: r.ended_at,
            roundDurationMin: r.round_duration_min,
          },
        ]),
      );

      (auctionListings || []).forEach((al: any) => {
        if (!openRoundIds.has(al.auction_id)) return;
        const sh = listingIdToSlaughterHouse.get(al.listing_id);
        if (!sh) return;
        if (!openRoundByHouse[sh]) {
          const info = roundInfoById.get(al.auction_id);
          if (info) {
            openRoundByHouse[sh] = {
              id: info.id,
              roundNo: info.roundNo,
              status: info.status as
                | "scheduled"
                | "open"
                | "closed"
                | "cancelled",
              startedAt: info.startedAt,
              endedAt: info.endedAt,
              roundDurationMin: info.roundDurationMin,
            };
          }
        }
      });
    }

    // 공판장별 집계
    const summaries: SlaughterHouseSummary[] = SLAUGHTER_HOUSES.map(
      (house) => {
        const houseListings = (listings || []).filter(
          (l: any) => (l.slaughter_house || "") === house,
        );

        let approved = 0;
        let auction = 0;
        let closed = 0;
        let totalParts = 0;
        let winningParts = 0;

        houseListings.forEach((l: any) => {
          if (l.status === "approved") approved++;
          if (l.status === "auction") auction++;
          if (l.status === "closed" || l.status === "completed") closed++;

          (l.cattle_parts || []).forEach((p: any) => {
            if (!p.is_included) return;
            totalParts++;
            if (p.winning_dealer_id) winningParts++;
          });
        });

        return {
          slaughterHouse: house,
          listingCount: houseListings.length,
          approvedCount: approved,
          auctionCount: auction,
          closedCount: closed,
          totalParts,
          winningParts,
          currentRound: openRoundByHouse[house] || null,
        };
      },
    );

    return NextResponse.json({
      date: targetDate,
      summaries,
    });
  } catch (error) {
    console.error("live-summary error:", error);
    return NextResponse.json(
      { error: "공판장 요약 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
