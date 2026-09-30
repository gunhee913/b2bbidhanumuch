"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Partner } from "../types";

export interface PartnerComboboxProps {
  partners: Partner[];
  value: string | null;
  onChange: (partnerId: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * 배송지시 개체 카드 안에서 사용하는 거래처 선택 combobox.
 *
 * - 자동완성: 거래처명 / 사업자번호 부분일치
 * - 딜러 담당 거래처만 리스트로 전달됨 (부모에서 `useDealerPartners` 로 필터링)
 * - 저장 완료 시 disabled = true 로 잠금 (요구사항 상 딜러는 수정 불가)
 */
export function PartnerCombobox({
  partners,
  value,
  onChange,
  disabled = false,
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
      const hay =
        `${p.name} ${p.partnerNo} ${p.representative}`.toLowerCase();
      return hay.includes(q);
    });
  }, [partners, query]);

  const label = selected
    ? `${selected.name}`
    : disabled
      ? "-"
      : placeholder;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className={cn(
          "inline-flex h-7 w-full items-center justify-between gap-1 border px-2 text-[12px] transition-colors",
          disabled
            ? "cursor-not-allowed border-line-soft bg-surface-muted text-content-soft"
            : selected
              ? "border-amber-300 bg-amber-50 text-amber-900 hover:border-amber-400"
              : "border-line bg-surface text-content-soft hover:border-line",
        )}
      >
        <span className="min-w-0 truncate text-left font-semibold">
          {label}
        </span>
        {!disabled ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-content-faint" />
        ) : null}
      </button>

      {open && !disabled ? (
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
                  className="flex w-full items-center px-3 py-1.5 text-left text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
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
                      value === p.id && "bg-amber-50",
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
