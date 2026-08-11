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

/**
 * `round_no` 기준으로 여러 공판장 row 를 하나로 병합.
 * - `plannedStart` · 가장 이른 시각
 * - `plannedEnd` · 가장 늦은 시각
 * - `slaughterHouse` · "통합" 라벨 (표시용, 의미 없음)
 * - `id` · `unified-{roundNo}` (React key 안정성)
 */
function dedupeByRoundNo(rows: Row[]): Row[] {
  const map = new Map<number, Row>();
  for (const row of rows) {
    const prev = map.get(row.round_no);
    if (!prev) {
      map.set(row.round_no, row);
      continue;
    }
    const start =
      row.planned_start < prev.planned_start
        ? row.planned_start
        : prev.planned_start;
    const end =
      row.planned_end > prev.planned_end ? row.planned_end : prev.planned_end;
    map.set(row.round_no, {
      ...prev,
      id: `unified-${row.round_no}`,
      slaughter_house: "통합",
      planned_start: start,
      planned_end: end,
    });
  }
  return Array.from(map.values()).sort((a, b) => a.round_no - b.round_no);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slaughterHouse = searchParams.get("slaughterHouse");
  const date = searchParams.get("date");

  if (!date) {
    return NextResponse.json(
      { error: "date 파라미터가 필요합니다." },
      { status: 400 },
    );
  }

  const supabase = await createPureClient();
  let query = supabase
    .from("round_schedules")
    .select("*")
    .eq("auction_date", date)
    .order("round_no", { ascending: true });

  if (slaughterHouse) {
    query = query.eq("slaughter_house", slaughterHouse);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 공판장 지정이 없는 통합 조회일 때만 round_no 기준으로 dedupe.
  const rows = (data ?? []) as Row[];
  const finalRows = slaughterHouse ? rows : dedupeByRoundNo(rows);

  return NextResponse.json({
    slaughterHouse: slaughterHouse ?? "",
    auctionDate: date,
    schedules: finalRows.map(toIso),
  });
}
