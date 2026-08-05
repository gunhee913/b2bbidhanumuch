import { NextRequest, NextResponse } from "next/server";
import { createPureClient } from "@/lib/supabase/server";

interface Row {
  id: string;
  slaughter_house: string;
  auction_date: string;
  round_no: number;
  planned_start: string;
  planned_end: string;
  note: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

function toIso(row: Row) {
  return {
    id: row.id,
    slaughterHouse: row.slaughter_house,
    auctionDate: row.auction_date,
    roundNo: row.round_no,
    plannedStart: row.planned_start,
    plannedEnd: row.planned_end,
    note: row.note,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slaughterHouse = searchParams.get("slaughterHouse");
  const date = searchParams.get("date");

  if (!slaughterHouse || !date) {
    return NextResponse.json(
      { error: "slaughterHouse, date 파라미터가 필요합니다." },
      { status: 400 },
    );
  }

  const supabase = await createPureClient();
  const { data, error } = await supabase
    .from("round_schedules")
    .select("*")
    .eq("slaughter_house", slaughterHouse)
    .eq("auction_date", date)
    .order("round_no", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    slaughterHouse,
    auctionDate: date,
    schedules: (data ?? []).map(toIso),
  });
}
