'use client';

import { cn } from '@/lib/utils';
import type { GroupBuyStatus } from '../../types';
import { INTERNAL_STATUS_LABELS } from '../../constants/status';

const STATUS_TONE: Record<GroupBuyStatus, string> = {
  draft: 'bg-amber-50 text-amber-700 ring-amber-200',
  recruiting: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  full: 'bg-sky-50 text-sky-700 ring-sky-200',
  bidding: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  won: 'bg-blue-50 text-blue-700 ring-blue-200',
  lost: 'bg-rose-50 text-rose-700 ring-rose-200',
  cancelled: 'bg-gray-100 text-gray-600 ring-gray-200',
  processing: 'bg-orange-50 text-orange-700 ring-orange-200',
  shipped: 'bg-violet-50 text-violet-700 ring-violet-200',
  completed: 'bg-gray-900 text-white ring-gray-900',
};

/** 내부 상태 뱃지 · 관리자 전용(경매 용어 포함) */
export function AdminStatusBadge({ status, className }: { status: GroupBuyStatus; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset', STATUS_TONE[status], className)}>
      {INTERNAL_STATUS_LABELS[status]}
    </span>
  );
}

export const ADMIN_INPUT_CLASS =
  'h-8 w-full border border-gray-200 bg-white px-2 text-xs text-gray-900 outline-none focus:border-gray-400 disabled:bg-gray-50 disabled:text-gray-400';

export function AdminButton({
  children,
  variant = 'default',
  size = 'sm',
  className,
  loading,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'primary' | 'danger' | 'ghost'; size?: 'sm' | 'md'; loading?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={rest.disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-1 whitespace-nowrap rounded border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-7 px-2.5 text-[11.5px]' : 'h-9 px-3.5 text-xs',
        variant === 'primary' && 'border-gray-900 bg-gray-900 text-white hover:bg-gray-800',
        variant === 'default' && 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
        variant === 'danger' && 'border-rose-200 bg-white text-rose-600 hover:bg-rose-50',
        variant === 'ghost' && 'border-transparent bg-transparent text-gray-600 hover:bg-gray-100',
        className,
      )}
    >
      {loading ? '처리 중…' : children}
    </button>
  );
}

export function AdminField({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1 block text-[11.5px] font-medium text-gray-600">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-gray-400">{hint}</span> : null}
    </label>
  );
}

export function AdminStat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="border border-gray-200 bg-white px-4 py-3">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums text-gray-900">{value}</p>
      {sub ? <p className="text-[11px] text-gray-400">{sub}</p> : null}
    </div>
  );
}

export function formatNumberInput(value: string): number | null {
  const n = Number(value.replace(/[^0-9.]/g, ''));
  return value.trim() === '' || Number.isNaN(n) ? null : n;
}

/** ISO → <input type="datetime-local"> 값 (로컬 시간) */
export function toDateTimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDateTimeLocal(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
