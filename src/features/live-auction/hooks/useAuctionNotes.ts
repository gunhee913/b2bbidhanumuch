"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";

export type NoteTarget = "listing" | "part";

export interface NoteRow {
  /** 메모가 붙은 날 · 같은 부위라도 날이 다르면 다른 메모다 */
  activeDate: string;
  targetType: NoteTarget;
  targetId: string;
  body: string;
}

/** 열쇠 하나로 합친다 · 개체 접수번호와 부위 UUID 가 겹칠 일은 없지만 종류를 적어 둔다 */
const keyOf = (type: NoteTarget, id: string) => `${type}:${id}`;

/** 받아 오기 전에 내보내는 빈 목록 · 매번 새로 만들면 듣는 쪽이 통째로 다시 그려진다 */
const EMPTY_ROWS: NoteRow[] = [];

export interface DealerNotes {
  /** 받아 온 기간의 메모 전부 · 목록 패널이 쓴다 (차례는 쓰는 쪽에서 정한다) */
  rows: NoteRow[];
  /** 대상별 메모 · 없으면 빈 문자열이 아니라 아예 없다 */
  get: (type: NoteTarget, id: string) => string | null;
  /**
   * 빈 글을 넣으면 지운다 · 쓰는 쪽에서는 「다 지우기」 와 「없애기」 가 같은 행동이다.
   *
   * `activeDate` 를 받는 건 기간 조회 때문이다. 열흘치를 한 줄기로 늘어놓는 화면에서는
   * 지금 쓰는 부위가 어느 날 것인지 훅이 알 길이 없고, 틀린 날에 담으면 다시 읽을 때
   * 그 메모가 사라진 것처럼 보인다.
   */
  save: (
    type: NoteTarget,
    id: string,
    body: string,
    activeDate: string,
  ) => void;
  /** 저장이 아직 서버에 닿지 않은 동안 · 쪽지에 「저장 중」 을 띄우는 데 쓴다 */
  saving: boolean;
}

/**
 * 중도매인 메모 · 관심과 같은 열쇠로 개체와 부위에 붙는다.
 *
 * 딜러 단위로 공유되고 상장일이 바뀌면 그날 것만 남는 것도 관심과 같다. 사무실에서
 * 여럿이 같은 목록을 보는 구조라, 한 사람이 남긴 말이 다른 자리에도 바로 떠야 한다.
 *
 * 관심은 전역 `bidStore` 에 얹혀 있지만 메모는 react-query 로 둔다. 관심은 표를 그리는
 * 거의 모든 칸이 묻는 값이라 스토어에 두는 편이 맞았지만, 메모는 쓰는 자리와 자국
 * 하나뿐이고 본문·수정시각까지 들고 있어야 해서 서버 상태로 다루는 쪽이 단순하다.
 *
 * 하루가 아니라 기간을 받는 건 배송지시 때문이다. 경매장은 늘 그날 하나를 보지만
 * 배송지시는 조회기간의 낙찰 부위를 한 줄기로 늘어놓는다 — 그래도 메모가 붙는 자리는
 * 똑같은 (딜러 · 상장일 · 부위) 라, 경매장에서 남긴 말이 배송 화면에도 그대로 뜬다.
 */
export function useDealerNotes({
  from,
  to,
  all = false,
}: {
  from?: string | null;
  to?: string | null;
  /** 날짜를 가리지 않고 전부 · 사이드 메뉴 목록처럼 「언제 적었든」 찾는 자리 */
  all?: boolean;
}): DealerNotes {
  const queryClient = useQueryClient();
  const ranged = !!from && !!to;
  const enabled = all || ranged;
  const queryKey = useMemo(
    () =>
      all
        ? (["dealer-notes", "all"] as const)
        : (["dealer-notes", from, to] as const),
    [all, from, to],
  );

  const { data } = useQuery({
    queryKey,
    queryFn: async (): Promise<NoteRow[]> => {
      const qs = all ? "" : `?${new URLSearchParams({ from: from!, to: to! })}`;
      const res = await fetch(`/api/dealer-notes${qs}`);
      if (!res.ok) return [];
      const json = await res.json();
      return (json.notes ?? []) as NoteRow[];
    },
    enabled,
    staleTime: 30_000,
  });

  /* 같은 딜러의 다른 자리(다른 창 · 다른 직원)에서 고친 메모가 따라 들어온다 */
  useRealtimeTable({
    table: "dealer_notes",
    enabled,
    onChange: () => queryClient.invalidateQueries({ queryKey }),
  });

  const byKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const n of data ?? [])
      map.set(keyOf(n.targetType, n.targetId), n.body);
    return map;
  }, [data]);

  const mutation = useMutation({
    mutationFn: async (row: NoteRow) => {
      const res = await fetch("/api/dealer-notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activeDate: row.activeDate,
          targetType: row.targetType,
          targetId: row.targetId,
          body: row.body,
        }),
      });
      if (!res.ok) throw new Error("메모를 저장하지 못했습니다.");
    },
    /*
     * 먼저 화면에 반영하고 뒤에서 보낸다. 글을 쓰다 초점을 옮기는 순간 자국이 붙어야
     * 하는데, 왕복을 기다리면 그 사이 표가 「메모 없음」 으로 남아 두 번 쓰게 된다.
     */
    onMutate: async (row) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<NoteRow[]>(queryKey) ?? [];
      const rest = prev.filter(
        (n) =>
          !(n.targetType === row.targetType && n.targetId === row.targetId),
      );
      queryClient.setQueryData<NoteRow[]>(
        queryKey,
        row.body.trim() ? [...rest, row] : rest,
      );
      return { prev };
    },
    onError: (_err, _row, context) => {
      if (context?.prev) queryClient.setQueryData(queryKey, context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const { mutate } = mutation;

  const get = useCallback(
    (type: NoteTarget, id: string) => byKey.get(keyOf(type, id)) ?? null,
    [byKey],
  );

  const save = useCallback(
    (type: NoteTarget, id: string, body: string, activeDate: string) => {
      if (!activeDate) return;
      const next = body.trim();
      /* 바뀐 게 없으면 보내지 않는다 · 초점이 스칠 때마다 쓰기가 날아간다 */
      if (next === (byKey.get(keyOf(type, id)) ?? "")) return;
      mutate({ activeDate, targetType: type, targetId: id, body: next });
    },
    [byKey, mutate],
  );

  return { rows: data ?? EMPTY_ROWS, get, save, saving: mutation.isPending };
}

export interface AuctionNotes extends Omit<DealerNotes, "save"> {
  /** 경매장은 늘 그날 하나만 본다 · 날짜는 훅이 채운다 */
  save: (type: NoteTarget, id: string, body: string) => void;
}

/** 하루치만 보는 경매장용 겉포장 · 날짜를 매번 적지 않게 한다 */
export function useAuctionNotes(
  listingDate: string | null | undefined,
): AuctionNotes {
  const notes = useDealerNotes({ from: listingDate, to: listingDate });
  const { save: saveWithDate } = notes;

  const save = useCallback(
    (type: NoteTarget, id: string, body: string) => {
      if (!listingDate) return;
      saveWithDate(type, id, body, listingDate);
    },
    [listingDate, saveWithDate],
  );

  return { ...notes, save };
}
