"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createBid } from "@/features/auctions/api";
import type { LiveListing, LivePart } from "../api";
import { formatGradeLabel } from "../lib/grade";
import { formatWeightKg } from "../lib/masking";
import { showBatchBidToast, showBidToast } from "../components/BidToast";
import type { BulkBidResponse } from "../lib/bulkBidResponse";

export interface SheetBiddingOptions {
  dealerId: string | null;
  auctionId: string | null;
  /** 개체 단위 입찰 가능 여부 · 불가면 사유 문구 */
  getBlockReason: (listing: LiveListing) => string | undefined;
  onRequestLogin: () => void;
  onOpenMyBids?: () => void;
}

/** 부위 하나의 입력 상태 · 셀이 그대로 그린다 */
export interface SheetBidCellState {
  /** 사용자가 편집 중인 값 · 없으면 서버의 내 입찰가(또는 빈칸)를 보여준다 */
  draft: number | null | undefined;
  pending: boolean;
  error: string | null;
  /** 성공 플래시 토큰 · 바뀔 때마다 셀이 한 번 ink 로 번쩍인다 */
  flashToken: number;
}

/** 일괄 입찰 대상 한 칸 · 부위 그룹은 여러 개체에 걸치므로 부위마다 개체를 함께 들고 다닌다 */
export interface SheetBidEntry {
  listing: LiveListing;
  part: LivePart;
}

function myBidOf(part: LivePart, dealerId: string | null) {
  if (!dealerId) return null;
  return part.allBids.find((b) => b.dealerId === dealerId) ?? null;
}

function isSettled(part: LivePart): boolean {
  return part.allBids.some((b) => b.rank != null);
}

/**
 * 상장표 인라인 입찰 상태 · 부위별 임시값(draft) · 진행 중 · 오류 · 성공 플래시.
 *
 *  - 단건: Enter → `/api/bids` · 서버 검증과 토스트는 일괄 입찰과 같다
 *  - 취소: 선택 행의 저장된 내 입찰 1건 `DELETE /api/bids/[id]` · 푸터 「입찰 취소 · 부위 가격」 2단계 확인
 *  - 묶음 일괄(개체 · 부위 그룹): 변경된 draft 만 모아 `/api/bids/bulk` · 성공분 draft 정리 · 실패분은 셀 오류로 남김
 *  - "변경(dirty)" = draft 가 있고 서버의 내 입찰가와 다를 때. 성공하면 draft 를 지워 서버 값이 그대로 보이게 한다.
 */
