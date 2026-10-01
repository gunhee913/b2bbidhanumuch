"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface UseRealtimeTableOptions {
  /** public 스키마의 테이블 이름 · supabase_realtime publication 에 들어 있어야 한다 */
  table: string;
  onChange?: () => void;
  enabled?: boolean;
}

/**
 * 한 테이블의 모든 변경을 듣고 알린다.
 *
 * 무엇이 어떻게 바뀌었는지는 넘기지 않는다. 듣는 쪽이 전부 "그러면 다시 받아라" 로만
 * 쓰기 때문이다 — 변경 내용을 들고 와서 자리에 끼워 넣으려면 지금 들고 있는 목록이
 * 서버와 같다는 보장이 필요한데, 여러 자리에서 동시에 고치는 구조라 그 보장이 없다.
 */
export function useRealtimeTable({
  table,
  onChange,
  enabled = true,
}: UseRealtimeTableOptions) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`realtime-${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => {
        onChangeRef.current?.();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, enabled]);
}
