'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRemaining, remainingUntil, shortGrade } from '../lib/format';
import type { ConsumerStatus } from '../types';
import { CONSUMER_STATUS_LABELS } from '../constants/status';

/** 모집 진행률 · 팔린 구좌 / 전체 구좌 */
export function ProgressBar({ value, max, className, tone = 'ink' }: { value: number; max: number; className?: string; tone?: 'ink' | 'rose' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-strong', className)}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500', tone === 'rose' ? 'bg-rose-500' : 'bg-ink')}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** 1초마다 갱신되는 남은 시간 · 24시간 미만이면 붉게 */
export function DeadlineBadge({ deadline, className, size = 'sm' }: { deadline: string; className?: string; size?: 'sm' | 'md' }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const r = remainingUntil(deadline, now);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md font-semibold tabular-nums',
        size === 'sm' ? 'px-1.5 py-0.5 text-[11.5px]' : 'px-2.5 py-1 text-[13px]',
        r.isOver
          ? 'bg-surface-strong text-content-soft'
          : r.isUrgent
            ? 'bg-amber-50 text-amber-700'
            : 'bg-surface-accent text-content-mid',
        className,
      )}
    >
      <Clock className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      {formatRemaining(r)}
    </span>
  );
}

const GRADE_TONE: Record<string, string> = {
  '1++': 'bg-ink text-white',
  '1+': 'bg-content-mid text-white',
  '1': 'bg-surface-strong text-content',
  '2': 'bg-surface-accent text-content-mid',
};

export function GradeBadge({
  grade,
  label,
  className,
  size = 'sm',
}: {
  grade: string | null;
  /** 배지에 쓸 글자 · 없으면 짧은 등급(`1++등급`) */
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const short = shortGrade(grade);
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded font-bold tabular-nums',
        size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-[13px]',
        GRADE_TONE[short] ?? 'bg-surface-accent text-content-mid',
        className,
      )}
      title={grade ?? undefined}
    >
      {label ?? `${short}등급`}
    </span>
  );
}

const STATUS_TONE: Record<ConsumerStatus, string> = {
  recruiting: 'bg-emerald-50 text-emerald-700',
  preparing: 'bg-sky-50 text-sky-700',
  processing: 'bg-amber-50 text-amber-700',
  shipped: 'bg-indigo-50 text-indigo-700',
  completed: 'bg-surface-accent text-content-mid',
  cancelled: 'bg-surface-strong text-content-soft',
};

export function ConsumerStatusBadge({ status, className }: { status: ConsumerStatus; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-semibold', STATUS_TONE[status], className)}>
      {CONSUMER_STATUS_LABELS[status]}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-surface-accent', className)} aria-hidden />;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface px-6 py-16 text-center">
      <p className="text-[16px] font-bold text-content">{title}</p>
      {description ? <p className="mt-1.5 max-w-md text-[13.5px] leading-relaxed text-content-soft">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function SectionTitle({ title, description, right }: { title: string; description?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-[26px] font-bold tracking-[-0.03em] text-content">{title}</h2>
        {description ? <p className="mt-1.5 text-[14.5px] text-content-soft">{description}</p> : null}
      </div>
      {right}
    </div>
  );
}
