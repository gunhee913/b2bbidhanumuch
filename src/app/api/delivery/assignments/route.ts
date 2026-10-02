import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { resolveViewer } from "@/lib/resolve-viewer";
import {
  DELIVERY_DEADLINE_LABEL,
  isDeliveryLocked,
} from "@/features/delivery/lib/deadline";

const supabase = getAdminClient();

// GET: 거래처 지정 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    let query = supabase.from("delivery_assignments").select(`
        id,
        part_id,
        partner_id,
        assigned_by,
        created_at,
        partners (
          id,
          partner_no,
          name,
          representative,
          phone,
          address,
          business_type,
          status
        )
      `);

    if (date) {
      const { data: partIds } = await supabase
        .from("cattle_parts")
        .select("id, cattle_listings!inner(listing_date)")
        .not("winning_dealer_id", "is", null);

      const filteredPartIds = (partIds || [])
        .filter((p: any) => p.cattle_listings?.listing_date === date)
        .map((p: any) => p.id);

      if (filteredPartIds.length === 0) {
        return NextResponse.json({ assignments: {} });
      }

      query = query.in("part_id", filteredPartIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error("거래처 지정 조회 오류:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const assignments: Record<string, any> = {};
    (data || []).forEach((a: any) => {
      assignments[a.part_id] = {
        id: a.id,
        partnerId: a.partner_id,
        partnerNo: a.partners?.partner_no || "",
        partnerName: a.partners?.name || "",
        representative: a.partners?.representative || "",
        phone: a.partners?.phone || "",
        address: a.partners?.address || "",
        assignedBy: a.assigned_by,
      };
    });

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error("거래처 지정 조회 오류:", error);
    return NextResponse.json(
      { error: "거래처 지정 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

/**
 * POST: 거래처 지정 일괄 저장 (upsert)
 *
 * 세 가지를 서버가 직접 판정한다 — 화면을 믿지 않는다.
 *
 *  1. **누구인가** · 예전에는 인증이 아예 없고 「누가 했는지」를 요청 본문의 글자
 *     그대로 적었다. 주소만 알면 남의 낙찰분 배송지를 바꿀 수 있었다.
 *  2. **내 낙찰분인가** · 중도매인은 제가 딴 부위만 손댄다.
 *  3. **마감 전인가** · 상장일 13:30 이 지나면 중도매인은 읽기만 한다. 관리자는 넘어간다.
 */
export async function POST(request: NextRequest) {
  try {
    const viewer = await resolveViewer(request);
    const isAdmin = viewer.userType === "admin_user";
    if (!isAdmin && !viewer.dealerId) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { assignments, overrideReason } = body as {
      assignments: Record<string, string | null>;
      /** 관리자가 마감 뒤에 고칠 때 남기는 사유 */
      overrideReason?: string;
    };

    if (!assignments || Object.keys(assignments).length === 0) {
      return NextResponse.json(
        { error: "저장할 데이터가 없습니다." },
        { status: 400 },
      );
    }

    const partIds = Object.keys(assignments);

    /* 손대려는 부위의 임자와 상장일을 한 번에 읽는다 · 줄마다 묻지 않는다 */
    const { data: parts, error: partsError } = await supabase
      .from("cattle_parts")
      .select("id, winning_dealer_id, cattle_listings!inner(listing_date)")
      .in("id", partIds);

    if (partsError) {
      console.error("거래처 지정 검증 오류:", partsError);
      return NextResponse.json({ error: partsError.message }, { status: 500 });
    }

    const partMap = new Map(
      (parts || []).map((p: any) => [
        p.id as string,
        {
          dealerId: p.winning_dealer_id as string | null,
          listingDate: p.cattle_listings?.listing_date as string | undefined,
        },
      ]),
    );

    const now = new Date();
    const unknown: string[] = [];
    const notMine: string[] = [];
    const tooLate: string[] = [];

    for (const partId of partIds) {
      const part = partMap.get(partId);
      if (!part) {
        unknown.push(partId);
        continue;
      }
      if (!isAdmin && part.dealerId !== viewer.dealerId) {
        notMine.push(partId);
        continue;
      }
      if (!isAdmin && isDeliveryLocked(part.listingDate, now)) {
        tooLate.push(partId);
      }
    }

    if (unknown.length > 0) {
      return NextResponse.json(
        { error: "없는 부위가 섞여 있습니다.", partIds: unknown },
        { status: 400 },
      );
    }
    if (notMine.length > 0) {
      return NextResponse.json(
        { error: "내가 낙찰받은 부위만 지정할 수 있습니다.", partIds: notMine },
        { status: 403 },
      );
    }
    if (tooLate.length > 0) {
      return NextResponse.json(
        {
          error: `상장일 ${DELIVERY_DEADLINE_LABEL} 이 지나 수정할 수 없습니다. 관리자에게 요청해 주세요.`,
          partIds: tooLate,
        },
        { status: 409 },
      );
    }

    /* 「누가 했나」 는 서버가 적는다 · 요청 본문에서 받으면 아무 이름이나 들어온다 */
    const actor = viewer.name || (isAdmin ? "관리자" : "");
    const reason =
      isAdmin && overrideReason ? overrideReason.trim().slice(0, 300) : null;

    const toUpsert: {
      part_id: string;
      partner_id: string;
      assigned_by: string;
      assigned_by_user_id: string | null;
      override_reason: string | null;
      overridden_at: string | null;
      updated_at: string;
    }[] = [];
    const toDelete: string[] = [];

    for (const [partId, partnerId] of Object.entries(assignments)) {
      if (partnerId) {
        toUpsert.push({
          part_id: partId,
          partner_id: partnerId,
          assigned_by: actor,
          assigned_by_user_id: viewer.userId,
          override_reason: reason,
          overridden_at: reason ? now.toISOString() : null,
          updated_at: now.toISOString(),
        });
      } else {
        toDelete.push(partId);
      }
    }

    if (toDelete.length > 0) {
      await supabase
        .from("delivery_assignments")
        .delete()
        .in("part_id", toDelete);
    }

    if (toUpsert.length > 0) {
      const { error } = await supabase
        .from("delivery_assignments")
        .upsert(toUpsert, { onConflict: "part_id" });

      if (error) {
        console.error("거래처 지정 저장 오류:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ message: "저장되었습니다." });
  } catch (error) {
    console.error("거래처 지정 저장 오류:", error);
    return NextResponse.json(
      { error: "거래처 지정 저장 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
