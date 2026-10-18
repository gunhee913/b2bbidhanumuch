'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { SmartImage } from '@/components/ui/smart-image';
import type { ConsumerOrder } from '../types';
import { formatKg, formatWon, isZoneSplit, slotZoneLabel, zoneKeysFor, ZONE_META } from '../lib/slots';
import { TRIM_SLICE_LABEL } from '../lib/pools';
import { isDineIn, RECEIVE_METHOD_LABELS } from '../lib/receive';
import { formatDateTime } from '../lib/format';
import { formatPickup } from '../lib/stores';
import { ConsumerStatusBadge, GradeBadge } from './primitives';

const FALLBACK_IMAGE = 'https://picsum.photos/seed/hanwoo-order/320/240';

/**
 * 구좌 요약 · 상·중·하 분할은 "상단·하단 2.8kg", 그 외 "3·4번 (중단)" 또는 "2구좌",
 * kg 모드는 "3kg 주문". 손질 옵션·매장 수령이 있으면 뒤에 붙인다.
 */
export function describeSlots(order: ConsumerOrder, slotCount?: number): string {
  const option = [order.trimAndSlice ? TRIM_SLICE_LABEL : null, isDineIn(order.receiveMethod) ? RECEIVE_METHOD_LABELS.dine_in : null]
    .filter(Boolean)
    .map((t) => ` · ${t}`)
    .join('');
  if (order.saleMode === 'kg') return `${order.weightKg}kg 주문${option}`;
  if (isZoneSplit(slotCount)) {
    const keys = zoneKeysFor(slotCount, order.partName);
    const labels = order.slotNos.map((n) => (keys[n - 1] ? ZONE_META[keys[n - 1]].label : `${n}번`)).join('·');
    return `${labels} ${order.weightKg}kg${option}`;
  }
  if (!order.positional) return `${order.quantity}구좌${option}`;
  const nos = order.slotNos.join('·');
  const zone = slotCount ? slotZoneLabel(order.slotNos[0], slotCount, order.partName) : '';
  return `${zone ? `${nos}번 (${zone})` : `${nos}번`}${option}`;
}

export function OrderCard({ order }: { order: ConsumerOrder }) {
  return (
    <Link
      href={`/group-buy/mypage/orders/${order.id}`}
      className="group flex items-center gap-5 rounded-2xl border border-line-soft bg-surface p-5 transition-colors hover:border-line"
    >
      <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl bg-surface-accent">
        <SmartImage src={order.image ?? FALLBACK_IMAGE} alt={order.partName} fill fallbackSrc={FALLBACK_IMAGE} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <ConsumerStatusBadge status={order.status} />
          <span className="text-[12px] tabular-nums text-content-faint">{formatDateTime(order.createdAt)} 주문</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <p className="truncate text-[17px] font-bold text-content">{order.partName}</p>
          <GradeBadge grade={order.grade} />
        </div>
        <p className="mt-0.5 text-[13px] text-content-soft">
          {describeSlots(order)}
          {order.saleMode === 'slot' ? ` · ${formatKg(order.weightKg)}` : ''}
        </p>
        {isDineIn(order.receiveMethod) && order.store ? (
          <p className="mt-0.5 text-[12.5px] tabular-nums text-content-mid">
            {order.store.name}
            {order.pickupAt ? ` · 픽업 ${formatPickup(order.pickupAt)}` : ''}
          </p>
        ) : null}
        {order.statusMessage ? <p className="mt-1.5 text-[12.5px] text-content-faint">{order.statusMessage}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <div className="text-right">
          <p className="text-[18px] font-bold tabular-nums text-content">{formatWon(order.amount)}</p>
          <p className="text-[12px] text-content-faint">{order.isRefunded ? '환불 완료' : '결제 완료'}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-content-ghost transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
