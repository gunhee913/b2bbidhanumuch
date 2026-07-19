import { getAdminClient } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";
import { resolveAuth } from "@/lib/resolve-auth";

const supabase = getAdminClient();

/**
 * 일괄 입찰 API.
 *
 * 요청: `POST /api/bids/bulk`
 * ```
 * {
 *   auctionId?: string;
 *   items: Array<{ partId: string; pricePerKg: number }>;
 * }
 * ```
 *
 * 응답: 부분 성공 허용. 각 item 별로 검증/등록을 수행하고 성공한 것만 확정한다.
 * ```
 * {
 *   successful: Array<{ partId: string; bidId: string; isUpdate: boolean }>;
 *   failed:     Array<{ partId: string; reason: FailReason; message: string }>;
 * }
 * ```
 *
 * 검증 로직은 단건 `POST /api/bids` 를 그대로 이식하되, 딜러 인증/회차 조회는
 * 앞에서 한 번만 수행하고 각 부위별 검증은 배치로 처리한다.
 */

type FailReason =
  | "not_found" // 부위 정보 없음
  | "not_included" // 상장에 포함되지 않음
  | "invalid_status" // 상장 상태가 approved/auction 아님
  | "no_open_round" // open 회차 없음
  | "closed" // 회차 시간 만료
  | "below_min" // 최저단가 미달
  | "settled" // 이미 낙찰 확정
  | "invalid" // 기타 검증 실패
  | "db_error"; // DB 오류

interface SuccessItem {
  partId: string;
  bidId: string;
  isUpdate: boolean;
}

