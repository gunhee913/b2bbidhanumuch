'use client';

import { use, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GroupBuyShell } from '@/features/group-buy/components/GroupBuyShell';
import { ImageGallery } from '@/features/group-buy/components/ImageGallery';
import { EmptyState, GradeBadge, SectionTitle, Skeleton } from '@/features/group-buy/components/primitives';
import { ReservationCard } from '@/features/group-buy/components/pools/ReservationCard';
import { ReservationForm } from '@/features/group-buy/components/pools/ReservationForm';
import { useCancelReservation, useConsumerPool, useConsumerPools, useConsumerReservations, useRealtimePools } from '@/features/group-buy/hooks';
import { compareGradeKey, gradeKeyShort } from '@/features/group-buy/lib/pools';
import { formatWon } from '@/features/group-buy/lib/slots';
import type { ConsumerPool } from '@/features/group-buy/types';
import { ApiError } from '@/features/group-buy/api';

const HOW_IT_WORKS = [
  { title: 'kg을 고르고 결제해요', body: '농협이 정한 kg당 가격에 원하는 kg만큼 결제합니다. 1kg부터 주문할 수 있어요.' },
  { title: '소분 · 진공 포장', body: '주문이 접수되면 1kg 단위로 소분해 진공 포장합니다.' },
  { title: '냉장 배송', body: '포장이 끝나면 냉장으로 보내드려요. 배송 준비 전에는 취소할 수 있어요.' },
] as const;

