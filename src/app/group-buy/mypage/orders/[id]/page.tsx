'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { SmartImage } from '@/components/ui/smart-image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StatusStepper } from '@/features/group-buy/components/StatusStepper';
import { describeSlots } from '@/features/group-buy/components/OrderCard';
import { ConsumerStatusBadge, EmptyState, GradeBadge, Skeleton } from '@/features/group-buy/components/primitives';
import { useCancelOrder, useConsumerOrder, useConsumerProduct, useRealtimeGroupBuy, useUpdateOrderPickup } from '@/features/group-buy/hooks';
import { isDineIn } from '@/features/group-buy/lib/receive';
import { canChangePickup } from '@/features/group-buy/lib/stores';
import { PickupInfoBox } from '@/features/group-buy/components/pools/ReceiveMethodOption';
import { PickupChangeDialog } from '@/features/group-buy/components/stores/PickupChangeDialog';
import { formatKg, formatWon, isZoneSplit } from '@/features/group-buy/lib/slots';
import { formatDateTime, formatDeadline } from '@/features/group-buy/lib/format';
import { SlotPicker } from '@/features/group-buy/components/SlotPicker';
import { GB_MYPAGE_PATH } from '@/features/group-buy/constants/ui';

const FALLBACK_IMAGE = 'https://picsum.photos/seed/hanwoo-order/320/240';
const ORDERS_PATH = `${GB_MYPAGE_PATH}/orders`;