interface FailedItem {
  partId: string;
  reason: FailReason;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const auctionIdInput: string | undefined = body.auctionId;
    const clientDealerId: string | undefined = body.dealerId;
    const rawItems: unknown = body.items;

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json(
        { error: "입찰 항목이 없습니다." },
        { status: 400 },
      );
    }

    // 각 아이템 정규화 (partId + pricePerKg)
    const items: { partId: string; pricePerKg: number }[] = [];
    for (const raw of rawItems as { partId?: string; pricePerKg?: number }[]) {
      if (
        !raw ||
        typeof raw.partId !== "string" ||
        typeof raw.pricePerKg !== "number" ||
        !Number.isFinite(raw.pricePerKg) ||
        raw.pricePerKg <= 0
      ) {
        return NextResponse.json(
          { error: "잘못된 입찰 항목이 포함되어 있습니다." },
          { status: 400 },
        );
      }
      items.push({ partId: raw.partId, pricePerKg: Math.round(raw.pricePerKg) });
    }

    // 딜러 인증 · resolveAuth 우선, 실패 시 클라이언트 dealerId fallback
    const auth = await resolveAuth(request);
    let finalDealerId: string | null = auth?.dealerId ?? null;

    if (!finalDealerId) {
      if (!clientDealerId) {
        return NextResponse.json(
          { error: "중도매인 인증 정보가 없습니다." },
          { status: 401 },
        );
      }

      const { data: dealerCheck } = await supabase
        .from("dealers")
        .select("id")
        .eq("id", clientDealerId)
        .single();

      if (dealerCheck) {
        finalDealerId = clientDealerId;
      } else {
        const { data: empCheck } = await supabase
          .from("dealer_employees")
          .select("id, dealer_id")
          .eq("id", clientDealerId)
          .single();
        if (empCheck) {
          finalDealerId = empCheck.dealer_id;
        }
      }
    }

    if (!finalDealerId) {
      return NextResponse.json(
        { error: "중도매인 정보를 확인할 수 없습니다." },
        { status: 401 },
      );
    }

    // 대상 부위 일괄 조회
    const partIds = items.map((i) => i.partId);
    const { data: parts, error: partsError } = await supabase
      .from("cattle_parts")
      .select(
        `
        id,
        min_price,
        weight,
        is_included,
        listing_id,
        cattle_listings ( id, status )
        `,
      )
      .in("id", partIds);

    if (partsError) {
      console.error("[bids/bulk] cattle_parts 조회 오류:", partsError);
      return NextResponse.json({ error: partsError.message }, { status: 500 });
    }

    const partById = new Map<string, (typeof parts)[number]>();
    (parts ?? []).forEach((p) => partById.set(p.id, p));

    // 관련 listing 목록 → open 회차 매핑
    const listingIds = Array.from(
      new Set(
        (parts ?? [])
          .map((p) => p.listing_id as string | null)
          .filter((v): v is string => !!v),
      ),
    );

    let openAuctionByListing = new Map<
      string,
      { auctionId: string; startedAt: string | null; durationMin: number | null }
    >();

    if (listingIds.length > 0) {
      const { data: links } = await supabase
        .from("auction_listings")
        .select(
          "listing_id, auction_id, auctions(id, status, started_at, round_duration_min)",
        )
        .in("listing_id", listingIds);

      (links ?? []).forEach((link: any) => {
        if (link.auctions?.status === "open") {
          openAuctionByListing.set(link.listing_id, {
            auctionId: link.auction_id,
            startedAt: link.auctions.started_at ?? null,
            durationMin: link.auctions.round_duration_min ?? null,
          });
        }
      });
    }

    // 각 부위의 기존 입찰 조회 (동일 dealer)
    const { data: existingBids } = await supabase
      .from("bids")
      .select("id, part_id, bid_price, bid_amount, auction_id, rank")
      .eq("dealer_id", finalDealerId)
      .in("part_id", partIds);

    const existingByPart = new Map<string, (typeof existingBids)[number]>();
    (existingBids ?? []).forEach((b) => existingByPart.set(b.part_id, b));

    // 이미 낙찰 확정된 부위 (rank != null) 는 편집 불가로 취급 → 실패
    // 그리고 다른 딜러가 낙찰받은 경우도 확인 (rank in any bid)
    const { data: settledCheck } = await supabase
      .from("bids")
      .select("part_id, rank")
      .in("part_id", partIds)
      .not("rank", "is", null);

    const settledPartIds = new Set(
      (settledCheck ?? []).map((b) => b.part_id as string),
    );

    const successful: SuccessItem[] = [];
    const failed: FailedItem[] = [];

    // 각 아이템 처리 (순차 · 실패는 개별 기록)
    for (const item of items) {
      const part = partById.get(item.partId);
      if (!part) {
        failed.push({
          partId: item.partId,
          reason: "not_found",
          message: "부위 정보를 찾을 수 없습니다.",
        });
        continue;
      }
      if (!part.is_included) {
        failed.push({
          partId: item.partId,
          reason: "not_included",
          message: "상장에 포함되지 않은 부위입니다.",
        });
        continue;
      }
      const listingStatus = (part.cattle_listings as any)?.status;
      if (!["approved", "auction"].includes(listingStatus)) {
        failed.push({
          partId: item.partId,
          reason: "invalid_status",
          message: "입찰 가능한 상태가 아닙니다.",
        });
        continue;
      }
      if (settledPartIds.has(item.partId)) {
        failed.push({
          partId: item.partId,
          reason: "settled",
          message: "이미 낙찰이 확정된 부위입니다.",
        });
        continue;
      }

      const openInfo = part.listing_id
        ? openAuctionByListing.get(part.listing_id)
        : undefined;
      if (!openInfo) {
        failed.push({
          partId: item.partId,
          reason: "no_open_round",
          message: "현재 진행 중인 회차가 아닙니다.",
        });
        continue;
      }
      if (openInfo.startedAt && openInfo.durationMin) {
        const startedAtMs = new Date(openInfo.startedAt).getTime();
        const durationMs = openInfo.durationMin * 60 * 1000;
        if (Date.now() > startedAtMs + durationMs) {
          failed.push({
            partId: item.partId,
            reason: "closed",
            message: "회차 시간이 종료되었습니다.",
          });
          continue;
        }
      }
      if (part.min_price && item.pricePerKg < part.min_price) {
        failed.push({
          partId: item.partId,
          reason: "below_min",
          message: `최저가(${part.min_price.toLocaleString()}원) 이상으로 입찰해 주세요.`,
        });
        continue;
      }

      const partWeight = part.weight ?? 0;
      const bidAmount = Math.round(item.pricePerKg * partWeight);
      const resolvedAuctionId = auctionIdInput ?? openInfo.auctionId ?? null;

      const existing = existingByPart.get(item.partId);
      if (existing) {
        const { data: updated, error: updateError } = await supabase
          .from("bids")
          .update({
            bid_price: item.pricePerKg,
            bid_amount: bidAmount,
            auction_id: resolvedAuctionId,
          })
          .eq("id", existing.id)
          .select("id")
          .single();

        if (updateError) {
          console.error("[bids/bulk] update 오류", item.partId, updateError);
          failed.push({
            partId: item.partId,
            reason: "db_error",
            message: updateError.message,
          });
          continue;
        }

        // audit log · 실패해도 입찰 자체는 성공 처리
        await supabase.from("bid_audit_logs").insert({
          bid_id: existing.id,
          auction_id: resolvedAuctionId || existing.auction_id || null,
          part_id: item.partId,
          dealer_id: finalDealerId,
          action_type: "dealer_update",
          old_bid_price: existing.bid_price,
          new_bid_price: item.pricePerKg,
          old_bid_amount: existing.bid_amount,
          new_bid_amount: bidAmount,
          performed_by: null,
        });

        successful.push({
          partId: item.partId,
          bidId: updated.id,
          isUpdate: true,
        });
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from("bids")
          .insert({
            auction_id: resolvedAuctionId,
            listing_id: part.listing_id,
            part_id: item.partId,
            dealer_id: finalDealerId,
            bid_price: item.pricePerKg,
            bid_amount: bidAmount,
          })
          .select("id")
          .single();

        if (insertError) {
          console.error("[bids/bulk] insert 오류", item.partId, insertError);
          failed.push({
            partId: item.partId,
            reason: "db_error",
            message: insertError.message,
          });
          continue;
        }

        successful.push({
          partId: item.partId,
          bidId: inserted.id,
          isUpdate: false,
        });
      }
    }

    return NextResponse.json({ successful, failed });
  } catch (error) {
    console.error("[bids/bulk] 처리 오류:", error);
    return NextResponse.json(
      { error: "일괄 입찰 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
