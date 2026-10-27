'use client';

import { cn } from '@/lib/utils';
import type { ListingViewStatus } from '../../lib/listingView';

const DOT_CLASS: Record<ListingViewStatus, string> = {
  대기: 'border border-slate-400 bg-transparent',
  승인: 'bg-slate-900',
  경매중: 'bg-emerald-500',
  마감: 'bg-slate-300',
};

const TEXT_CLASS: Record<ListingViewStatus, string> = {
  대기: 'text-slate-600',
  승인: 'text-slate-900',
  경매중: 'text-emerald-700',
  마감: 'text-slate-400',
};

/** 상장 상태 · 점 + 글자, 채움 상자 없이 가볍게. 폭을 고정해 열이 흔들리지 않게 한다 */
export function StatusBadge({ status, className }: { status: ListingViewStatus; className?: string }) {
  return (
    <span className={cn('inline-flex w-14 items-center gap-1.5 whitespace-nowrap text-[12px] font-medium', TEXT_CLASS[status], className)}>
      <span aria-hidden className={cn('h-1.5 w-1.5 shrink-0 rounded-full', DOT_CLASS[status])} />
      {status}
    </span>
  );
}