export default function GroupBuyOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: order, isLoading } = useConsumerOrder(id);
  const { data: productData } = useConsumerProduct(order?.productId ?? null);
  useRealtimeGroupBuy();
  const cancel = useCancelOrder();
  const updatePickup = useUpdateOrderPickup();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pickupOpen, setPickupOpen] = useState(false);

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-6 w-28" />
        <Skeleton className="mt-6 h-[160px] rounded-2xl" />
        <Skeleton className="mt-6 h-[140px] rounded-2xl" />
      </div>
    );
  }
  if (!order) {
    return <EmptyState title="주문을 찾을 수 없어요" action={<Link href={ORDERS_PATH} className="text-[14px] font-semibold underline">주문내역으로</Link>} />;
  }

  const product = productData?.product;

  const handleCancel = async () => {
    try {
      await cancel.mutateAsync(order.id);
      toast.success('주문이 취소되었어요. 결제 금액은 환불됩니다.');
      setConfirmOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '취소 중 문제가 생겼어요.');
    }
  };

  return (
    <div>
      <Link href={ORDERS_PATH} className="inline-flex items-center gap-1 text-[13px] text-content-faint hover:text-content">
        <ChevronLeft className="h-4 w-4" />
        주문내역
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ConsumerStatusBadge status={order.status} />
            <span className="text-[12.5px] tabular-nums text-content-faint">주문번호 {order.orderNo}</span>
          </div>
          <h1 className="mt-2 text-[26px] font-bold tracking-[-0.02em] text-content">{order.partName}</h1>
        </div>
        {order.canCancel ? (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="inline-flex h-10 items-center rounded-lg border border-line bg-surface px-4 text-[13.5px] font-semibold text-content-mid hover:bg-surface-muted"
          >
            주문 취소
          </button>
        ) : null}
      </div>

      <section className="mt-6 rounded-2xl border border-line-soft bg-surface px-8 py-7">
        <StatusStepper status={order.status} message={order.statusMessage} />
        {order.status === 'recruiting' ? (
          <p className="mt-6 text-center text-[13px] text-content-soft">
            모집 마감 <b className="text-content">{formatDeadline(order.recruitDeadline)}</b> · 물량을 확보하지 못하면 전액 자동 환불됩니다.
          </p>
        ) : order.statusMessage && order.status !== 'cancelled' ? (
          <p className="mt-6 text-center text-[13px] text-content-soft">{order.statusMessage}</p>
        ) : null}
      </section>

      <div className="mt-6 grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6">
        <section className="rounded-2xl border border-line-soft bg-surface p-6">
          <h2 className="text-[16px] font-bold text-content">주문 상품</h2>
          <div className="mt-4 flex gap-4">
            <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl bg-surface-accent">
              <SmartImage src={order.image ?? FALLBACK_IMAGE} alt={order.partName} fill fallbackSrc={FALLBACK_IMAGE} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[16px] font-bold text-content">{order.partName}</p>
                <GradeBadge grade={order.grade} />
              </div>
              <p className="mt-1 text-[13px] text-content-soft">
                {describeSlots(order, product?.slotCount)}
                {/* 위치 분할·kg 주문은 요약에 이미 중량이 들어 있다 · 구좌 수량 주문만 중량을 덧붙인다 */}
                {order.saleMode === 'slot' && !isZoneSplit(product?.slotCount) ? ` · ${formatKg(order.weightKg)}` : ''}
              </p>
              <p className="mt-0.5 text-[12.5px] text-content-faint">상장번호 {order.listingNo}</p>
              <Link href={`/group-buy/products/${order.productId}`} className="mt-2 inline-block text-[12.5px] font-semibold text-content underline-offset-4 hover:underline">
                상품 보기
              </Link>
            </div>
          </div>

          {order.positional && product && order.status !== 'cancelled' ? (
            <div className="mt-6">
              <p className="mb-2.5 text-[13px] font-semibold text-content-mid">내 소분 위치</p>
              <SlotPicker slotCount={product.slotCount} partName={product.partName} soldSlotNos={product.soldSlotNos} selected={[]} onChange={() => {}} readOnly highlight={order.slotNos} />
            </div>
          ) : null}
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-line-soft bg-surface p-6">
            <h2 className="text-[16px] font-bold text-content">결제 정보</h2>
            <dl className="mt-4 space-y-2 text-[13.5px]">
              <div className="flex justify-between">
                <dt className="text-content-soft">결제 금액</dt>
                <dd className="font-bold tabular-nums text-content">{formatWon(order.amount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-content-soft">결제 일시</dt>
                <dd className="tabular-nums text-content">{formatDateTime(order.paidAt ?? order.createdAt)}</dd>
              </div>
              {order.isRefunded ? (
                <div className="flex justify-between">
                  <dt className="text-content-soft">환불 일시</dt>
                  <dd className="tabular-nums text-content">{formatDateTime(order.refundedAt)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-content-soft">결제 수단</dt>
                <dd className="text-content">신용·체크카드 (시연)</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-line-soft bg-surface p-6">
            <h2 className="text-[16px] font-bold text-content">{isDineIn(order.receiveMethod) ? '매장 수령' : '배송지'}</h2>
            <div className="mt-4 text-[13.5px] leading-relaxed text-content">
              <p className="font-semibold">
                {order.shipping.name} · {order.shipping.phone}
              </p>
              {isDineIn(order.receiveMethod) ? (
                <PickupInfoBox
                  store={order.store}
                  pickupAt={order.pickupAt}
                  className="mt-3"
                  action={
                    !order.isRefunded && order.status !== 'cancelled' && canChangePickup(order.pickupAt) ? (
                      <button
                        type="button"
                        onClick={() => setPickupOpen(true)}
                        className="inline-flex h-8 shrink-0 items-center rounded-lg border border-line px-3 text-[12.5px] font-semibold text-content-mid hover:bg-surface-muted"
                      >
                        시간 변경
                      </button>
                    ) : null
                  }
                />
              ) : (
                <p className="mt-1 text-content-mid">
                  ({order.shipping.zipcode}) {order.shipping.address} {order.shipping.addressDetail}
                </p>
              )}
              {order.shipping.memo ? (
                <p className="mt-1 text-[12.5px] text-content-faint">
                  {isDineIn(order.receiveMethod) ? '요청 사항' : '메모'}: {order.shipping.memo}
                </p>
              ) : null}
            </div>
          </section>
        </div>
      </div>

      {isDineIn(order.receiveMethod) ? (
        <PickupChangeDialog
          open={pickupOpen}
          onOpenChange={setPickupOpen}
          store={order.store}
          pickupAt={order.pickupAt}
          pending={updatePickup.isPending}
          onSubmit={(input) => updatePickup.mutateAsync({ orderId: order.id, input })}
        />
      ) : null}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>주문을 취소할까요?</DialogTitle>
            <DialogDescription>
              {order.saleMode === 'kg' ? `${order.weightKg}kg 주문` : order.positional ? `${order.slotNos.join('·')}번 구좌` : `${order.quantity}구좌`}가 다른 분에게 열리고, 결제 금액{' '}
              {formatWon(order.amount)}은 바로 환불됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="inline-flex h-10 items-center rounded-lg border border-line px-4 text-[13.5px] font-semibold text-content-mid hover:bg-surface-muted"
            >
              유지하기
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancel.isPending}
              className="inline-flex h-10 items-center rounded-lg bg-rose-600 px-4 text-[13.5px] font-bold text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {cancel.isPending ? '취소 중…' : '주문 취소'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
