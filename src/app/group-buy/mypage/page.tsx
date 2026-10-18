'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { OrderCard } from '@/features/group-buy/components/OrderCard';
import { EmptyState, Skeleton } from '@/features/group-buy/components/primitives';
import { GB_MYPAGE_PATH } from '@/features/group-buy/constants/ui';
import { useConsumerOrders, useConsumerReservations } from '@/features/group-buy/hooks';

const RECENT_COUNT = 3;

/** 마이페이지 홈 · 주문 현황 요약 + 최근 주문 */
export default function GroupBuyMyPageHome() {
  const { data: session } = useSession();
  const { data: orders, isLoading } = useConsumerOrders();
  const { data: reservations } = useConsumerReservations();

  const stats = useMemo(() => {
    const list = orders ?? [];
    return {
      active: list.filter((o) => o.status !== 'completed' && o.status !== 'cancelled').length,
      completed: list.filter((o) => o.status === 'completed').length,
      pendingKg: (reservations ?? []).filter((r) => r.status === 'open').length,
    };
  }, [orders, reservations]);

  const recent = (orders ?? []).slice(0, RECENT_COUNT);

  return (
    <div>
      <section className="rounded-sm border border-line-soft bg-surface px-7 py-6">
        <p className="text-[18px] font-bold text-content">{session?.user?.name ?? '회원'}님, 안녕하세요.</p>
        <p className="mt-1 text-[13.5px] text-content-soft">{session?.user?.phone}</p>
        <dl className="mt-6 grid grid-cols-3 divide-x divide-line-soft">
          {[
            { label: '진행 중 주문', value: stats.active },
            { label: '1kg 구매 접수', value: stats.pendingKg },
            { label: '완료된 주문', value: stats.completed },
          ].map((s) => (
            <div key={s.label} className="px-6 text-center first:pl-0 last:pr-0">
              <dt className="text-[13px] text-content-soft">{s.label}</dt>
              <dd className="mt-1 text-[26px] font-bold tabular-nums text-content">{isLoading ? '-' : s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-content">최근 주문</h2>
          <Link href={`${GB_MYPAGE_PATH}/orders`} className="inline-flex items-center gap-0.5 text-[13.5px] font-semibold text-content-mid hover:text-content">
            전체 보기
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-[136px] rounded-2xl" />)
          ) : recent.length === 0 ? (
            <EmptyState
              title="아직 주문이 없어요"
              description="지금 모집 중인 부위를 둘러보세요."
              action={
                <Link href="/group-buy/products" className="inline-flex h-10 items-center rounded-sm bg-ink px-5 text-[14px] font-semibold text-white hover:bg-ink-hover">
                  모집 중인 부위 보기
                </Link>
              }
            />
          ) : (
            recent.map((o) => <OrderCard key={o.id} order={o} />)
          )}
        </div>
      </section>
    </div>
  );
}
