'use client';

import { useState } from 'react';
import { GroupBuyShell } from '@/features/group-buy/components/GroupBuyShell';
import { EmptyState, Skeleton } from '@/features/group-buy/components/primitives';
import { StoreCard } from '@/features/group-buy/components/stores/StoreCard';
import { StoreMap } from '@/features/group-buy/components/stores/StoreMap';
import { useStores } from '@/features/group-buy/hooks';
import { PICKUP_LEAD_DAYS } from '@/features/group-buy/lib/stores';

/** 매장안내 · 지도 + 매장 카드 · 카드를 누르면 지도가 그 매장으로 옮겨간다 */
export default function GroupBuyStoresPage() {
  const { data: stores, isLoading } = useStores();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <GroupBuyShell>
      <h1 className="text-[30px] font-bold leading-[1.2] tracking-[-0.03em] text-content">매장안내</h1>
      <p className="mt-1 max-w-[640px] text-[13.5px] leading-relaxed text-content-soft">
        주문하신 고기를 직접 받아가실 수 있는 직영 식육식당입니다. 주문서에서 &quot;매장에서 받기&quot;를 고르면 주문일 {PICKUP_LEAD_DAYS}일 뒤부터
        방문 시간을 예약할 수 있고, 매장에서 바로 구워 드실 수도 있어요.
      </p>

      {isLoading ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <Skeleton className="h-[560px] rounded-sm" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[112px] rounded-sm" />
            ))}
          </div>
        </div>
      ) : !stores || stores.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="운영 중인 매장이 없어요" description="매장이 준비되면 여기에서 안내해 드릴게요." />
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
          <StoreMap stores={stores} selectedId={selectedId} onSelect={(s) => setSelectedId(s.id)} className="h-[420px] lg:sticky lg:top-24 lg:h-[640px]" />
          <ul className="space-y-3">
            {stores.map((store) => (
              <li key={store.id}>
                <StoreCard store={store} selected={store.id === selectedId} onSelect={(s) => setSelectedId(s.id)} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </GroupBuyShell>
  );
}
