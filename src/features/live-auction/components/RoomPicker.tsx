"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useClickAway } from "react-use";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 제목이 곧 선택기 · 경매장 상세의 고정축(개체 또는 부위)을 바꾼다.
 *
 * ←/→ 와 사진 판 화살표는 옆 항목으로만 가지만, 여기서는 어느 항목으로든 뛴다.
 * 축이 무엇이든 동작이 같아야 해서 항목 종류는 바깥이 정하고 여기선 고르기만 한다.
 */
export function RoomPicker<T>({
  title,
  badge,
  items,
  keyOf,
  isCurrent,
  searchTextOf,
  renderRow,
  onPick,
  placeholder,
  label,
  width = 340,
}: {
  /** 지금 고정된 축 이름 · 접수번호 또는 부위명 */
  title: string;
  /** 제목 옆 작은 숫자 · `2/15` 또는 건수 */
  badge?: string | null;
  items: T[];
  keyOf: (item: T) => string;
  isCurrent: (item: T) => boolean;
  /** 검색어와 맞춰 볼 문자열들 */
  searchTextOf: (item: T) => (string | number | null | undefined)[];
  renderRow: (item: T) => ReactNode;
  onPick: (item: T) => void;
  placeholder: string;
  /** 버튼 스크린리더 이름 */
  label: string;
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useClickAway(rootRef, () => setOpen(false));

  useEffect(() => {
    if (open) inputRef.current?.focus();
    else setQuery("");
  }, [open]);

  const keyword = query.trim().toLowerCase();
  const matches = keyword
    ? items.filter((item) =>
        searchTextOf(item)
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(keyword)),
      )
    : items;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={label}
        className="-mx-2 flex items-center gap-2 rounded px-2 py-1 transition-colors hover:bg-surface-muted"
      >
        <span className="whitespace-nowrap text-[22px] font-bold leading-none tabular-nums -tracking-[0.02em] text-content">
          {title}
        </span>
        {badge ? (
          <span className="text-[12px] font-medium tabular-nums text-content-faint">
            {badge}
          </span>
        ) : null}
        <ChevronDown
          className={cn(
            "h-4 w-4 text-content-faint transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          style={{ width }}
          className="absolute left-0 top-full z-50 mt-1.5 border border-line bg-surface shadow-2xl"
        >
          <div className="flex items-center gap-2 border-b border-line-soft px-3 py-2.5">
            <Search
              className="h-4 w-4 shrink-0 text-content-faint"
              aria-hidden
            />
            {/* 안내 문구는 faint 까지만 · ghost 는 흰 배경에서 대비 1.7 이라 보이지 않는다 */}
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
              }}
              placeholder={placeholder}
              className="h-5 w-full bg-transparent text-[13px] text-content outline-none placeholder:text-content-faint"
            />
          </div>
          {matches.length === 0 ? (
            <p className="px-3 py-6 text-center text-[12.5px] text-content-faint">
              찾는 항목이 없습니다.
            </p>
          ) : (
            <ul
              role="listbox"
              className="scrollbar-thin max-h-[340px] overflow-y-auto py-1"
            >
              {matches.map((item) => {
                const current = isCurrent(item);
                return (
                  <li key={keyOf(item)}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={current}
                      onClick={() => {
                        setOpen(false);
                        if (!current) onPick(item);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors hover:bg-surface-muted",
                        current && "bg-surface-accent",
                      )}
                    >
                      {renderRow(item)}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
