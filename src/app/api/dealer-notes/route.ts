import { getAdminClient } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";
import { resolveAuth } from "@/lib/resolve-auth";

const supabase = getAdminClient();

/** 메모 한 줄 길이 상한 · 쪽지로 읽을 만한 분량까지만 받는다 */
const BODY_MAX = 500;

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

    const { searchParams } = new URL(request.url);
    const activeDate = searchParams.get("activeDate");

    if (!activeDate) {
      return NextResponse.json(
        { error: "activeDate가 필요합니다." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("dealer_notes")
      .select("target_type, target_id, body, updated_at")
      .eq("dealer_id", auth.dealerId)
      .eq("active_date", activeDate);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      notes: data.map((n) => ({
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
