'use client';

import { useId } from 'react';
import { Store, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReceiveMethod, StoreSummary } from '../../types';
import { DINE_IN_NOTICE, RECEIVE_METHODS } from '../../lib/receive';
import { formatPickup } from '../../lib/stores';

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

interface PickupInfoBoxProps {
  store: StoreSummary | null;
  pickupAt: string | null;
  /** 주문 상세에서 "변경" 버튼을 달 때 */
  action?: React.ReactNode;
  className?: string;
}

/** 매장 수령 주문의 받는 곳 · 매장 이름·주소·예약 시간 · 주문 상세·완료 화면 공용 */
export function PickupInfoBox({ store, pickupAt, action, className }: PickupInfoBoxProps) {
  return (
    <div className={cn('rounded-sm border border-line-soft px-4 py-3', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-content-mid">받는 곳</p>
          <p className="mt-0.5 text-[13.5px] font-bold text-content">{store?.name ?? '매장 미지정'}</p>
          {store ? (
            <p className="text-[12.5px] text-content-soft">
              {store.address} {store.addressDetail}
              {store.phone ? ` · ${store.phone}` : ''}
            </p>
          ) : null}
          <p className="mt-1 text-[13px] font-semibold tabular-nums text-content">{pickupAt ? `픽업 ${formatPickup(pickupAt)}` : '픽업 시간 미지정'}</p>
        </div>
        {action}
      </div>
      <p className="mt-1.5 text-[12px] leading-snug text-content-faint">{DINE_IN_NOTICE}</p>
    </div>
  );
}
