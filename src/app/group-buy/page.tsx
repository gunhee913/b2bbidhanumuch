'use client';

import { useMemo, useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { GroupBuyShell } from '@/features/group-buy/components/GroupBuyShell';
import { FlowGuide } from '@/features/group-buy/components/FlowGuide';
import { EmptyState } from '@/features/group-buy/components/primitives';
import { SearchPanel } from '@/features/group-buy/components/home/SearchPanel';
import { ClosingBand } from '@/features/group-buy/components/home/ClosingBand';
import { ProductRail } from '@/features/group-buy/components/home/ProductRail';
import { RailCard, RailCardSkeleton } from '@/features/group-buy/components/home/RailCard';
import { AfterCare } from '@/features/group-buy/components/home/AfterCare';
import { useConsumerProducts, useRealtimeGroupBuy } from '@/features/group-buy/hooks';
import { getPartGroupOrder } from '@/features/live-auction/lib/partGrouping';
import { GB_CONTAINER_CLASS } from '@/features/group-buy/constants/ui';
import {
  EMPTY_HOME_QUERY,
  QUICK_LABELS,
  applyHomeQuery,
  brandOf,
  isAlmostFull,
  isHomeQueryActive,
  isOpen,
  popularSearches,
  sortByDeadline,
  sortByFill,
  sortByNewest,
  sortBySaving,
  summarizePartGroups,
  type HomeQuery,
  type QuickKey,
} from '@/features/group-buy/lib/homeFilters';

const CLOSING_LIMIT = 10;
const RAIL_LIMIT = 12;

export default function GroupBuyHomePage() {
  const [query, setQuery] = useState<HomeQuery>(EMPTY_HOME_QUERY);
  const resultsRef = useRef<HTMLDivElement>(null);
  const { data: products, isLoading, isError } = useConsumerProducts();
  useRealtimeGroupBuy();

  const all = useMemo(() => products ?? [], [products]);
  const open = useMemo(() => all.filter((p) => isOpen(p)), [all]);
  const partGroups = useMemo(() => summarizePartGroups(open), [open]);
  const popular = useMemo(() => popularSearches(open), [open]);
  const brands = useMemo(() => Array.from(new Set(all.map(brandOf).filter(Boolean))) as string[], [all]);

  const closing = useMemo(() => sortByDeadline(open).slice(0, CLOSING_LIMIT), [open]);
  const saving = useMemo(() => sortBySaving(open.filter((p) => (p.savingRate ?? 0) > 0)).slice(0, RAIL_LIMIT), [open]);
  const almost = useMemo(() => sortByFill(open.filter(isAlmostFull)).slice(0, RAIL_LIMIT), [open]);
  const newest = useMemo(() => sortByNewest(open).slice(0, RAIL_LIMIT), [open]);
  const groupRails = useMemo(
    () => getPartGroupOrder().map((g) => ({ group: g, items: all.filter((p) => p.partGroup === g) })).filter((r) => r.items.length > 0),
    [all],
  );

  const active = isHomeQueryActive(query);
  const filtered = useMemo(() => applyHomeQuery(all, query), [all, query]);

  const scrollToResults = () => {
    requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const showQuick = (quick: QuickKey) => {
    setQuery({ ...EMPTY_HOME_QUERY, quick });
    scrollToResults();
  };
  const showGroup = (partGroup: string) => {
    setQuery({ ...EMPTY_HOME_QUERY, partGroup });
    scrollToResults();
  };

  return (
    <GroupBuyShell fluid>
      <div className={GB_CONTAINER_CLASS}>
        <SearchPanel query={query} onChange={setQuery} onSubmit={scrollToResults} resultCount={filtered.length} loading={isLoading} brands={brands} partGroups={partGroups} popular={popular} />

        <div ref={resultsRef} className="scroll-mt-[100px]" />

        {active ? (
          <ResultsSection query={query} products={filtered} loading={isLoading} onReset={() => setQuery(EMPTY_HOME_QUERY)} />
        ) : isError ? (
          <div className="mt-16">
            <EmptyState title="상품을 불러오지 못했어요" description="잠시 후 다시 시도해주세요." />
          </div>
        ) : !isLoading && all.length === 0 ? (
          <div className="mt-16">
            <EmptyState title="지금은 모집 중인 상품이 없어요" description="공판장에 새 개체가 올라오면 이곳에 바로 표시됩니다." />
          </div>
        ) : (
          <div className="mt-14 space-y-16">
            <ClosingBand products={closing} loading={isLoading} onMore={() => showQuick('closing')} />
            <ProductRail title="절약률 높은 순" description="소매가 대비 구좌가가 얼마나 저렴한지로 정렬했어요." products={saving} loading={isLoading} onMore={() => showQuick('saving')} />
            <ProductRail title="거의 다 찼어요" description="남은 구좌가 20% 이하인 모집이에요." products={almost} loading={isLoading} onMore={() => showQuick('almost')} />
            <ProductRail title="새로 올라온 부위" products={newest} loading={isLoading} onMore={() => showQuick('new')} />
            {groupRails.map((r) => (
              <ProductRail key={r.group} title={r.group} products={r.items.slice(0, RAIL_LIMIT)} onMore={() => showGroup(r.group)} />
            ))}
          </div>
        )}

        <div className="mt-20 space-y-16">
          <FlowGuide />
          <AfterCare />
        </div>
      </div>
    </GroupBuyShell>
  );
}

function describeQuery(q: HomeQuery): string {
  const quick = q.quick ? QUICK_LABELS[q.quick] : '';
  const parts = [quick, q.partGroup, q.grade ? `${q.grade}등급` : '', q.brand].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : '전체';
}

function ResultsSection({
  query,
  products,
  loading,
  onReset,
}: {
  query: HomeQuery;
  products: ReturnType<typeof applyHomeQuery>;
  loading: boolean;
  onReset: () => void;
}) {
  return (
    <section className="mt-12" aria-label="검색 결과">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <button type="button" onClick={onReset} className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-content-faint hover:text-content">
            <ChevronLeft className="h-4 w-4" />
            홈으로
          </button>
          <h2 className="mt-1.5 text-[22px] font-bold tracking-[-0.03em] text-content">
            {describeQuery(query)}
            <span className="ml-2 text-[15px] font-semibold tabular-nums text-content-faint">{products.length}개</span>
          </h2>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <RailCardSkeleton key={i} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          title="조건에 맞는 상품이 없어요"
          description="검색어나 조건을 바꿔보세요."
          action={
            <button type="button" onClick={onReset} className="inline-flex h-10 items-center rounded-md border border-line bg-surface px-4 text-[14px] font-semibold text-content hover:bg-surface-muted">
              조건 초기화
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-5 gap-4">
          {products.map((p) => (
            <RailCard key={p.id} product={p} className="w-full" />
          ))}
        </div>
      )}
    </section>
  );
}
