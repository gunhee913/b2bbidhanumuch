'use client';

import { cn } from '@/lib/utils';
import type { GiftLeftoverMode } from '../../lib/gift';

const OPTIONS: Array<{ key: GiftLeftoverMode; label: string }> = [
  { key: 'pack', label: '세트에 나눠 담기' },
  { key: 'separate', label: '따로 받기' },
];

/** 남는 부위를 세트에 나눌지, 따로 받을지 */
export function LeftoverModePicker({
  value,
  onChange,
  className,
}: {
  value: GiftLeftoverMode;
  onChange: (mode: GiftLeftoverMode) => void;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label="남는 부위" className={cn('grid grid-cols-2 gap-1', className)}>
      {OPTIONS.map((option) => {
        const active = value === option.key;
        return (
          <button
            key={option.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.key)}
            className={cn(
              'h-8 rounded-sm border text-[12px] font-semibold',
              active ? 'border-ink bg-surface-accent text-content' : 'border-line text-content-soft hover:bg-surface-accent',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
