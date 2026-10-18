'use client';

import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KgStepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  size?: 'md' | 'sm';
  /** 값 뒤에 붙는 단위 · 기본 kg, 구좌 상품은 '구좌' */
  unit?: string;
}

/** 1단위 증감 · kg 또는 구좌 */
export function KgStepper({ value, min, max, onChange, size = 'md', unit = 'kg' }: KgStepperProps) {
  const btn = size === 'sm' ? 'h-7 w-7' : 'h-10 w-10';
  const label = size === 'sm' ? 'min-w-10 px-1 text-[13px]' : 'min-w-14 px-1.5 text-[16px]';
  return (
    <div className="inline-flex shrink-0 items-center rounded-sm border border-line">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className={cn(btn, 'flex items-center justify-center text-content-mid hover:bg-surface-muted disabled:opacity-30')}
        aria-label={`1${unit} 줄이기`}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className={cn(label, 'text-center font-bold tabular-nums text-content')}>
        {value}
        {unit}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className={cn(btn, 'flex items-center justify-center text-content-mid hover:bg-surface-muted disabled:opacity-30')}
        aria-label={`1${unit} 늘리기`}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
