import { getAdminClient } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";
import { resolveAuth } from "@/lib/resolve-auth";

const supabase = getAdminClient();

/** 메모 한 줄 길이 상한 · 쪽지로 읽을 만한 분량까지만 받는다 */
const BODY_MAX = 500;

/** 날짜 없이 전부 부를 때의 상한 · 최근 것부터 이만큼 (목록을 훑는 데 모자라지 않다) */
const ALL_NOTES_LIMIT = 300;

const TARGET_TYPES = ["listing", "part"];

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

    return NextResponse.json({
      notes: data.map((n) => ({
        activeDate: n.active_date,
        targetType: n.target_type,
        targetId: n.target_id,
        body: n.body,
        updatedAt: n.updated_at,
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
      typeof body === "string" ? body.trim().slice(0, BODY_MAX) : "";

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
