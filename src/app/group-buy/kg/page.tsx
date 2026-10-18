'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { GroupBuyShell } from '@/features/group-buy/components/GroupBuyShell';
import { EmptyState, Skeleton } from '@/features/group-buy/components/primitives';
import { OrderPanel } from '@/features/group-buy/components/pools/OrderPanel';
import { PoolTable } from '@/features/group-buy/components/pools/PoolTable';
import { useConsumerPools, useRealtimePools } from '@/features/group-buy/hooks';
import { comparePoolPart, compareGradeKey } from '@/features/group-buy/lib/pools';
import type { ConsumerPool } from '@/features/group-buy/types';

const ALL = '';

/** 부위 순서(윗등심 → 아랫등심 → 안심 …) → 등급 순서 */
function byCatalog(a: ConsumerPool, b: ConsumerPool): number {
  return comparePoolPart(a.partGroup, b.partGroup) || compareGradeKey(a.gradeKey, b.gradeKey);
}

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-8 items-center rounded-sm px-3 text-[13px] font-semibold transition-colors',
        active ? 'bg-ink text-white' : 'bg-surface-accent text-content-mid hover:bg-surface-strong hover:text-content',
      )}
    >
      {children}
    </button>
  );
}

/** 1kg 구매 · 부위×등급 시세표 */
export default function GroupBuyKgPage() {
  const [partGroup, setPartGroup] = useState(ALL);
  const [selectedId, setSelectedId] = useState<string>();

  const { data: pools, isLoading, isError } = useConsumerPools();
  useRealtimePools();

  const partGroups = useMemo(() => Array.from(new Set((pools ?? []).map((p) => p.partGroup))).sort(comparePoolPart), [pools]);

  const visible = useMemo(() => (pools ?? []).filter((p) => !partGroup || p.partGroup === partGroup).sort(byCatalog), [pools, partGroup]);

  // 선택한 풀은 항상 최신 목록에서 다시 찾는다 — 실시간 갱신된 kg이 패널에 반영되도록.
  // 아직 고른 게 없으면 표 맨 윗줄(윗등심 1++(9))을 기본으로 고른다.
  const selected = useMemo(() => (pools ?? []).find((p) => p.id === selectedId) ?? visible[0], [pools, selectedId, visible]);

  return (
    <GroupBuyShell>
      <h1 className="text-[30px] font-bold leading-[1.2] tracking-[-0.03em] text-content">
        한우 1kg 단위로,
        <br />
        필요한 만큼만 저렴하게,
      </h1>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        <section className="rounded-sm border border-line bg-surface">
          <div className="flex flex-wrap items-center gap-1.5 border-b border-line px-4 py-3">
            <Chip active={partGroup === ALL} onClick={() => setPartGroup(ALL)}>
              전체
            </Chip>
            {partGroups.map((g) => (
              <Chip key={g} active={partGroup === g} onClick={() => setPartGroup(g)}>
                {g}
              </Chip>
            ))}
          </div>

          <div className="p-4">
            {isLoading ? (
              <div className="space-y-1 py-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-sm" />
                ))}
              </div>
            ) : isError ? (
              <EmptyState title="목록을 불러오지 못했어요" description="잠시 후 다시 시도해주세요." />
            ) : visible.length === 0 ? (
              <EmptyState title="아직 열린 부위가 없어요" description="다른 부위를 골라보세요." />
            ) : (
              <PoolTable pools={visible} selectedId={selected?.id} onSelect={(pool) => setSelectedId(pool.id)} />
            )}
          </div>
        </section>

        <OrderPanel selected={selected} />
      </div>
    </GroupBuyShell>
  );
}
