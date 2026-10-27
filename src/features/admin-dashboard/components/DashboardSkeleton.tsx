'use client';

import { cn } from '@/lib/utils';

const Block = ({ className }: { className?: string }) => (
  <div className={cn('animate-pulse rounded-[2px] bg-slate-100', className)} />
);

const PanelSkeleton = ({ rows = 6, className }: { rows?: number; className?: string }) => (
  <div className={cn('rounded-[2px] border border-slate-200 bg-white', className)}>
    <div className="flex h-12 items-center border-b border-slate-100 px-4">
      <Block className="h-3.5 w-28" />
    </div>
    <div className="space-y-3 px-4 py-4">
      {Array.from({ length: rows }).map((_, index) => (
        <Block key={index} className="h-3 w-full" />
      ))}
    </div>
  </div>
);

/** 데이터를 기다리는 동안 자리 유지 · 카드·차트·표 형태 그대로 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy aria-label="불러오는 중">
      <div className="grid grid-cols-[4fr_3fr] gap-4">
        <div className="rounded-[2px] border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3"><Block className="h-3 w-16" /></div>
          <div className="flex divide-x divide-slate-100">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex-1 space-y-2.5 px-5 py-4">
                <Block className="h-3 w-14" />
                <Block className="h-6 w-20" />
                <Block className="h-3 w-12" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[2px] border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3"><Block className="h-3 w-10" /></div>
          <div className="flex divide-x divide-slate-100">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex-1 space-y-2.5 px-5 py-4">
                <Block className="h-3 w-14" />
                <Block className="h-6 w-24" />
                <Block className="h-3 w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[2px] border border-slate-200 bg-white">
        <div className="flex h-12 items-center border-b border-slate-100 px-4">
          <Block className="h-3.5 w-24" />
        </div>
        <Block className="m-4 h-[240px]" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <PanelSkeleton rows={8} />
        <PanelSkeleton rows={6} />
      </div>
      <div className="grid grid-cols-2 gap-6">
        <PanelSkeleton rows={5} />
        <PanelSkeleton rows={8} />
      </div>
    </div>
  );
}
