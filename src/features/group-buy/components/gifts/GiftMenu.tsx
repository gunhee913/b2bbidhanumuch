'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type GiftMenuOption = { value: string; label: string; hint?: string };
export type GiftMenuGroup = { label: string; options: GiftMenuOption[] };

/** 선물세트 구성용 드롭다운 · 트리거는 한 줄, 목록은 카드처럼 펼친다 */
export function GiftMenu({
  label,
  value,
  placeholder,
  options,
  groups,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  options?: GiftMenuOption[];
  groups?: GiftMenuGroup[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const flat = options ?? groups?.flatMap((group) => group.options) ?? [];
  const selected = flat.find((item) => item.value === value);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <p className="text-[11.5px] font-semibold text-content-faint">{label}</p>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'mt-1.5 flex h-11 w-full items-center justify-between gap-2 rounded-sm border bg-surface px-3 text-left',
          open ? 'border-ink' : 'border-line hover:border-content-faint',
        )}
      >
        <span className={cn('truncate text-[13.5px]', selected ? 'font-semibold text-content' : 'font-medium text-content-faint')}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-content-soft transition-transform', open && 'rotate-180')} />
      </button>
      {open ? (
        <div
          role="listbox"
          className="absolute z-30 mt-1.5 max-h-72 w-full overflow-y-auto rounded-sm border border-line bg-surface p-1.5 shadow-[0_12px_32px_rgba(28,25,23,0.12)]"
        >
          {groups
            ? groups.map((group) => (
                <div key={group.label} className="py-1">
                  <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold text-content-faint">{group.label}</p>
                  {group.options.map((option) => (
                    <OptionRow key={option.value} option={option} active={option.value === value} onPick={pick} />
                  ))}
                </div>
              ))
            : options?.map((option) => <OptionRow key={option.value} option={option} active={option.value === value} onPick={pick} />)}
        </div>
      ) : null}
    </div>
  );
}

function OptionRow({
  option,
  active,
  onPick,
}: {
  option: GiftMenuOption;
  active: boolean;
  onPick: (value: string) => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={() => onPick(option.value)}
      className={cn(
        'flex w-full items-center justify-between gap-3 rounded-sm px-2.5 py-2 text-left',
        active ? 'bg-ink text-white' : 'text-content hover:bg-surface-accent',
      )}
    >
      <span className="min-w-0">
        <span className="block truncate text-[13.5px] font-semibold">{option.label}</span>
        {option.hint ? (
          <span className={cn('mt-0.5 block truncate text-[12px] font-normal', active ? 'text-white/75' : 'text-content-soft')}>{option.hint}</span>
        ) : null}
      </span>
      {active ? <Check className="h-4 w-4 shrink-0" /> : <span className="h-4 w-4 shrink-0" />}
    </button>
  );
}