export function useSheetBidding({
  dealerId,
  auctionId,
  getBlockReason,
  onRequestLogin,
  onOpenMyBids,
}: SheetBiddingOptions) {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Map<string, number | null>>(new Map());
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [flash, setFlash] = useState<Map<string, number>>(new Map());
  const [submittingBatches, setSubmittingBatches] = useState<Set<string>>(
    new Set(),
  );

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["live-auction", "listings"] });
    queryClient.invalidateQueries({ queryKey: ["live-auction", "my-bids"] });
  }, [queryClient]);

  const setDraft = useCallback((partId: string, price: number | null) => {
    setDrafts((prev) => new Map(prev).set(partId, price));
    setErrors((prev) => {
      if (!prev.has(partId)) return prev;
      const next = new Map(prev);
      next.delete(partId);
      return next;
    });
  }, []);

  const clearDraft = useCallback((partId: string) => {
    setDrafts((prev) => {
      if (!prev.has(partId)) return prev;
      const next = new Map(prev);
      next.delete(partId);
      return next;
    });
  }, []);

  const clearDrafts = useCallback((partIds: string[]) => {
    setDrafts((prev) => {
      const next = new Map(prev);
      partIds.forEach((id) => next.delete(id));
      return next;
    });
  }, []);

  const bumpFlash = useCallback((partIds: string[]) => {
    setFlash((prev) => {
      const next = new Map(prev);
      partIds.forEach((id) => next.set(id, (prev.get(id) ?? 0) + 1));
      return next;
    });
  }, []);

  const setError = useCallback((partId: string, message: string) => {
    setErrors((prev) => new Map(prev).set(partId, message));
  }, []);

  /** 셀이 표시할 값 · draft 우선, 없으면 서버 내 입찰가 */
  const effectivePrice = useCallback(
    (part: LivePart): number | null => {
      if (drafts.has(part.id)) return drafts.get(part.id) ?? null;
      return myBidOf(part, dealerId)?.bidPrice ?? null;
    },
    [drafts, dealerId],
  );

  const isDirty = useCallback(
    (part: LivePart): boolean => {
      if (!drafts.has(part.id)) return false;
      const d = drafts.get(part.id);
      if (d == null || d <= 0) return false;
      return d !== (myBidOf(part, dealerId)?.bidPrice ?? null);
    },
    [drafts, dealerId],
  );

  const cellState = useCallback(
    (partId: string): SheetBidCellState => ({
      draft: drafts.get(partId),
      pending: pending.has(partId),
      error: errors.get(partId) ?? null,
      flashToken: flash.get(partId) ?? 0,
    }),
    [drafts, pending, errors, flash],
  );

  const revertParts = useCallback(
    (parts: LivePart[]) => {
      clearDrafts(parts.map((p) => p.id));
    },
    [clearDrafts],
  );

  const dirtyOf = useCallback(
    (parts: LivePart[]) => parts.filter((p) => !isSettled(p) && isDirty(p)),
    [isDirty],
  );

  /** 단건 · Enter */
  const submitOne = useCallback(
    async (listing: LiveListing, part: LivePart) => {
      if (!dealerId) return onRequestLogin();
      const blocked = getBlockReason(listing);
      if (blocked) return setError(part.id, blocked);
      if (isSettled(part)) return setError(part.id, "마감된 부위입니다.");
      const price = effectivePrice(part);
      if (!price || price <= 0)
        return setError(part.id, "입찰가를 입력하세요.");
      if (part.minPrice && price < part.minPrice)
        return setError(part.id, "최저가 이상을 입력하세요.");
      if (!part.weight) return setError(part.id, "중량 정보가 없습니다.");
      const previous = myBidOf(part, dealerId)?.bidPrice ?? null;
      if (previous === price) return clearDraft(part.id);

      setPending((prev) => new Set(prev).add(part.id));
      try {
        await createBid({
          partId: part.id,
          dealerId,
          bidPrice: price,
          weight: part.weight,
          ...(auctionId ? { auctionId } : {}),
        });
        clearDraft(part.id);
        bumpFlash([part.id]);
        invalidate();
        showBidToast({
          partId: part.id,
          previousPrice: previous,
          price,
          listingPartNo: part.listingPartNo,
          partName: part.partName,
          gradeLabel: formatGradeLabel(listing.grade, listing.marblingScore),
          weightLabel: formatWeightKg(part.weight),
          totalAmount: Math.round(price * part.weight),
          onOpenMyBids,
        });
      } catch (e) {
        setError(
          part.id,
          e instanceof Error ? e.message : "입찰 등록에 실패했습니다.",
        );
      } finally {
        setPending((prev) => {
          const next = new Set(prev);
          next.delete(part.id);
          return next;
        });
      }
    },
    [
      dealerId,
      auctionId,
      getBlockReason,
      effectivePrice,
      onRequestLogin,
      clearDraft,
      bumpFlash,
      invalidate,
      setError,
      onOpenMyBids,
    ],
  );

  /** 부위의 저장된 내 입찰(진행 중) · 없으면 null · 푸터 취소 버튼 노출 판정 */
  const myOpenBid = useCallback(
    (part: LivePart) => (isSettled(part) ? null : myBidOf(part, dealerId)),
    [dealerId],
  );

  /** 단건 취소 · 선택 행의 저장된 내 입찰 삭제 (`DELETE /api/bids/[id]` · 서버가 회차 진행 중만 허용) */
  const cancelOne = useCallback(
    async (listing: LiveListing, part: LivePart) => {
      if (!dealerId) return onRequestLogin();
      const blocked = getBlockReason(listing);
      if (blocked) return setError(part.id, blocked);
      const mine = myOpenBid(part);
      if (!mine) return setError(part.id, "취소할 입찰이 없습니다.");

      setPending((prev) => new Set(prev).add(part.id));
      try {
        const res = await fetch(`/api/bids/${mine.id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || "입찰 취소에 실패했습니다.");
        }
        clearDraft(part.id);
        invalidate();
        toast.success(`${part.partName} 입찰 취소`, {
          description: `${part.listingPartNo} · ${mine.bidPrice.toLocaleString("ko-KR")}원/kg`,
        });
      } catch (e) {
        setError(
          part.id,
          e instanceof Error ? e.message : "입찰 취소에 실패했습니다.",
        );
      } finally {
        setPending((prev) => {
          const next = new Set(prev);
          next.delete(part.id);
          return next;
        });
      }
    },
    [
      dealerId,
      getBlockReason,
      onRequestLogin,
      myOpenBid,
      clearDraft,
      invalidate,
      setError,
    ],
  );

  /**
   * 묶음 일괄 · 변경된 draft 만 `/api/bids/bulk` 한 번에.
   * 개체(상장표) · 부위 그룹(부위별 상장표) 공용 · 입찰 불가 개체의 부위는 셀 오류로 남기고 나머지만 보낸다.
   */
  const submitBatch = useCallback(
    async (batchKey: string, entries: SheetBidEntry[], label: string) => {
      if (!dealerId) return onRequestLogin();
      const targets = entries.filter(
        ({ part }) => !isSettled(part) && isDirty(part),
      );
      if (targets.length === 0) return;
      const sendable = targets.filter(({ listing, part }) => {
        const blocked = getBlockReason(listing);
        if (blocked) setError(part.id, blocked);
        return !blocked;
      });
      if (sendable.length === 0) return;
      const items = sendable.map(({ part }) => ({
        partId: part.id,
        pricePerKg: drafts.get(part.id) as number,
      }));
      // 영수증에 「얼마에서 얼마로」를 쓰려면 보내기 전 값을 붙잡아 둬야 한다
      const previousOf = new Map(
        sendable.map(({ part }) => [
          part.id,
          myBidOf(part, dealerId)?.bidPrice ?? null,
        ]),
      );
      setSubmittingBatches((prev) => new Set(prev).add(batchKey));
      setPending((prev) => {
        const next = new Set(prev);
        items.forEach((i) => next.add(i.partId));
        return next;
      });
      try {
        const res = await fetch("/api/bids/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dealerId, auctionId, items }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "요청 실패" }));
          throw new Error(err.error || "일괄 입찰 요청이 실패했습니다.");
        }
        const data = (await res.json()) as BulkBidResponse;
        const okIds = data.successful.map((s) => s.partId);
        clearDrafts(okIds);
        bumpFlash(okIds);
        data.failed.forEach((f) => setError(f.partId, f.message));
        invalidate();
        /*
         * 한 건이면 Enter 로 넣었을 때와 같은 단건 영수증을, 여러 건이면 같은 껍데기의
         * 묶음 영수증을 보여 준다. 성공이든 일부 실패든 카드는 하나다 — 같은 일(입찰을
         * 넣었다)에 서로 다른 모양이 뜨면 결과를 읽기 전에 「무엇이 달라서 다르지」부터
         * 찾게 되고, 그 사이 정작 확인해야 할 금액이 뒤로 밀린다.
         */
        const only =
          okIds.length === 1 && data.failed.length === 0
            ? sendable.find(({ part }) => part.id === okIds[0])
            : undefined;
        if (only?.part.weight) {
          const price = drafts.get(only.part.id) as number;
          showBidToast({
            partId: only.part.id,
            previousPrice: previousOf.get(only.part.id) ?? null,
            price,
            listingPartNo: only.part.listingPartNo,
            partName: only.part.partName,
            gradeLabel: formatGradeLabel(
              only.listing.grade,
              only.listing.marblingScore,
            ),
            weightLabel: formatWeightKg(only.part.weight),
            totalAmount: Math.round(price * only.part.weight),
            onOpenMyBids,
          });
        } else {
          const okSet = new Set(okIds);
          const totalAmount = sendable.reduce(
            (sum, { part }) =>
              okSet.has(part.id)
                ? sum +
                  Math.round((drafts.get(part.id) as number) * (part.weight ?? 0))
                : sum,
            0,
          );
          showBatchBidToast({
            batchKey,
            label,
            okCount: okIds.length,
            failedCount: data.failed.length,
            totalAmount,
            onOpenMyBids,
          });
        }
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "일괄 입찰에 실패했습니다.";
        sendable.forEach(({ part }) => setError(part.id, message));
      } finally {
        setSubmittingBatches((prev) => {
          const next = new Set(prev);
          next.delete(batchKey);
          return next;
        });
        setPending((prev) => {
          const next = new Set(prev);
          items.forEach((i) => next.delete(i.partId));
          return next;
        });
      }
    },
    [
      dealerId,
      auctionId,
      getBlockReason,
      isDirty,
      drafts,
      onRequestLogin,
      clearDrafts,
      bumpFlash,
      invalidate,
      setError,
      onOpenMyBids,
    ],
  );

  return {
    cellState,
    effectivePrice,
    isDirty,
    dirtyOf,
    setDraft,
    clearDraft,
    revertParts,
    submitOne,
    myOpenBid,
    cancelOne,
    submitBatch,
    isBatchSubmitting: (batchKey: string) => submittingBatches.has(batchKey),
  };
}
