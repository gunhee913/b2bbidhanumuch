'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { OrderCard } from '@/features/group-buy/components/OrderCard';
import { ReservationCard } from '@/features/group-buy/components/pools/ReservationCard';
import { EmptyState, Skeleton } from '@/features/group-buy/components/primitives';
import { useCancelReservation, useConsumerOrders, useConsumerReservations, useRealtimeGroupBuy, useRealtimePools } from '@/features/group-buy/hooks';

type Tab = 'active' | 'done';

export default function GroupBuyOrdersPage() {
  const { data: orders, isLoading, isError } = useConsumerOrders();
  const { data: reservations } = useConsumerReservations();
  const cancelReservation = useCancelReservation();
  useRealtimeGroupBuy();
  useRealtimePools();
  const [tab, setTab] = useState<Tab>('active');

  const grouped = useMemo(() => {
    const list = orders ?? [];
    return {
      active: list.filter((o) => o.status !== 'completed' && o.status !== 'cancelled'),
      done: list.filter((o) => o.status === 'completed' || o.status === 'cancelled'),
    };
  }, [orders]);

  // 확정된 예약은 주문으로 이미 보이므로 여기서는 모이는 중·끝난 것만
  const groupedReservations = useMemo(() => {
    const list = reservations ?? [];
    return {
      active: list.filter((r) => r.status === 'open'),
      done: list.filter((r) => r.status === 'cancelled' || r.status === 'expired' || r.status === 'refunded'),
    };
  }, [reservations]);

  const visible = grouped[tab];
  const visibleReservations = groupedReservations[tab];

  const handleCancelReservation = async (id: string) => {
    if (!window.confirm('이 주문을 취소할까요? 선결제 금액은 바로 환불됩니다.')) return;
    await cancelReservation.mutateAsync(id);
  };

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-[22px] font-bold tracking-[-0.02em] text-content">주문내역</h2>
          <p className="mt-1 text-[13.5px] text-content-soft">진행 상황은 실시간으로 갱신됩니다.</p>
        </div>
        <div className="inline-flex rounded-lg border border-line bg-surface p-1">
          {(
            [
              { key: 'active', label: '진행 중', count: grouped.active.length + groupedReservations.active.length },
              { key: 'done', label: '완료·취소', count: grouped.done.length + groupedReservations.done.length },
            ] as { key: Tab; label: string; count: number }[]
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-md px-3.5 text-[13px] font-semibold transition-colors',
                tab === t.key ? 'bg-ink text-white' : 'text-content-soft hover:text-content',
              )}
            >
              {t.label}
              <span className={cn('tabular-nums', tab === t.key ? 'text-white/70' : 'text-content-ghost')}>{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[136px] rounded-2xl" />)
        ) : isError ? (
          <EmptyState title="주문내역을 불러오지 못했어요" description="잠시 후 다시 시도해주세요." />
        ) : visible.length === 0 && visibleReservations.length === 0 ? (
          <EmptyState
            title={tab === 'active' ? '진행 중인 주문이 없어요' : '완료되거나 취소된 주문이 없어요'}
            description={tab === 'active' ? '지금 모집 중인 부위를 둘러보세요.' : undefined}
            action={
              tab === 'active' ? (
                <Link href="/group-buy/products" className="inline-flex h-10 items-center rounded-lg bg-ink px-5 text-[14px] font-semibold text-white hover:bg-ink-hover">
                  모집 중인 부위 보기
                </Link>
              ) : null
            }
          />
        ) : (
          <>
            {visibleReservations.length > 0 ? (
              <div className="space-y-3">
                <p className="text-[13px] font-semibold text-content-mid">{tab === 'active' ? '1kg 구매 · 접수된 주문' : '1kg 구매 · 끝난 주문'}</p>
                {visibleReservations.map((r) => (
                  <ReservationCard
                    key={r.id}
                    reservation={r}
                    onCancel={handleCancelReservation}
                    cancelling={cancelReservation.isPending && cancelReservation.variables === r.id}
                  />
                ))}
                {visible.length > 0 ? <p className="pt-3 text-[13px] font-semibold text-content-mid">벌크구매 · 확정된 주문</p> : null}
              </div>
            ) : null}
            {visible.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
