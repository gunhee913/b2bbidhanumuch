'use client';

import Link from 'next/link';
import { ChevronRight, Gift } from 'lucide-react';
import type { ConsumerGiftSet } from '../../types';
import { formatDateTime } from '../../lib/format';
import { formatWon } from '../../lib/slots';
import { GiftTray } from './GiftTray';
import { GIFT_TRAY_META } from '../../lib/gift';

/** 주문내역의 선물세트 한 줄 */
export function GiftSetCard({ gift }: { gift: ConsumerGiftSet }) {
  const meta = GIFT_TRAY_META[gift.cellCount];
  return (
    <Link
      href={`/group-buy/mypage/orders/gift/${gift.id}`}
      className="group flex items-center gap-5 rounded-2xl border border-line-soft bg-surface p-5 transition-colors hover:border-line"
    >
      <div className="w-[168px] shrink-0">
        <GiftTray cellCount={gift.cellCount} fills={gift.cells.map((c) => ({ cellNo: c.cellNo, label: c.partName, image: c.image }))} compact />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-surface-accent px-2 py-0.5 text-[12px] font-semibold text-content-mid">
            <Gift className="h-3 w-3" />
            {gift.statusLabel}
          </span>
          <span className="text-[12px] tabular-nums text-content-faint">{formatDateTime(gift.createdAt)} 주문</span>
        </div>
        <p className="mt-2 truncate text-[17px] font-bold text-content">
          {meta.title} × {gift.quantity}
        </p>
        <p className="mt-0.5 truncate text-[13px] text-content-soft">
          {gift.cells.map((c) => c.partName).join(' · ')}
          {gift.leftoverKg > 0 ? ` · 남는 양 ${gift.leftoverKg.toFixed(1)}kg` : ''}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <div className="text-right">
          <p className="text-[18px] font-bold tabular-nums text-content">{formatWon(gift.amount)}</p>
          <p className="text-[12px] text-content-faint">{gift.recipientMode === 'split' ? `${gift.quantity}곳 배송` : '일괄 수령'}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-content-ghost transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
