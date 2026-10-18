'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SmartImage } from '@/components/ui/smart-image';
import { cn } from '@/lib/utils';
import type { ConsumerReservation, ReservationStatus } from '../../types';
import { formatWon } from '../../lib/slots';
import { TRIM_SLICE_LABEL } from '../../lib/pools';
import { isDineIn, RECEIVE_METHOD_LABELS } from '../../lib/receive';
import { formatDate, formatDateTime } from '../../lib/format';
import { canChangePickup, formatPickup } from '../../lib/stores';
import { useUpdateReservationPickup } from '../../hooks';
import { PickupChangeDialog } from '../stores/PickupChangeDialog';

const FALLBACK_IMAGE = 'https://picsum.photos/seed/hanwoo-reservation/320/240';

const TONE: Record<ReservationStatus, string> = {
  open: 'bg-gold-50 text-gold-800',
  allocated: 'bg-sky-50 text-sky-700',
  cancelled: 'bg-surface-strong text-content-soft',
  expired: 'bg-surface-strong text-content-soft',
  refunded: 'bg-surface-strong text-content-soft',
};

/** 내 kg 주문 한 줄 · 배송 준비 전이면 취소 가능 */
export function ReservationCard({
  reservation,
  onCancel,
  cancelling = false,
  compact = false,
}: {
  reservation: ConsumerReservation;
  onCancel?: (id: string) => void;
  cancelling?: boolean;
  compact?: boolean;
}) {
  const r = reservation;
  const updatePickup = useUpdateReservationPickup();
  const [pickupOpen, setPickupOpen] = useState(false);
  const canChange = r.status === 'open' && isDineIn(r.receiveMethod) && canChangePickup(r.pickupAt);
  return (
    <div className={cn('flex items-center gap-4 rounded-2xl border border-line-soft bg-surface', compact ? 'p-3.5' : 'p-5')}>
      {!compact ? (
        <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-surface-accent">
          <SmartImage src={r.image ?? FALLBACK_IMAGE} alt={r.partGroup} fill fallbackSrc={FALLBACK_IMAGE} />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-semibold', TONE[r.status])}>{r.statusLabel}</span>
          <span className="text-[12px] tabular-nums text-content-faint">{formatDateTime(r.createdAt)} 주문</span>
        </div>
        <p className={cn('mt-1.5 font-bold text-content', compact ? 'text-[15px]' : 'text-[17px]')}>
          {r.partGroup} {r.gradeLabel} · {r.kg}kg
        </p>
        <p className="mt-0.5 text-[13px] tabular-nums text-content-soft">
          kg당 {formatWon(r.pricePerKg + r.optionFeePerKg)}
          {r.trimAndSlice ? ` (${TRIM_SLICE_LABEL})` : ''}
          {isDineIn(r.receiveMethod) ? ` · ${RECEIVE_METHOD_LABELS.dine_in}` : ''} · 결제 {formatWon(r.amount)}
          {r.status === 'open' ? <span className="text-content-faint"> · {formatDate(r.expiresAt)}까지 유효</span> : null}
        </p>
        {isDineIn(r.receiveMethod) && r.store ? (
          <p className="mt-0.5 text-[12.5px] tabular-nums text-content-mid">
            {r.store.name}
            {r.pickupAt ? ` · 픽업 ${formatPickup(r.pickupAt)}` : ''}
          </p>
        ) : null}
        {!compact && r.statusMessage ? <p className="mt-1.5 text-[12.5px] text-content-faint">{r.statusMessage}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {canChange ? (
          <>
            <button
              type="button"
              onClick={() => setPickupOpen(true)}
              className="inline-flex h-9 items-center rounded-lg border border-line px-3.5 text-[13px] font-semibold text-content-mid hover:bg-surface-muted"
            >
              시간 변경
            </button>
            <PickupChangeDialog
              open={pickupOpen}
              onOpenChange={setPickupOpen}
              store={r.store}
              pickupAt={r.pickupAt}
              pending={updatePickup.isPending}
              onSubmit={(input) => updatePickup.mutateAsync({ reservationId: r.id, input })}
            />
          </>
        ) : null}
        {r.status === 'allocated' && r.orderId ? (
          <Link href={`/group-buy/mypage/orders/${r.orderId}`} className="inline-flex h-9 items-center rounded-lg bg-ink px-3.5 text-[13px] font-semibold text-white hover:bg-ink-hover">
            진행 상황 보기
          </Link>
        ) : null}
        {r.canCancel && onCancel ? (
          <button
            type="button"
            onClick={() => onCancel(r.id)}
            disabled={cancelling}
            className="inline-flex h-9 items-center rounded-lg border border-line px-3.5 text-[13px] font-semibold text-content-mid hover:bg-surface-muted disabled:opacity-50"
          >
            {cancelling ? '취소 중…' : '취소'}
          </button>
        ) : null}
      </div>
    </div>
  );
}