/** 1kg 구매 · 부위×등급 상세 + 구매 */
export default function GroupBuyKgDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: pool, isLoading, error } = useConsumerPool(id);
  const { data: pools } = useConsumerPools();
  useRealtimePools();

  if (isLoading) {
    return (
      <GroupBuyShell>
        <DetailSkeleton />
      </GroupBuyShell>
    );
  }

  if (!pool) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <GroupBuyShell>
        <EmptyState
          title={notFound ? '지금은 볼 수 없는 부위예요' : '부위를 불러오지 못했어요'}
          description={notFound ? '참여를 받지 않거나 없는 부위입니다.' : '잠시 후 다시 시도해주세요.'}
          action={
            <Link href="/group-buy/kg" className="inline-flex h-10 items-center rounded-lg bg-ink px-5 text-[14px] font-semibold text-white hover:bg-ink-hover">
              1kg 구매 목록으로
            </Link>
          }
        />
      </GroupBuyShell>
    );
  }

  const siblings = (pools ?? []).filter((p) => p.partGroup === pool.partGroup).sort((a, b) => compareGradeKey(a.gradeKey, b.gradeKey));

  return (
    <GroupBuyShell>
      <nav aria-label="경로" className="flex items-center gap-1.5 text-[13px] text-content-faint">
        <Link href="/group-buy/kg" className="hover:text-content">
          1kg 구매
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span>{pool.partGroup}</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-content-mid">{pool.gradeLabel}</span>
      </nav>

      <div className="mt-5 grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start gap-10">
        {/* 왼쪽 · 이미지 + 정보 */}
        <div className="min-w-0">
          <ImageGallery images={pool.image ? [pool.image] : []} alt={pool.partGroup} />

          <div className="mt-7 flex items-center gap-2.5">
            <h1 className="text-[28px] font-bold tracking-[-0.03em] text-content">{pool.partGroup}</h1>
            <GradeBadge grade={gradeKeyShort(pool.gradeKey)} label={pool.gradeLabel} size="md" />
          </div>
          <p className="mt-2 text-[14.5px] leading-relaxed text-content-soft">
            {pool.partGroup} {pool.gradeLabel}을 1kg 단위로 진공 포장해 냉장 배송해 드려요. 지금까지 {pool.totalKg}kg 팔렸어요.
          </p>

          <section className="mt-10">
            <SectionTitle title="이렇게 진행돼요" />
            <ol className="mt-4 grid grid-cols-3 gap-4">
              {HOW_IT_WORKS.map((step, i) => (
                <li key={step.title} className="rounded-2xl border border-line-soft bg-surface p-5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[13px] font-bold text-white">{i + 1}</span>
                  <p className="mt-3 text-[14.5px] font-bold text-content">{step.title}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-content-soft">{step.body}</p>
                </li>
              ))}
            </ol>
          </section>

          {siblings.length > 1 ? (
            <section className="mt-10">
              <SectionTitle title={`${pool.partGroup} 다른 등급`} description="같은 부위, 등급별 kg당 가격이에요." />
              <ul className="mt-4 divide-y divide-line-soft overflow-hidden rounded-sm border border-line bg-surface">
                {siblings.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/group-buy/kg/${s.id}`}
                      aria-current={s.id === pool.id ? 'page' : undefined}
                      className={cn('grid grid-cols-[150px_minmax(0,1fr)_140px] items-center gap-4 px-5 py-3.5 transition-colors', s.id === pool.id ? 'bg-surface-accent' : 'hover:bg-surface-accent/60')}
                    >
                      <span className="flex items-center gap-2">
                        <GradeBadge grade={gradeKeyShort(s.gradeKey)} label={s.gradeLabel} />
                      </span>
                      <span className="text-[12.5px] tabular-nums text-content-soft">총 판매량 {s.totalKg}kg</span>
                      <span className="text-right text-[15px] font-bold tabular-nums text-content">{formatWon(s.pricePerKg)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        {/* 오른쪽 · 구매 */}
        <PurchasePanel pool={pool} />
      </div>
    </GroupBuyShell>
  );
}

function PurchasePanel({ pool }: { pool: ConsumerPool }) {
  const { status: sessionStatus } = useSession();
  const loggedIn = sessionStatus === 'authenticated';
  const { data: reservations } = useConsumerReservations(loggedIn);
  const cancel = useCancelReservation();

  const mine = useMemo(
    () => (reservations ?? []).filter((r) => r.poolId === pool.id && (r.status === 'open' || r.status === 'allocated')),
    [reservations, pool.id],
  );

  const handleCancel = async (id: string) => {
    if (!window.confirm('이 주문을 취소할까요? 결제 금액은 바로 환불됩니다.')) return;
    await cancel.mutateAsync(id);
  };

  return (
    <aside className="sticky top-24 space-y-4">
      <div className="rounded-2xl border border-line-soft bg-surface p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[12.5px] font-semibold text-content-soft">kg당 가격</p>
            <p className="mt-1 text-[32px] font-bold leading-none tabular-nums tracking-[-0.03em] text-content">{formatWon(pool.pricePerKg)}</p>
          </div>
          {pool.referenceRetailPricePerKg ? (
            <div className="text-right">
              <p className="text-[12px] text-content-faint">시중 소매가</p>
              <p className="text-[14px] tabular-nums text-content-faint line-through">{formatWon(pool.referenceRetailPricePerKg)}</p>
              {pool.savingRate ? <p className="mt-0.5 text-[13px] font-bold text-meat-700">{pool.savingRate}% 저렴</p> : null}
            </div>
          ) : null}
        </div>

        <div className="mt-6 border-t border-line-soft pt-6">
          <ReservationForm pool={pool} />
        </div>
      </div>

      {mine.length > 0 ? (
        <div>
          <p className="mb-2.5 text-[13px] font-semibold text-content-mid">이 부위의 내 주문</p>
          <div className="space-y-2">
            {mine.map((r) => (
              <ReservationCard key={r.id} reservation={r} compact onCancel={handleCancel} cancelling={cancel.isPending && cancel.variables === r.id} />
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function DetailSkeleton() {
  return (
    <div className="mt-5 grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-10">
      <div className="space-y-6">
        <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-[120px] rounded-2xl" />
      </div>
      <Skeleton className="h-[520px] rounded-2xl" />
    </div>
  );
}
