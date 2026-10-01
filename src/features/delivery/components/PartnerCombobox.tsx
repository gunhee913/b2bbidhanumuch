"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Partner } from "../types";

export interface PartnerComboboxProps {
  partners: Partner[];
  value: string | null;
  onChange: (partnerId: string | null) => void;
  placeholder?: string;
}

/**
 * 거래처 고르개 · 거래처명·사업자번호·대표로 찾는다.
 * 목록은 그 중도매인이 맡은 거래처만 온다 (부모에서 `useDealerPartners` 가 거른다).
 *
 * **고른 칸을 칠하지 않는다.** 예전엔 고르면 호박색으로 채웠는데 두 가지가 틀어졌다.
 * 하나는 밝은 바탕 전용 색(`amber-50`)이라 어두운 바탕에선 형광펜 자국처럼 떴고,
 * 다른 하나는 더 근본적이다 — 일을 다 끝낸 저녁이면 모든 줄이 노래진다. 끝난 상태가
 * 가장 시끄러우면 안 된다. 다 됐는지 아닌지는 적힌 이름이 이미 말해 준다.
 *
 * 호박색은 「저장 전」 하나에만 남겨 뒀다 (`DeliveryPartTable` 의 왼쪽 띠).
 */
export function PartnerCombobox({
  partners,
  value,
  onChange,
  placeholder = "거래처 검색",
}: PartnerComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => (value ? (partners.find((p) => p.id === value) ?? null) : null),
    [partners, value],
  );

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const filtered = useMemo(() => {
    if (!query.trim()) return partners;
    const q = query.trim().toLowerCase();
    return partners.filter((p) => {
      const hay = `${p.name} ${p.partnerNo} ${p.representative}`.toLowerCase();
      return hay.includes(q);
    });
  }, [partners, query]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-7 w-full items-center justify-between gap-1 rounded border bg-surface px-2 text-[12px] transition-colors",
          open ? "border-focus" : "border-line hover:border-content-ghost",
        )}
      >
        <span
          className={cn(
            "min-w-0 truncate text-left",
            selected ? "font-semibold text-content" : "text-content-ghost",
          )}
        >
          {selected ? selected.name : placeholder}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-content-ghost" />
      </button>

      {open ? (
        <div className="absolute z-30 mt-1 w-[260px] overflow-hidden rounded-md border border-line bg-surface shadow-xl">
          <div className="flex items-center gap-1.5 border-b border-line-soft px-2 py-1.5">
            <Search className="h-3.5 w-3.5 text-content-faint" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="거래처명, 사업자번호로 검색"
              className="h-6 flex-1 border-none bg-transparent p-0 text-[12px] outline-none placeholder:text-content-faint"
            />
          </div>
          <ul className="max-h-[280px] overflow-y-auto py-1">
            {selected ? (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onChange(null);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex w-full items-center px-3 py-1.5 text-left text-[11px] font-semibold text-lost hover:bg-surface-muted"
                >
                  선택 해제
                </button>
              </li>
            ) : null}
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-[11px] text-content-faint">
                검색 결과가 없습니다.
              </li>
            ) : (
              filtered.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(p.id);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={cn(
                      "flex w-full flex-col items-start gap-0.5 px-3 py-1.5 text-left hover:bg-surface-muted",
                      value === p.id && "bg-surface-accent",
                    )}
                  >
                    <span className="text-[12px] font-bold text-content">
                      {p.name}
                    </span>
                    <span className="text-[10px] tabular-nums text-content-faint">
                      {p.partnerNo}
                      {p.representative ? ` · ${p.representative}` : ""}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
