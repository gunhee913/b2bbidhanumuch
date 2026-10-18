'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { CATTLE_PART_NAMES } from '@/constants/cattleParts';
import { getPartGroupOrder } from '@/features/live-auction/lib/partGrouping';
import { EmptyState, Skeleton } from '../primitives';
import { ALL_FILTER, FilterChip, FilterRow } from '../products/ProductFilters';
import { ProductTable, ProductTableHead } from '../products/ProductTable';
import { PoolTable } from '../pools/PoolTable';
import { useConsumerPools, useConsumerProducts, useRealtimeGroupBuy, useRealtimePools } from '../../hooks';
import { gradeRank } from '../../lib/format';
import { isOpen } from '../../lib/homeFilters';
import { GRADE_KEY_ORDER, compareGradeKey, comparePoolPart, gradeKeyLabel, gradeKeyOf } from '../../lib/pools';
import type { ProductZone } from '../../lib/slots';
import type { ConsumerPool, ConsumerProduct } from '../../types';

/** 상품 단계 왼쪽 · 벌크 구좌 표와 1kg 표를 오간다 */
export function StoreVisitProducts({
  pickedSlots,
  onToggleZone,
  onAddKg,
}: {
  pickedSlots: Record<string, number[]>;
  onToggleZone: (product: ConsumerProduct, zone: ProductZone) => void;
  onAddKg: (pool: ConsumerPool) => void;
}) {
  const [catalog, setCatalog] = useState<'bulk' | 'kg'>('bulk');
  const [partGroup, setPartGroup] = useState(ALL_FILTER);
  const [grade, setGrade] = useState(ALL_FILTER);
  const [kgPart, setKgPart] = useState(ALL_FILTER);
  const [selectedPoolId, setSelectedPoolId] = useState<string>();

  const { data: products, isLoading: productsLoading, isError: productsError } = useConsumerProducts();
  const { data: pools, isLoading: poolsLoading, isError: poolsError } = useConsumerPools();
  useRealtimeGroupBuy();
  useRealtimePools();

  const open = useMemo(() => (products ?? []).filter((product) => isOpen(product)), [products]);
  const partGroups = useMemo(() => {
    const present = new Set(open.map((product) => product.partGroup));
    return getPartGroupOrder().filter((group) => present.has(group));
  }, [open]);
  const grades = useMemo(() => {
    const present = new Set(open.map((product) => gradeKeyOf(product.cattle.grade, product.cattle.marblingScore)));
    return GRADE_KEY_ORDER.filter((item) => item !== '1++' || present.has(item));
  }, [open]);
  const visibleProducts = useMemo(() => {
    const rankIn = (list: readonly string[], name: string) => {
      const index = list.indexOf(name);
      return index === -1 ? list.length : index;
    };
    const groupOrder = getPartGroupOrder();
    return open
      .filter((product) => (!partGroup || product.partGroup === partGroup) && (!grade || gradeKeyOf(product.cattle.grade, product.cattle.marblingScore) === grade))
      .sort(
        (a, b) =>
          rankIn(groupOrder, a.partGroup) - rankIn(groupOrder, b.partGroup) ||
          gradeRank(b.cattle.grade, b.cattle.marblingScore) - gradeRank(a.cattle.grade, a.cattle.marblingScore) ||
          a.cattle.listingNo.localeCompare(b.cattle.listingNo, 'ko', { numeric: true }) ||
          rankIn(CATTLE_PART_NAMES, a.partName) - rankIn(CATTLE_PART_NAMES, b.partName),
      );
  }, [open, partGroup, grade]);

  const kgGroups = useMemo(() => Array.from(new Set((pools ?? []).map((pool) => pool.partGroup))).sort(comparePoolPart), [pools]);
  const visiblePools = useMemo(
    () => (pools ?? []).filter((pool) => !kgPart || pool.partGroup === kgPart).sort((a, b) => comparePoolPart(a.partGroup, b.partGroup) || compareGradeKey(a.gradeKey, b.gradeKey)),
    [pools, kgPart],
  );

  const hasTable = catalog === 'bulk' && !productsLoading && !productsError && visibleProducts.length > 0;

  return (
    <section className="rounded-sm border border-line bg-surface">
      <div className={cn('sticky top-[84px] z-10 bg-surface', catalog === 'bulk' && 'border-b-0')}>
        <div className="flex items-center gap-1.5 border-b border-line px-4 py-3">
          <FilterChip active={catalog === 'bulk'} onClick={() => setCatalog('bulk')}>
            벌크
          </FilterChip>
          <FilterChip active={catalog === 'kg'} onClick={() => setCatalog('kg')}>
            1kg
          </FilterChip>
        </div>
        {catalog === 'bulk' ? (
          <div className="border-b border-line px-4 py-3">
            <FilterRow label="부위">
              <FilterChip active={partGroup === ALL_FILTER} onClick={() => setPartGroup(ALL_FILTER)}>
                전체
              </FilterChip>
              {partGroups.map((group) => (
                <FilterChip key={group} active={partGroup === group} onClick={() => setPartGroup(group)}>
                  {group}
                </FilterChip>
              ))}
            </FilterRow>
            <FilterRow label="등급" className="mt-2.5">
              <FilterChip active={grade === ALL_FILTER} onClick={() => setGrade(ALL_FILTER)}>
                전체
              </FilterChip>
              {grades.map((item) => (
                <FilterChip key={item} active={grade === item} onClick={() => setGrade(item)}>
                  {gradeKeyLabel(item)}
                </FilterChip>
              ))}
            </FilterRow>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-line px-4 py-3">
            <FilterChip active={kgPart === ALL_FILTER} onClick={() => setKgPart(ALL_FILTER)}>
              전체
            </FilterChip>
            {kgGroups.map((group) => (
              <FilterChip key={group} active={kgPart === group} onClick={() => setKgPart(group)}>
                {group}
              </FilterChip>
            ))}
          </div>
        )}
        {hasTable ? (
          <div className="px-4 pt-4">
            <ProductTableHead />
          </div>
        ) : null}
      </div>

      <div className={cn('px-4 pb-4', hasTable ? '' : 'pt-4')}>
        {catalog === 'bulk' ? (
          productsLoading ? (
            <LoadingRows />
          ) : productsError ? (
            <EmptyState title="상품을 불러오지 못했어요" description="잠시 후 다시 시도해주세요." />
          ) : visibleProducts.length === 0 ? (
            <EmptyState title={open.length === 0 ? '지금은 모집 중인 상품이 없어요' : '이 조건에 맞는 상품이 없어요'} description="다른 부위나 등급을 골라보세요." />
          ) : (
            <ProductTable
              products={visibleProducts}
              selectedSlots={[]}
              pickedSlots={pickedSlots}
              showDetailLink
              detailNewTab
              onSelect={() => undefined}
              onToggleZone={onToggleZone}
            />
          )
        ) : poolsLoading ? (
          <LoadingRows />
        ) : poolsError ? (
          <EmptyState title="목록을 불러오지 못했어요" description="잠시 후 다시 시도해주세요." />
        ) : visiblePools.length === 0 ? (
          <EmptyState title="아직 열린 부위가 없어요" description="다른 부위를 골라보세요." />
        ) : (
          <PoolTable
            pools={visiblePools}
            selectedId={selectedPoolId}
            onSelect={(pool) => {
              setSelectedPoolId(pool.id);
              onAddKg(pool);
            }}
          />
        )}
      </div>
    </section>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-1 py-2">
      {Array.from({ length: 8 }).map((_, index) => (
        <Skeleton key={index} className="h-12 rounded-sm" />
      ))}
    </div>
  );
}
