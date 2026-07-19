"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * 일괄 입찰 로컬 상태 · 프리셋 적용 · submit mutation 을 하나의 훅으로 묶는다.
 *
 * `contextKey` 는 개체별에서는 `listingId`, 부위별에서는 `partGroup` 을 넣어 준다.
 * 컨텍스트가 바뀌면 자동으로 선택/편집 상태를 초기화한다.
 */

export interface BulkBidFailure {
  partId: string;
  reason:
    | "not_found"
    | "not_included"
    | "invalid_status"
    | "no_open_round"
    | "closed"
    | "below_min"
    | "settled"
    | "invalid"
    | "db_error";
  message: string;
}

export interface BulkBidSuccess {
  partId: string;
  bidId: string;
  isUpdate: boolean;
}

export interface BulkBidResponse {
  successful: BulkBidSuccess[];
  failed: BulkBidFailure[];
}

export interface BulkBidSubmitPayload {
  auctionId?: string | null;
  dealerId: string;
  items: Array<{ partId: string; pricePerKg: number }>;
}

export function useBulkBid(contextKey: string | null) {
  const queryClient = useQueryClient();

  const [selectedPartIds, setSelectedPartIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [pricesByPartId, setPricesByPartId] = useState<Map<string, number>>(
    () => new Map(),
  );

  // 컨텍스트(개체/부위 그룹) 이동 시 초기화
  useEffect(() => {
    setSelectedPartIds(new Set());
    setPricesByPartId(new Map());
  }, [contextKey]);

  const toggleSelect = useCallback((partId: string) => {
    setSelectedPartIds((prev) => {
      const next = new Set(prev);
      if (next.has(partId)) next.delete(partId);
      else next.add(partId);
      return next;
    });
  }, []);

  const setSelected = useCallback((partIds: string[]) => {
    setSelectedPartIds(new Set(partIds));
  }, []);

  const clearSelected = useCallback(() => {
    setSelectedPartIds(new Set());
  }, []);

  /** 편집한 내 입찰가 전체 초기화 (선택 상태는 유지) */
  const resetPrices = useCallback(() => {
    setPricesByPartId(new Map());
  }, []);

  const setPrice = useCallback((partId: string, price: number | null) => {
    setPricesByPartId((prev) => {
      const next = new Map(prev);
      if (price == null || Number.isNaN(price) || price <= 0) {
        next.delete(partId);
      } else {
        next.set(partId, Math.round(price));
      }
      return next;
    });
  }, []);

  /** 선택된 부위 전체에 동일 단가 세팅 */
  const applyFlatPrice = useCallback(
    (price: number) => {
      if (!Number.isFinite(price) || price <= 0) return;
      const rounded = Math.round(price);
      setPricesByPartId((prev) => {
        const next = new Map(prev);
        selectedPartIds.forEach((id) => next.set(id, rounded));
        return next;
      });
    },
    [selectedPartIds],
  );

  /**
   * 선택된 각 부위의 `minPrice × multiplier` 를 계산해서 세팅한다.
   * multiplier 예: 1.05 → "최저단가 +5%"
   */
  const applyMinPriceMultiplier = useCallback(
    (multiplier: number, minPriceByPart: Map<string, number | null>) => {
      if (!Number.isFinite(multiplier) || multiplier <= 0) return;
      setPricesByPartId((prev) => {
        const next = new Map(prev);
        selectedPartIds.forEach((id) => {
          const min = minPriceByPart.get(id);
          if (!min || min <= 0) return;
          next.set(id, Math.round(min * multiplier));
        });
        return next;
      });
    },
    [selectedPartIds],
  );

  /**
   * 선택된 각 부위의 `minPrice + delta` 를 계산해서 세팅한다.
   * delta 예: 100 → "최저단가 +100원", -50 → 최저단가 -50원
   */
  const applyMinPricePlus = useCallback(
    (delta: number, minPriceByPart: Map<string, number | null>) => {
      if (!Number.isFinite(delta)) return;
      setPricesByPartId((prev) => {
        const next = new Map(prev);
        selectedPartIds.forEach((id) => {
          const min = minPriceByPart.get(id);
          if (!min || min <= 0) return;
          const target = Math.round(min + delta);
          if (target <= 0) return;
          next.set(id, target);
        });
        return next;
      });
    },
    [selectedPartIds],
  );

  /**
   * 부위별 preset (개체별 뷰) · 그룹명(예: "등심") → 단가
   * 각 선택된 부위의 `partGroup` 이 preset 에 있으면 해당 단가로 세팅.
   */
  const applyPartGroupPreset = useCallback(
    (
      preset: Map<string, number>,
      groupByPart: Map<string, string>,
    ) => {
      setPricesByPartId((prev) => {
        const next = new Map(prev);
        selectedPartIds.forEach((id) => {
          const group = groupByPart.get(id);
          if (!group) return;
          const price = preset.get(group);
          if (price && price > 0) next.set(id, Math.round(price));
        });
        return next;
      });
    },
    [selectedPartIds],
  );

  /**
   * 등급별 preset (부위별 뷰) · 등급 코드(예: "1++(9)") → 단가
   * 각 선택된 부위의 등급이 preset 에 있으면 해당 단가로 세팅.
   */
  const applyGradePreset = useCallback(
    (preset: Map<string, number>, gradeByPart: Map<string, string>) => {
      setPricesByPartId((prev) => {
        const next = new Map(prev);
        selectedPartIds.forEach((id) => {
          const grade = gradeByPart.get(id);
          if (!grade) return;
          const price = preset.get(grade);
          if (price && price > 0) next.set(id, Math.round(price));
        });
        return next;
      });
    },
    [selectedPartIds],
  );

  const mutation = useMutation<BulkBidResponse, Error, BulkBidSubmitPayload>({
    mutationFn: async (payload) => {
      const res = await fetch("/api/bids/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "요청 실패" }));
        throw new Error(err.error || "일괄 입찰 요청이 실패했습니다.");
      }
      return (await res.json()) as BulkBidResponse;
    },
    onSuccess: (data) => {
      // 성공한 부위의 편집 상태만 정리 (실패는 그대로 두어 재시도 가능)
      if (data.successful.length > 0) {
        setPricesByPartId((prev) => {
          const next = new Map(prev);
          data.successful.forEach((s) => next.delete(s.partId));
          return next;
        });
        setSelectedPartIds((prev) => {
          const next = new Set(prev);
          data.successful.forEach((s) => next.delete(s.partId));
          return next;
        });
      }
      queryClient.invalidateQueries({
        queryKey: ["live-auction", "listings"],
      });
      queryClient.invalidateQueries({
        queryKey: ["live-auction", "my-bids"],
      });
    },
  });

  const readySubmitItems = useMemo(() => {
    const items: { partId: string; pricePerKg: number }[] = [];
    selectedPartIds.forEach((id) => {
      const price = pricesByPartId.get(id);
      if (price && price > 0) items.push({ partId: id, pricePerKg: price });
    });
    return items;
  }, [selectedPartIds, pricesByPartId]);

  return {
    // state
    selectedPartIds,
    pricesByPartId,
    // selectors
    readySubmitItems,
    // actions · selection
    toggleSelect,
    setSelected,
    clearSelected,
    // actions · pricing
    setPrice,
    resetPrices,
    applyFlatPrice,
    applyMinPriceMultiplier,
    applyMinPricePlus,
    applyPartGroupPreset,
    applyGradePreset,
    // mutation
    submit: mutation.mutate,
    submitAsync: mutation.mutateAsync,
    isSubmitting: mutation.isPending,
    lastResult: mutation.data ?? null,
    lastError: mutation.error ?? null,
    resetResult: mutation.reset,
  };
}
