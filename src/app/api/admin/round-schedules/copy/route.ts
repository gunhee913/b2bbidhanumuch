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

interface CopyBody {
  slaughterHouse: string;
  fromDate: string;
  toDate: string;
  updatedBy?: string;
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

export async function POST(request: NextRequest) {
  let body: CopyBody;
  try {
    body = (await request.json()) as CopyBody;
  } catch {
    return NextResponse.json(
      { error: "요청 본문이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const { slaughterHouse, fromDate, toDate, updatedBy } = body;

  if (!slaughterHouse || !fromDate || !toDate) {
    return NextResponse.json(
      { error: "slaughterHouse, fromDate, toDate 는 필수입니다." },
      { status: 400 },
    );
  }

  if (fromDate === toDate) {
    return NextResponse.json(
      { error: "복제 원본과 대상 날짜가 동일합니다." },
      { status: 400 },
    );
  }

  const supabase = await createPureClient();

  const { data: source, error: srcError } = await supabase
    .from("round_schedules")
    .select("*")
    .eq("slaughter_house", slaughterHouse)
    .eq("auction_date", fromDate)
    .order("round_no", { ascending: true });

  if (srcError) {
    return NextResponse.json({ error: srcError.message }, { status: 500 });
  }

  if (!source || source.length === 0) {
    return NextResponse.json(
      { error: "복제할 원본 스케줄이 없습니다." },
      { status: 404 },
    );
  }

  const { error: delError } = await supabase
    .from("round_schedules")
    .delete()
    .eq("slaughter_house", slaughterHouse)
    .eq("auction_date", toDate);

  if (delError) {
    return NextResponse.json({ error: delError.message }, { status: 500 });
  }

  const nowIso = new Date().toISOString();
  const rows = (source as Row[]).map((item) => ({
    slaughter_house: slaughterHouse,
    auction_date: toDate,
    round_no: item.round_no,
    planned_start: item.planned_start,
    planned_end: item.planned_end,
    note: item.note,
    updated_at: nowIso,
    updated_by: updatedBy ?? null,
  }));

  const { data, error } = await supabase
    .from("round_schedules")
    .insert(rows)
    .select("*");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    schedules: ((data as Row[]) ?? []).map(toIso),
  });
}
