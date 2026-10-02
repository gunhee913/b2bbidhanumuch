import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { resolveAuth } from "@/lib/resolve-auth";

const supabase = getAdminClient();

/**
 * 중도매인이 하루 동안 입찰에 한 일 · 넣고, 고치고, 뺀 것 전부.
 *
 * **두 곳에서 모아 엮는다.** 지금 살아 있는 입찰은 `bids` 에 있고, 손댄 자취는
 * `bid_audit_logs` 에 있다. 둘 중 하나만 보면 반쪽이다 —
 *
 *  - `bids` 만 보면 취소한 것이 통째로 사라진다. `cancel_bid` 가 행을 지운다.
 *  - 로그만 보면 (2026-10-02 이전에) 한 번 넣고 그대로 둔 입찰이 안 보인다.
 *    그때까지는 **고칠 때부터** 기록했기 때문이다 (`20261002_002_bid_create_audit`).
 *
 * 그래서 「처음 넣음」 은 살아 있는 입찰이면 `bids.created_at` 에서, 이미 사라진
 * 입찰이면 `dealer_create` 로그에서 가져온다. 같은 입찰을 두 번 세지 않도록 살아
 * 있는 bid id 가 있는 `dealer_create` 로그는 버린다.
 *
 * 날짜는 **상장일** 기준이다. 로그의 `created_at`(손댄 시각)으로 자르면 자정을
 * 넘겨 고친 한 건 때문에 그 개체가 다음 날 목록에 혼자 서게 된다. 경매결과 화면이
 * 상장일로 하루를 고르므로 여기도 같은 날을 가리켜야 둘이 같은 말을 한다.
 */

/** 한 줄이 무슨 일이었나 */
type BidHistoryKind =
  "placed" | "updated" | "cancelled" | "admin_update" | "admin_delete";

const KIND_BY_ACTION: Record<string, BidHistoryKind> = {
  dealer_create: "placed",
  dealer_update: "updated",
  dealer_cancel: "cancelled",
  update: "admin_update",
  delete: "admin_delete",
};

/** 개체·부위에서 화면이 쓰는 값만 추려 담는다 · 표와 왼쪽 사진판이 같이 쓴다 */
const partShape = (part: any) => {
  const listing = part?.cattle_listings;
  return {
    partId: part?.id ?? "",
    partNo: part?.part_no ?? null,
    partName: part?.part_name ?? "",
    weight: Number(part?.weight ?? 0),
    minPrice: Number(part?.min_price ?? 0),
    listingId: listing?.id ?? "",
    entityListingNo: listing?.listing_no ?? "",
    listingNo: part?.listing_part_no || listing?.listing_no || "",
    listingDate: listing?.listing_date ?? "",
    grade: listing?.grade ?? "",
    marblingScore: listing?.marbling_score ?? null,
    companyName: listing?.companies?.name ?? "",
  };
};

const PART_SELECT = `
  id,
  part_no,
  part_name,
  listing_part_no,
  weight,
  min_price,
  cattle_listings!inner (
    id,
    listing_no,
    listing_date,
    grade,
    marbling_score,
    companies ( name )
  )
`;

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveAuth(request);
    if (!auth?.dealerId) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    const date = new URL(request.url).searchParams.get("date");
    if (!date) {
      return NextResponse.json(
        { error: "날짜를 지정해주세요." },
        { status: 400 },
      );
    }

    const [live, logs] = await Promise.all([
      supabase
        .from("bids")
        .select(
          `
          id,
          bid_price,
          bid_amount,
          created_at,
          rank,
          cattle_parts!inner ( ${PART_SELECT} )
        `,
        )
        .eq("dealer_id", auth.dealerId)
        .eq("cattle_parts.cattle_listings.listing_date", date),
      supabase
        .from("bid_audit_logs")
        .select(
          `
          id,
          bid_id,
          action_type,
          old_bid_price,
          new_bid_price,
          old_bid_amount,
          new_bid_amount,
          performed_by,
          created_at,
          cattle_parts!inner ( ${PART_SELECT} )
        `,
        )
        .eq("dealer_id", auth.dealerId)
        .eq("cattle_parts.cattle_listings.listing_date", date),
    ]);

    if (live.error || logs.error) {
      const error = live.error ?? logs.error;
      console.error("입찰내역 조회 오류:", error);
      return NextResponse.json({ error: error!.message }, { status: 500 });
    }

    const liveBidIds = new Set((live.data ?? []).map((b: any) => b.id));

    /* 살아 있는 입찰의 「처음 넣음」 · 그 뒤 고친 것은 아래 로그가 이어 말한다 */
    const placed = (live.data ?? []).map((bid: any) => ({
      id: `bid-${bid.id}`,
      bidId: bid.id,
      kind: "placed" as BidHistoryKind,
      at: bid.created_at,
      oldPrice: null,
      newPrice: Number(bid.bid_price ?? 0),
      oldAmount: null,
      newAmount: Number(bid.bid_amount ?? 0),
      performedBy: null,
      /* 이 입찰이 지금도 걸려 있나 · 취소돼 사라진 줄과 눈으로 갈라야 한다 */
      alive: true,
      settled: bid.rank != null,
      ...partShape(bid.cattle_parts),
    }));

    const fromLogs = (logs.data ?? []).flatMap((log: any) => {
      const kind = KIND_BY_ACTION[log.action_type];
      if (!kind) return [];
      /* 살아 있는 입찰의 최초 기록은 위에서 이미 냈다 · 두 번 세지 않는다 */
      if (kind === "placed" && log.bid_id && liveBidIds.has(log.bid_id))
        return [];
      return [
        {
          id: `log-${log.id}`,
          bidId: log.bid_id,
          kind,
          at: log.created_at,
          oldPrice: log.old_bid_price,
          newPrice: log.new_bid_price,
          oldAmount: log.old_bid_amount,
          newAmount: log.new_bid_amount,
          performedBy: log.performed_by,
          alive: !!log.bid_id && liveBidIds.has(log.bid_id),
          settled: false,
          ...partShape(log.cattle_parts),
        },
      ];
    });

    /* 일어난 차례대로 · 같은 순간이면 「넣음」 이 「고침」 보다 앞이다 */
    const KIND_RANK: Record<BidHistoryKind, number> = {
      placed: 0,
      updated: 1,
      admin_update: 1,
      cancelled: 2,
      admin_delete: 2,
    };
    const entries = [...placed, ...fromLogs].sort(
      (a, b) =>
        a.at.localeCompare(b.at) || KIND_RANK[a.kind] - KIND_RANK[b.kind],
    );

    return NextResponse.json({ entries });
  } catch (error) {
    console.error("입찰내역 조회 오류:", error);
    return NextResponse.json(
      { error: "입찰내역 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
