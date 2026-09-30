import { NextRequest, NextResponse } from "next/server";
import { createPureClient } from "@/lib/supabase/server";
import type { AuctionDayUpsertItem } from "@/features/auction-days/types";

interface UpsertBody {
  slaughterHouse: string;
  /** 이 달만 손댄다 · yyyy-MM */
  month: string;
  days: AuctionDayUpsertItem[];
  updatedBy?: string;
}

const MONTH_RE = /^\d{4}-\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * PUT /api/admin/auction-days
 *
 * 한 달을 통째로 맞춘다 (보낸 것만 남기고 그 달의 나머지 선언은 지운다).
 * 날짜를 하나씩 토글하는 API 로 두면 관리자가 30번 저장을 눌러야 하고, 중간에 실패하면
 * 달력이 반만 반영된 채로 남는다. 화면에서 다 찍고 한 번에 보내는 편이 상태가 분명하다.
 */
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

  const { slaughterHouse, month, days, updatedBy } = body;

  if (!slaughterHouse || !MONTH_RE.test(month ?? "") || !Array.isArray(days)) {
    return NextResponse.json(
      { error: "slaughterHouse, month(YYYY-MM), days 는 필수입니다." },
      { status: 400 },
    );
  }

  const seen = new Set<string>();
  for (const day of days) {
    if (!DATE_RE.test(day.date ?? "")) {
      return NextResponse.json(
        { error: `날짜 형식이 올바르지 않습니다: ${day.date}` },
        { status: 400 },
      );
    }
    if (!day.date.startsWith(month)) {
      return NextResponse.json(
        { error: `${month} 이외의 날짜가 섞여 있습니다: ${day.date}` },
        { status: 400 },
      );
    }
    if (seen.has(day.date)) {
      return NextResponse.json(
        { error: `날짜가 중복됩니다: ${day.date}` },
        { status: 400 },
      );
    }
    seen.add(day.date);
  }

  const [year, monthNum] = month.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const monthStart = `${year}-${pad(monthNum)}-01`;
  const monthEnd = `${year}-${pad(monthNum)}-${pad(new Date(year, monthNum, 0).getDate())}`;

  const supabase = await createPureClient();

  const { error: delError } = await supabase
    .from("auction_days")
    .delete()
    .eq("slaughter_house", slaughterHouse)
    .gte("auction_date", monthStart)
    .lte("auction_date", monthEnd);

  if (delError) {
    return NextResponse.json({ error: delError.message }, { status: 500 });
  }

  if (days.length === 0) {
    return NextResponse.json({ saved: 0 });
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("auction_days")
    .insert(
      days.map((day) => ({
        slaughter_house: slaughterHouse,
        auction_date: day.date,
        is_open: day.isOpen,
        note: day.note?.trim() || null,
        updated_at: nowIso,
        updated_by: updatedBy ?? null,
      })),
    )
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ saved: data?.length ?? 0 });
}
