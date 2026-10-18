'use client';

import { use } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { GiftTray } from '@/features/group-buy/components/gifts/GiftTray';
import { EmptyState, Skeleton } from '@/features/group-buy/components/primitives';
import { PickupInfoBox } from '@/features/group-buy/components/pools/ReceiveMethodOption';
import { useCancelGiftSet, useConsumerGiftSet } from '@/features/group-buy/hooks';
import { GIFT_TRAY_META } from '@/features/group-buy/lib/gift';
import { formatDateTime } from '@/features/group-buy/lib/format';
import { isDineIn, RECEIVE_METHOD_LABELS } from '@/features/group-buy/lib/receive';
import { formatWon } from '@/features/group-buy/lib/slots';
import { GB_MYPAGE_PATH } from '@/features/group-buy/constants/ui';

const ORDERS_PATH = `${GB_MYPAGE_PATH}/orders`;

export default function GiftSetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: gift, isLoading } = useConsumerGiftSet(id);
  const cancel = useCancelGiftSet();

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-6 w-28" />
        <Skeleton className="mt-6 h-[220px] rounded-2xl" />
      </div>
    );
  }
  if (!gift) {
    return <EmptyState title="선물세트를 찾을 수 없어요" action={<Link href={ORDERS_PATH} className="text-[14px] font-semibold underline">주문내역으로</Link>} />;
  }

  const meta = GIFT_TRAY_META[gift.cellCount];
  const handleCancel = async () => {
    if (!window.confirm('선물세트를 취소할까요? 구좌가 다시 열리고 결제 금액은 환불됩니다.')) return;
    try {
      await cancel.mutateAsync(gift.id);
      toast.success('선물세트가 취소되고 환불되었어요.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '취소하지 못했어요.');
    }
  };

  return (
    <div>
      <Link href={ORDERS_PATH} className="inline-flex items-center gap-1 text-[13px] font-medium text-content-faint hover:text-content-mid">
        <ChevronLeft className="h-4 w-4" />
        주문내역
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold text-content-mid">{gift.statusLabel} · {gift.giftNo}</p>
          <h1 className="mt-1 text-[24px] font-bold tracking-[-0.02em] text-content">
            {meta.title} × {gift.quantity}
          </h1>
          <p className="mt-1 text-[13px] text-content-faint">{formatDateTime(gift.createdAt)} 주문</p>
        </div>
        {gift.canCancel ? (
          <button type="button" onClick={handleCancel} disabled={cancel.isPending} className="inline-flex h-10 items-center rounded-lg border border-line px-4 text-[13.5px] font-semibold text-content-mid hover:bg-surface-muted disabled:opacity-50">
            {cancel.isPending ? '취소 중…' : '주문 취소'}
          </button>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-line-soft bg-surface p-6">
            <h2 className="text-[16px] font-bold text-content">구성도</h2>
            <GiftTray className="mt-3" cellCount={gift.cellCount} fills={gift.cells.map((c) => ({ cellNo: c.cellNo, label: c.partName, image: c.image }))} />
          </section>

          <section className="rounded-2xl border border-line-soft bg-surface p-6">
            <h2 className="text-[16px] font-bold text-content">받는 분 · {gift.recipientMode === 'split' ? '여러 수령인' : '일괄 수령'}</h2>
            <ul className="mt-4 space-y-3">
              {gift.recipients.map((r) => (
                <li key={r.setIndex} className="text-[13.5px] leading-relaxed text-content">
                  <p className="font-semibold">
                    {gift.recipientMode === 'split' ? `${r.setIndex}번째 세트 · ` : ''}
                    {r.shipping.name} · {r.shipping.phone}
                  </p>
                  <p className="text-content-mid">
                    ({r.shipping.zipcode}) {r.shipping.address} {r.shipping.addressDetail}
                  </p>
                  {r.message ? <p className="mt-1 text-[12.5px] text-content-faint">카드: {r.message}</p> : null}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-line-soft bg-surface p-6">
            <h2 className="text-[16px] font-bold text-content">결제</h2>
            <dl className="mt-4 space-y-2 text-[13.5px]">
              <div className="flex justify-between">
                <dt className="text-content-soft">부위</dt>
                <dd className="font-semibold tabular-nums">{formatWon(gift.meatAmount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-content-soft">포장비 {formatWon(gift.packagingFee)} × {gift.quantity}세트</dt>
                <dd className="font-semibold tabular-nums">{formatWon(gift.packagingFee * gift.quantity)}</dd>
              </div>
              <div className="flex justify-between border-t border-line-soft pt-2">
                <dt className="font-bold">합계</dt>
                <dd className="font-bold tabular-nums">{formatWon(gift.amount)}</dd>
              </div>
            </dl>
          </section>

          {gift.leftoverKg > 0 ? (
            <section className="rounded-2xl border border-line-soft bg-surface p-6">
              <h2 className="text-[16px] font-bold text-content">남는 양 · {RECEIVE_METHOD_LABELS[gift.leftoverReceiveMethod]}</h2>
              <p className="mt-2 text-[13px] text-content-soft">{gift.leftoverLines.map((l) => `${l.label} ${l.leftoverKg.toFixed(1)}kg`).join(' · ')}</p>
              {isDineIn(gift.leftoverReceiveMethod) ? (
                <PickupInfoBox store={gift.leftoverStore} pickupAt={gift.leftoverPickupAt} className="mt-3" />
              ) : gift.leftoverShipping ? (
                <p className="mt-3 text-[13.5px] text-content-mid">
                  {gift.leftoverShipping.name} · {gift.leftoverShipping.phone}
                  <br />
                  ({gift.leftoverShipping.zipcode}) {gift.leftoverShipping.address} {gift.leftoverShipping.addressDetail}
                </p>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
