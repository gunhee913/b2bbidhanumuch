import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { resolveAuth } from "@/lib/resolve-auth";

const supabase = getAdminClient();

/** 숫자 키 자리 · 0 은 「배정 해제」 라 1~9 만 쓴다 (`PARTNER_SLOT_COUNT` 와 같은 값) */
const SLOT_MIN = 1;
const SLOT_MAX = 9;

const unauthorized = () =>
  NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

/** GET · 자리별 거래처 id · 빈 자리는 null · 길이는 늘 9 */
export async function GET(request: NextRequest) {
  try {
    const auth = await resolveAuth(request);
    if (!auth?.dealerId) return unauthorized();

    const { data, error } = await supabase
      .from("dealer_partner_pins")
      .select("slot, partner_id")
      .eq("dealer_id", auth.dealerId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const pins: (string | null)[] = Array.from(
      { length: SLOT_MAX },
      () => null,
    );
    for (const row of data ?? []) {
      if (row.slot >= SLOT_MIN && row.slot <= SLOT_MAX) {
        pins[row.slot - 1] = row.partner_id;
      }
    }

    return NextResponse.json({ pins });
  } catch {
    return NextResponse.json(
      { error: "단축키를 불러오는 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

/**
 * PUT · 자리 하나를 걸거나 비운다.
 *
 * 같은 거래처가 걸려 있던 다른 자리는 먼저 비운다. 두 자리를 차지하면 어느 숫자가
 * 맞는지 알 수 없고, DB 쪽 `unique_dealer_partner` 에 걸려 저장 자체가 실패한다.
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await resolveAuth(request);
    if (!auth?.dealerId) return unauthorized();

    const body = (await request.json()) as {
      slot?: number;
      partnerId?: string | null;
    };
    const slot = Number(body.slot);
    const partnerId = body.partnerId ?? null;

    if (!Number.isInteger(slot) || slot < SLOT_MIN || slot > SLOT_MAX) {
      return NextResponse.json(
        { error: `자리는 ${SLOT_MIN}~${SLOT_MAX} 사이여야 합니다.` },
        { status: 400 },
      );
    }

    if (!partnerId) {
      const { error } = await supabase
        .from("dealer_partner_pins")
        .delete()
        .eq("dealer_id", auth.dealerId)
        .eq("slot", slot);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ message: "비웠습니다." });
    }

    /* 담당이 아닌 거래처는 걸 수 없다 · 단축키로 남의 거래처에 배정이 생기면 안 된다 */
    const { data: partner } = await supabase
      .from("partners")
      .select("id, dealer1_id, dealer2_id, dealer3_id")
      .eq("id", partnerId)
      .maybeSingle();

    const isMine =
      partner &&
      [partner.dealer1_id, partner.dealer2_id, partner.dealer3_id].includes(
        auth.dealerId,
      );

    if (!isMine) {
      return NextResponse.json(
        { error: "담당 거래처가 아닙니다." },
        { status: 403 },
      );
    }

    await supabase
      .from("dealer_partner_pins")
      .delete()
      .eq("dealer_id", auth.dealerId)
      .eq("partner_id", partnerId);

    const { error } = await supabase.from("dealer_partner_pins").upsert(
      {
        dealer_id: auth.dealerId,
        slot,
        partner_id: partnerId,
        pinned_by: auth.userId,
      },
      { onConflict: "dealer_id,slot" },
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "걸었습니다." });
  } catch {
    return NextResponse.json(
      { error: "단축키를 저장하는 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
