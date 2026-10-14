import { getAdminClient } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";
import { resolveAuth } from "@/lib/resolve-auth";

const supabase = getAdminClient();

/**
 * 글 길이 상한 · 대상에 따라 다르다.
 *
 * 개체·부위에 붙는 쪽지는 사진 위 작은 칸에서 읽는 것이라 짧게 끊는다. 메모장은
 * 그날 하루를 통째로 적는 자리라 (「3번 트럭 4시 · 김사장 등심 더 달래」) 훨씬 길다.
 */
const BODY_MAX: Record<string, number> = {
  listing: 500,
  part: 500,
  memo: 4000,
};

/** 날짜 없이 전부 부를 때의 상한 · 최근 것부터 이만큼 (목록을 훑는 데 모자라지 않다) */
const ALL_NOTES_LIMIT = 300;

const TARGET_TYPES = Object.keys(BODY_MAX);

/** 지난날 메모 줄을 그리는 데 드는 만큼만 · 그 부위가 어느 소의 무엇이었는지 */
interface NotePartSummary {
  listingId: string;
  listingNo: string;
  listingDate: string;
  partNo: number;
  partName: string;
  companyName: string;
  /** 부위 사진이 있으면 그것, 없으면 개체 첫 장 */
  image: string | null;
}

/**
 * 메모가 붙은 부위들의 요약 · 메모 표는 부위를 UUID 글자로만 가리켜 조인이 안 되므로
 * 한 번 더 묻는다. 지워진 부위는 빠지고, 그 줄은 요약 없이 내려간다.
 */
async function summarizeParts(
  partIds: string[],
): Promise<Map<string, NotePartSummary>> {
  const summaries = new Map<string, NotePartSummary>();
  if (partIds.length === 0) return summaries;

  const { data, error } = await supabase
    .from("cattle_parts")
    .select(
      `
      id,
      part_no,
      part_name,
      images,
      cattle_listings (
        id,
        listing_no,
        listing_date,
        images,
        companies ( name )
      )
    `,
    )
    .in("id", partIds);

  if (error || !data) return summaries;

  for (const part of data) {
    /* 다대일 관계라 한 줄이지만 타입은 배열로 추론된다 · 다른 라우트들처럼 모양을 직접 적는다 */
    const listing = part.cattle_listings as unknown as {
      id: string;
      listing_no: string;
      listing_date: string;
      images: string[] | null;
      companies: { name: string } | null;
    } | null;
    if (!listing) continue;
    summaries.set(part.id, {
      listingId: listing.id,
      listingNo: listing.listing_no,
      listingDate: listing.listing_date,
      partNo: part.part_no,
      partName: part.part_name,
      companyName: listing.companies?.name ?? "",
      image: part.images?.[0] ?? listing.images?.[0] ?? null,
    });
  }
  return summaries;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveAuth(request);
    if (!auth?.dealerId) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    /*
     * 하루치와 기간치를 한 입구로 받는다. 경매장은 그날 하나만 보지만 배송지시는
     * 조회기간 전체의 낙찰 부위를 한 줄기로 늘어놓아, 날마다 따로 부르면 열흘이면
     * 열 번이 날아간다. `active_date` 가 `yyyy-MM-dd` 문자열이라 사전순이 곧 날짜순이다.
     */
    const { searchParams } = new URL(request.url);
    const activeDate = searchParams.get("activeDate");
    const from = searchParams.get("from") ?? activeDate;
    const to = searchParams.get("to") ?? activeDate;

    let query = supabase
      .from("dealer_notes")
      .select("active_date, target_type, target_id, body, updated_at")
      .eq("dealer_id", auth.dealerId);

    /*
     * 날짜를 안 주면 「전부」다 · 사이드 메뉴 메모 목록이 그렇게 부른다.
     *
     * 적어 둔 말은 조회기간과 상관없이 찾고 싶은 것이다. 「지난달 그 집 등심에 뭐라고
     * 적었더라」 를 보려고 기간을 다시 맞춰 조회하게 하면, 날짜를 기억하는 사람만
     * 쓸 수 있는 목록이 된다. 대신 최근 것부터 상한을 두고 끊는다 — 한 중도매인이
     * 몇 해에 걸쳐 쌓은 것을 한 번에 내릴 까닭은 없다.
     */
    if (from && to) {
      query = query.gte("active_date", from).lte("active_date", to);
    } else {
      query = query
        .order("active_date", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(ALL_NOTES_LIMIT);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    /*
     * 전부 부를 때만 부위 요약을 붙인다. 하루치는 부르는 쪽이 그날 상장을 이미 들고
     * 있어 접수번호·부위명을 거기서 찾지만, 지난날 것은 상장이 내려가 찾을 데가 없다.
     */
    const summaries =
      from && to
        ? new Map<string, NotePartSummary>()
        : await summarizeParts(
            data
              .filter((n) => n.target_type === "part")
              .map((n) => n.target_id as string),
          );

    return NextResponse.json({
      notes: data.map((n) => ({
        activeDate: n.active_date,
        targetType: n.target_type,
        targetId: n.target_id,
        body: n.body,
        updatedAt: n.updated_at,
        part: summaries.get(n.target_id) ?? null,
      })),
    });
  } catch (err) {
    console.error("[dealer-notes GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

/**
 * 메모 쓰기 · 고쳐 쓰기 · 지우기를 한 입구로 받는다.
 *
 * 빈 내용은 "지운다"로 읽는다. 쓰는 쪽에서 보면 글자를 다 지우는 것과 메모를 없애는
 * 것이 같은 행동이라, 저장과 삭제를 따로 부르게 하면 빈 메모 행이 남아 상장표에
 * 자국만 붙어 있게 된다.
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await resolveAuth(request);
    if (!auth?.dealerId) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    const { activeDate, targetType, targetId, body } = await request.json();

    if (!activeDate || !targetType || !targetId) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다." },
        { status: 400 },
      );
    }

    if (!TARGET_TYPES.includes(targetType)) {
      return NextResponse.json(
        { error: "잘못된 targetType입니다." },
        { status: 400 },
      );
    }

    const trimmed =
      typeof body === "string"
        ? body.trim().slice(0, BODY_MAX[targetType])
        : "";

    if (!trimmed) {
      const { error } = await supabase
        .from("dealer_notes")
        .delete()
        .eq("dealer_id", auth.dealerId)
        .eq("active_date", activeDate)
        .eq("target_type", targetType)
        .eq("target_id", targetId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, body: "" });
    }

    const { error } = await supabase.from("dealer_notes").upsert(
      {
        dealer_id: auth.dealerId,
        active_date: activeDate,
        target_type: targetType,
        target_id: targetId,
        body: trimmed,
        created_by: auth.userId,
        updated_by: auth.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "dealer_id,active_date,target_type,target_id" },
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, body: trimmed });
  } catch (err) {
    console.error("[dealer-notes PUT]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
