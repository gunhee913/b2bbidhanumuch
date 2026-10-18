'use client';

import { useId } from 'react';
import { Store, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReceiveMethod } from '../../types';
import { DINE_IN_STORE, RECEIVE_METHODS } from '../../lib/receive';

interface ReceiveMethodOptionProps {
  value: ReceiveMethod;
  onChange: (method: ReceiveMethod) => void;
  disabled?: boolean;
  size?: 'md' | 'sm';
  className?: string;
}

const ICONS: Record<ReceiveMethod, typeof Truck> = { delivery: Truck, dine_in: Store };

/** 수령 방식 고르기 · 택배로 받기 / 매장에서 받기 · 손질 옵션과 같은 카드 톤 */
export function ReceiveMethodOption({ value, onChange, disabled = false, size = 'md', className }: ReceiveMethodOptionProps) {
  const sm = size === 'sm';
  // 장바구니처럼 한 화면에 여러 묶음이 있을 때 라디오 그룹이 서로 섞이지 않게 한다
  const groupName = useId();
  return (
    <div role="radiogroup" aria-label="수령 방식" className={cn('grid gap-2', sm ? 'grid-cols-1' : 'grid-cols-2', className)}>
      {RECEIVE_METHODS.map((m) => {
        const Icon = ICONS[m.key];
        const checked = value === m.key;
        return (
          <label
            key={m.key}
            className={cn(
              'flex cursor-pointer select-none items-center gap-2.5 rounded-sm border transition-colors',
              sm ? 'px-3 py-2' : 'px-4 py-3',
              checked ? 'border-ink bg-surface-accent/60' : 'border-line bg-surface hover:bg-surface-accent/40',
              disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            <input type="radio" name={groupName} value={m.key} checked={checked} disabled={disabled} onChange={() => onChange(m.key)} className="sr-only" />
            <Icon className={cn('shrink-0', sm ? 'h-4 w-4' : 'h-[18px] w-[18px]', checked ? 'text-content' : 'text-content-faint')} strokeWidth={2.2} />
            <span className={cn('min-w-0 truncate font-semibold leading-tight text-content', sm ? 'text-[12.5px]' : 'text-[13.5px]')}>{m.label}</span>
          </label>
        );
      })}
    </div>
  );
}

/** 매장 수령일 때 배송지 상자 대신 보여주는 매장 안내 */
export function DineInStoreBox({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-sm border border-line-soft px-4 py-3', className)}>
      <p className="text-[13px] font-semibold text-content-mid">받는 곳</p>
      <p className="mt-0.5 text-[13.5px] font-bold text-content">{DINE_IN_STORE.name}</p>
      <p className="text-[12.5px] text-content-soft">
        {DINE_IN_STORE.address} · {DINE_IN_STORE.hours}
      </p>
      <p className="mt-1.5 text-[12px] leading-snug text-content-faint">{DINE_IN_STORE.notice}</p>
    </div>
  );
}
