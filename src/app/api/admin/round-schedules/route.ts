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

interface UpsertItem {
  roundNo: number;
  plannedStart: string;
  plannedEnd: string;
  note?: string | null;
}

interface UpsertBody {
  slaughterHouse: string;
  auctionDate: string;
  schedules: UpsertItem[];
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

function normalizeTime(input: string): string {
  const trimmed = input.trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  return trimmed;
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

export async function PUT(request: NextRequest) {
  let body: UpsertBody;
  try {
    body = (await request.json()) as UpsertBody;
  } catch {
    return NextResponse.json(
      { error: "요청 본문이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const { slaughterHouse, auctionDate, schedules, updatedBy } = body;

  if (!slaughterHouse || !auctionDate || !Array.isArray(schedules)) {
    return NextResponse.json(
      { error: "slaughterHouse, auctionDate, schedules 는 필수입니다." },
      { status: 400 },
    );
  }

  const seen = new Set<number>();
  for (const item of schedules) {
    if (
      typeof item.roundNo !== "number" ||
      item.roundNo <= 0 ||
      !item.plannedStart ||
      !item.plannedEnd
    ) {
      return NextResponse.json(
        { error: "회차 · 시작/종료 시각은 필수입니다." },
        { status: 400 },
      );
    }
    if (seen.has(item.roundNo)) {
      return NextResponse.json(
        { error: `회차 번호가 중복됩니다: ${item.roundNo}` },
        { status: 400 },
      );
    }
    seen.add(item.roundNo);
    const start = normalizeTime(item.plannedStart);
    const end = normalizeTime(item.plannedEnd);
    if (end <= start) {
      return NextResponse.json(
        {
          error: `종료 시각이 시작 시각보다 뒤여야 합니다. (회차 ${item.roundNo})`,
        },
        { status: 400 },
      );
    }
  }

  const supabase = await createPureClient();
  const nowIso = new Date().toISOString();

  const { error: delError } = await supabase
    .from("round_schedules")
    .delete()
    .eq("slaughter_house", slaughterHouse)
    .eq("auction_date", auctionDate);

  if (delError) {
    return NextResponse.json({ error: delError.message }, { status: 500 });
  }

  if (schedules.length === 0) {
    return NextResponse.json({ schedules: [] });
  }

  const rows = schedules.map((item) => ({
    slaughter_house: slaughterHouse,
    auction_date: auctionDate,
    round_no: item.roundNo,
    planned_start: normalizeTime(item.plannedStart),
    planned_end: normalizeTime(item.plannedEnd),
    note: item.note ?? null,
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

export async function DELETE(request: NextRequest) {
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
    .delete()
    .eq("slaughter_house", slaughterHouse)
    .eq("auction_date", date)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: data?.length ?? 0 });
}
