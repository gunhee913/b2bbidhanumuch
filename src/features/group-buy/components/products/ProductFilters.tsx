'use client';

import { cn } from '@/lib/utils';

export const ALL_FILTER = '';

/** 부위·등급 칩 · 벌크구매와 선물세트가 같은 버튼을 쓴다 */
export function FilterChip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-9 items-center rounded-sm px-3.5 text-[13.5px] font-semibold transition-colors',
        active ? 'bg-ink text-white' : 'bg-surface-accent text-content-mid hover:bg-surface-strong hover:text-content',
      )}
    >
      {children}
    </button>
  );
}

/** 필터 한 줄 · 왼쪽 라벨 + 칩들 */
export function FilterRow({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <span className="mr-1.5 w-8 shrink-0 text-[12.5px] font-semibold text-content-faint">{label}</span>
      {children}
    </div>
  );
}
