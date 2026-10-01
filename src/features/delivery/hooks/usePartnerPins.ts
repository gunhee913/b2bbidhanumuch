"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/** 숫자 단축키 자리 수 · 1~9 · 0 은 「배정 해제」 로 쓴다 */
export const PARTNER_SLOT_COUNT = 9;

const QUERY_KEY = ["delivery-partner-pins"] as const;

const EMPTY_PINS: (string | null)[] = Array.from(
  { length: PARTNER_SLOT_COUNT },
  () => null,
);

/**
 * 1~9 에 걸어 둔 거래처 · 중도매인 단위로 공유한다.
 *
 * 쓴 횟수로 자동 정렬하지 않는다. 어제 2번이던 곳이 오늘 3번이 되면 손이 외운 자리가
 * 매일 어긋나, 빠르라고 만든 단축키가 오히려 잘못 배정하는 길이 된다.
 *
 * 서버에 두는 까닭은 「1번은 대한식당」 이 업소 공통 약속이기 때문이다. 브라우저에만
 * 두면 PC 를 바꾸거나 직원이 들어올 때마다 자리가 달라져, 외워서 쓰는 기능인데
 * 외운 것을 믿을 수 없게 된다.
 */
export function usePartnerPins() {
  return useQuery<(string | null)[], Error>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await fetch("/api/delivery/partner-pins");
      if (!res.ok) throw new Error("단축키를 불러오지 못했습니다.");
      const json = (await res.json()) as { pins?: (string | null)[] };
      /* 자리 수가 늘어도 길이는 늘 맞춰 둔다 · 짧으면 `pins[8]` 이 undefined 가 된다 */
      return [...(json.pins ?? []), ...EMPTY_PINS].slice(0, PARTNER_SLOT_COUNT);
    },
    staleTime: 60_000,
  });
}

export interface SetPinPayload {
  /** 0-based · 키 `1` → 0 */
  slot: number;
  partnerId: string | null;
}

export function useSetPartnerPin() {
  const queryClient = useQueryClient();

  return useMutation<
    unknown,
    Error,
    SetPinPayload,
    { prev?: (string | null)[] }
  >({
    mutationFn: async ({ slot, partnerId }) => {
      const res = await fetch("/api/delivery/partner-pins", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot: slot + 1, partnerId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "단축키를 저장하지 못했습니다.");
      }
      return res.json();
    },

    /*
     * 자리를 고르는 즉시 띠가 바뀌어야 한다. 왕복을 기다리면 고른 사람이 눌렸는지
     * 몰라 한 번 더 고르고, 그 사이 다른 자리에 같은 거래처가 들어간다.
     */
    onMutate: async ({ slot, partnerId }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const prev = queryClient.getQueryData<(string | null)[]>(QUERY_KEY);

      queryClient.setQueryData<(string | null)[]>(QUERY_KEY, (old) => {
        const next = [...(old ?? EMPTY_PINS)];
        /* 서버와 같은 규칙 · 같은 거래처가 걸려 있던 자리는 비운다 */
        if (partnerId) {
          const dup = next.indexOf(partnerId);
          if (dup >= 0) next[dup] = null;
        }
        next[slot] = partnerId;
        return next;
      });

      return { prev };
    },

    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(QUERY_KEY, ctx.prev);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
