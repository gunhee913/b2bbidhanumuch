'use client';

import { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';

const toCount = (raw: string) => {
  const n = Number.parseInt(raw.replace(/\D/g, ''), 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
};

/** 선물세트 수량 · 입력 중에는 비울 수 있고, 포커스를 빼면 1 이상으로 맞춘다 */
export function GiftQuantityStepper({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-line hover:bg-surface-accent"
        aria-label="세트 줄이기"
      >
        <Minus className="h-4 w-4" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        aria-label="세트 수"
        value={text}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, '');
          setText(digits);
          if (digits === '') return;
          onChange(toCount(digits));
        }}
        onBlur={() => {
          const next = toCount(text);
          setText(String(next));
          onChange(next);
        }}
        className="h-9 w-14 rounded-sm border border-line bg-surface text-center text-[16px] font-bold tabular-nums outline-none focus:border-content-soft"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-line hover:bg-surface-accent"
        aria-label="세트 늘리기"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
