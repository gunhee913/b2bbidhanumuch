"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useClickAway } from "react-use";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { isTypingInto } from "../lib/keyboard";

/** 키 한 벌과 그 뜻 · 바닥 안내줄이 이것만 늘어놓는다 */
function KeyHint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <span className="flex shrink-0 items-center gap-1">
      {keys.map((k) => (
        <kbd
          key={k}
          className="rounded-[4px] bg-surface-strong px-1.5 py-0.5 text-[10.5px] font-medium leading-[14px] text-content-mid"
        >
          {k}
        </kbd>
      ))}
      <span className="text-[11px] font-medium text-content-faint">{label}</span>
    </span>
  );
}

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
  hotkey,
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
  /** 이 키 하나로 연다 · 글을 쓰는 중이면 그냥 글자로 둔다 */
  hotkey?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  /** 키보드 커서 · 지금 고른 항목(`isCurrent`)과 별개로 움직인다 */
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  useClickAway(rootRef, () => setOpen(false));

  useEffect(() => {
    if (open) inputRef.current?.focus();
    else setQuery("");
  }, [open]);

  /** 검색어가 바뀌면 목록이 통째로 갈리므로 커서를 맨 위로 되돌린다 */
  useEffect(() => {
    setActive(0);
  }, [query]);

  const keyword = query.trim().toLowerCase();
  const matches = keyword
    ? items.filter((item) =>
        searchTextOf(item)
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(keyword)),
      )
    : items;

  /** 커서가 목록 밖으로 나가지 않게 · 스크롤도 따라 움직인다 */
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[active];
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const openPicker = () => {
    // 지금 보고 있는 항목에서 시작한다 · ↓ 한 번이면 바로 다음 개체다
    const i = items.findIndex(isCurrent);
    setActive(i < 0 ? 0 : i);
    setOpen(true);
  };

  const closePicker = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const pick = (item: T | undefined) => {
    if (!item) return;
    setOpen(false);
    if (!isCurrent(item)) onPick(item);
  };

  /*
   * 열려 있으면 Esc 만 본다 — 나머지 키는 검색칸이 받아야 할 글자다.
   * 닫고 나서는 제목 버튼으로 포커스를 돌려준다. 사라진 칸에 포커스를 두고 나오면
   * body 로 떨어져 ←/→ · ↓ 가 먹지 않는다.
   */
  useEffect(() => {
    if (!hotkey) return;
    const onKey = (e: KeyboardEvent) => {
      if (open) {
        if (e.key !== "Escape") return;
        e.preventDefault();
        closePicker();
        return;
      }
      if (e.key !== hotkey || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingInto(document.activeElement)) return;
      e.preventDefault();
      openPicker();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotkey, open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openPicker())}
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
          {/* 검색칸은 면으로 세운다 · 밑줄 한 줄보다 「여기에 친다」 가 멀리서도 읽힌다 */}
          <div className="p-2">
            <div className="relative flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2">
              <Search
                className="h-4 w-4 shrink-0 text-content-faint"
                aria-hidden
              />
              {/* 안내 문구는 faint 까지만 · ghost 는 흰 배경에서 대비 1.7 이라 보이지 않는다 */}
              <input
                ref={inputRef}
                role="combobox"
                aria-expanded
                aria-controls={listId}
                aria-activedescendant={
                  matches[active] ? `${listId}-${active}` : undefined
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    closePicker();
                    return;
                  }
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    const last = matches.length - 1;
                    if (last < 0) return;
                    const dir = e.key === "ArrowDown" ? 1 : -1;
                    setActive((i) => Math.min(Math.max(i + dir, 0), last));
                    return;
                  }
                  if (e.key === "Enter") {
                    e.preventDefault();
                    pick(matches[active]);
                  }
                }}
                aria-label={placeholder}
                className="h-5 w-full bg-transparent text-[13px] text-content outline-none"
              />
              {/*
               * 안내를 글자 대신 키로 적는다 · `placeholder` 속성에는 키캡을 못 넣어
               * 칸 위에 겹쳐 둔다. 무엇으로 찾을 수 있는지(`placeholder`)는 눈에서
               * 빼고 `aria-label` 로 남긴다 — 열어 둔 사람에게 필요한 건 여는 법이다.
               */}
              {query ? null : (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center gap-1.5 text-[13px] text-content-faint">
                  <kbd className="rounded-[4px] bg-surface-strong px-1.5 py-0.5 text-[11px] font-medium leading-[14px] text-content-mid">
                    /
                  </kbd>
                  를 눌러 검색하세요
                </span>
              )}
            </div>
          </div>
          {matches.length === 0 ? (
            <p className="px-3 py-6 text-center text-[12.5px] text-content-faint">
              찾는 항목이 없습니다.
            </p>
          ) : (
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              className="scrollbar-thin max-h-[340px] overflow-y-auto pb-1"
            >
              {matches.map((item, i) => {
                const current = isCurrent(item);
                /*
                 * 커서(`active`)와 지금 고른 항목(`current`)은 다른 것이다.
                 * 커서는 면으로, 고른 항목은 한 톤 옅은 면으로 — 겹쳐도 어느 쪽이
                 * 「엔터를 치면 갈 곳」 인지 세기로 갈린다.
                 */
                return (
                  <li key={keyOf(item)}>
                    <button
                      type="button"
                      id={`${listId}-${i}`}
                      role="option"
                      aria-selected={current}
                      tabIndex={-1}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => pick(item)}
                      className={cn(
                        "flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors",
                        i === active
                          ? "bg-surface-strong ring-1 ring-inset ring-focus/40"
                          : current && "bg-surface-accent",
                      )}
                    >
                      {renderRow(item)}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/*
           * 키로 다 되는 목록인데 그렇게 생기지 않았다 — 열어 놓고 마우스를 잡는다.
           * 목록 아래에 두는 건 이미 훑고 있는 눈이 닿는 자리라서다.
           */}
          <div className="flex items-center gap-3 border-t border-line-soft px-3 py-2">
            <KeyHint keys={["↑", "↓"]} label="이동" />
            <KeyHint keys={["Enter"]} label="선택" />
            <KeyHint keys={["esc"]} label="닫기" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
