import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";

const supabase = getAdminClient();

const ACTIVE_STATUSES = ["approved", "auction", "completed"] as const;
const VALID_GENDERS = ["거세", "암"] as const;

/** 등급 매트릭스 행 정의: 1++는 근내지방도 9/8/7로 세분화 */
const GRADE_ROWS = [
  "1++(9)",
  "1++(8)",
  "1++(7)",
  "1+",
  "1",
  "2",
  "3",
] as const;

const QUANTITY_KEYS = ["A", "B", "C"] as const;
type QuantityKey = (typeof QUANTITY_KEYS)[number];

type ParsedGrade = {
  row: (typeof GRADE_ROWS)[number];
  quantity: QuantityKey | null;
};

function parseGrade(
  grade: string | null,
  marbling: number | null,
): ParsedGrade | null {
  if (!grade) return null;

  let quality: "1++" | "1+" | "1" | "2" | "3" | null = null;
  let rest = "";

  if (grade.startsWith("1++")) {
    quality = "1++";
    rest = grade.slice(3);
  } else if (grade.startsWith("1+")) {
    quality = "1+";
    rest = grade.slice(2);
  } else if (grade.startsWith("1")) {
    quality = "1";
    rest = grade.slice(1);
  } else if (grade.startsWith("2")) {
    quality = "2";
    rest = grade.slice(1);
  } else if (grade.startsWith("3")) {
    quality = "3";
    rest = grade.slice(1);
  }

  if (!quality) return null;

  const q = rest.charAt(0);
  const quantity: QuantityKey | null =
    q === "A" || q === "B" || q === "C" ? q : null;

  let row: (typeof GRADE_ROWS)[number];
  if (quality === "1++") {
    if (marbling === 9) row = "1++(9)";
    else if (marbling === 8) row = "1++(8)";
    else if (marbling === 7) row = "1++(7)";
    else row = "1++(9)";
  } else {
    row = quality;
  }

  return { row, quantity };
}

/**
 * GET /api/main/auction-day-stats
 *
 * 특정 일자 + 공판장 + 성별의 등급 매트릭스(1++ 9/8/7 세분화, 육량 A/B/C 컬럼)를 반환.
 * - gender 파라미터: "거세" | "암" | 그 외(전체)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const slaughterHouse = searchParams.get("slaughter_house");
    const gender = searchParams.get("gender");

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "date(YYYY-MM-DD) 파라미터가 필요합니다." },
        { status: 400 },
      );
    }

    let listingsQuery = supabase
      .from("cattle_listings")
      .select("id, grade, marbling_score")
      .in("status", ACTIVE_STATUSES as unknown as string[])
      .eq("listing_date", date);

    if (slaughterHouse) {
      listingsQuery = listingsQuery.eq("slaughter_house", slaughterHouse);
    }

    if (gender && (VALID_GENDERS as readonly string[]).includes(gender)) {
      listingsQuery = listingsQuery.eq("gender", gender);
    }

    const { data: listings, error: listingsErr } = await listingsQuery;

    if (listingsErr) {
      console.error("auction-day-stats listings error:", listingsErr);
      return NextResponse.json({ error: listingsErr.message }, { status: 500 });
    }

    const rows = listings ?? [];

    const matrix: Record<
      string,
      { A: number; B: number; C: number; total: number }
    > = {};
    GRADE_ROWS.forEach((r) => {
      matrix[r] = { A: 0, B: 0, C: 0, total: 0 };
    });

    rows.forEach(
      (row: { grade: string | null; marbling_score: number | null }) => {
        const parsed = parseGrade(row.grade, row.marbling_score);
        if (!parsed) return;
        const cell = matrix[parsed.row];
        if (!cell) return;
        if (parsed.quantity) {
          cell[parsed.quantity] += 1;
        }
        cell.total += 1;
      },
    );

    const byGrade = GRADE_ROWS.map((grade) => ({
      grade,
      A: matrix[grade].A,
      B: matrix[grade].B,
      C: matrix[grade].C,
      total: matrix[grade].total,
    }));

    return NextResponse.json({
      date,
      slaughterHouse: slaughterHouse ?? null,
      gender: gender ?? null,
      totalListings: rows.length,
      byGrade,
    });
  } catch (err) {
    console.error("auction-day-stats error:", err);
    return NextResponse.json(
      { error: "일자별 경매 통계 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
