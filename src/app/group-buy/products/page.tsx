'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { CATTLE_PART_NAMES } from '@/constants/cattleParts';
import { getPartGroupOrder } from '@/features/live-auction/lib/partGrouping';
import { GroupBuyShell } from '@/features/group-buy/components/GroupBuyShell';
import { EmptyState, Skeleton } from '@/features/group-buy/components/primitives';
import { ALL_FILTER, FilterChip, FilterRow } from '@/features/group-buy/components/products/ProductFilters';
import { ProductOrderPanel } from '@/features/group-buy/components/products/ProductOrderPanel';
import { ProductTable, ProductTableHead } from '@/features/group-buy/components/products/ProductTable';
import { useConsumerProducts, useRealtimeGroupBuy } from '@/features/group-buy/hooks';
import { gradeRank } from '@/features/group-buy/lib/format';
import { isOpen } from '@/features/group-buy/lib/homeFilters';
import { GRADE_KEY_ORDER, gradeKeyLabel, gradeKeyOf } from '@/features/group-buy/lib/pools';
import type { ProductZone } from '@/features/group-buy/lib/slots';
import type { ConsumerProduct } from '@/features/group-buy/types';

/** 공동구매 · 모집 중인 구좌 상품 표 + 오른쪽 바로 주문 / 장바구니 담기 */
export default function GroupBuyProductsPage() {
  const [partGroup, setPartGroup] = useState(ALL_FILTER);
  const [grade, setGrade] = useState(ALL_FILTER);
  const [selectedId, setSelectedId] = useState<string>();
  const [slotNo, setSlotNo] = useState<number>();

  const { data: products, isLoading, isError } = useConsumerProducts();
  useRealtimeGroupBuy();

  const open = useMemo(() => (products ?? []).filter((p) => isOpen(p)), [products]);

  const partGroups = useMemo(() => {
    const present = new Set(open.map((p) => p.partGroup));
    return getPartGroupOrder().filter((g) => present.has(g));
  }, [open]);

  // 등급 칩은 항상 전부 보여준다 · 1++ 은 근내지방도 9·8·7 로 나누고, 상품이 없으면 빈 표로 안내한다
  // 근내지방도를 모르는 '1++' 만 실제로 있을 때 끼워 넣는다
  const grades = useMemo(() => {
    const present = new Set(open.map((p) => gradeKeyOf(p.cattle.grade, p.cattle.marblingScore)));
    return GRADE_KEY_ORDER.filter((g) => g !== '1++' || present.has(g));
  }, [open]);

  // 부위 순서(등심 → 안심 → …) → 등급(1++(9) 부터) → 상장번호 → 좌/우 순으로 정렬
  const visible = useMemo(() => {
    const rankIn = (list: readonly string[], name: string) => {
      const i = list.indexOf(name);
      return i === -1 ? list.length : i;
    };
    const groupOrder = getPartGroupOrder();
    return open
      .filter((p) => (!partGroup || p.partGroup === partGroup) && (!grade || gradeKeyOf(p.cattle.grade, p.cattle.marblingScore) === grade))
      .sort(
        (a, b) =>
          rankIn(groupOrder, a.partGroup) - rankIn(groupOrder, b.partGroup) ||
          gradeRank(b.cattle.grade, b.cattle.marblingScore) - gradeRank(a.cattle.grade, a.cattle.marblingScore) ||
          a.cattle.listingNo.localeCompare(b.cattle.listingNo, 'ko', { numeric: true }) ||
          rankIn(CATTLE_PART_NAMES, a.partName) - rankIn(CATTLE_PART_NAMES, b.partName),
      );
  }, [open, partGroup, grade]);

  // 선택한 상품은 항상 최신 목록에서 다시 찾는다 — 실시간으로 팔린 구좌가 패널에 반영되도록.
  // 아직 고른 게 없으면 표 맨 윗줄을 기본으로 고른다.
  const selected = useMemo(() => open.find((p) => p.id === selectedId) ?? visible[0], [open, selectedId, visible]);

  const selectProduct = (p: ConsumerProduct) => {
    if (p.id === selected?.id) return;
    setSelectedId(p.id);
    setSlotNo(undefined);
  };

  // 구좌는 한 번에 하나만 고른다 · 같은 구좌를 다시 누르면 푼다
  const toggleZone = (p: ConsumerProduct, zone: ProductZone) => {
    if (zone.sold) return;
    const samePick = p.id === selected?.id && zone.slotNo === slotNo;
    setSelectedId(p.id);
    setSlotNo(samePick ? undefined : zone.slotNo);
  };

  const selectedSlots = useMemo(() => (slotNo === undefined ? [] : [slotNo]), [slotNo]);
  // 표가 실제로 그려질 때만 머리글을 sticky 영역에 올린다 · 로딩/빈 상태에서는 머리글만 떠 있으면 어색하다
  const hasTable = !isLoading && !isError && visible.length > 0;

  return (
    <GroupBuyShell>
      <h1 className="text-[30px] font-bold leading-[1.2] tracking-[-0.03em] text-content">
        한우 벌크구매,
        <br />
        도매가격 수준으로 저렴하게,
      </h1>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        <section className="rounded-sm border border-line bg-surface">
          {/* 필터 + 표 머리글을 한 덩어리로 사이트 헤더 아래 고정 · 헤더 높이(84px)에 맞춰 1px 선 아래로 살짝 겹치게 두어 확대/축소 시 소수점 오차로 틈이 비치지 않는다 */}
          <div className="sticky top-[84px] z-10 bg-surface">
            <div className="border-b border-line px-4 py-3">
              <FilterRow label="부위">
                <FilterChip active={partGroup === ALL_FILTER} onClick={() => setPartGroup(ALL_FILTER)}>
                  전체
                </FilterChip>
                {partGroups.map((g) => (
                  <FilterChip key={g} active={partGroup === g} onClick={() => setPartGroup(g)}>
                    {g}
                  </FilterChip>
                ))}
              </FilterRow>
              <FilterRow label="등급" className="mt-2.5">
                <FilterChip active={grade === ALL_FILTER} onClick={() => setGrade(ALL_FILTER)}>
                  전체
                </FilterChip>
                {grades.map((g) => (
                  <FilterChip key={g} active={grade === g} onClick={() => setGrade(g)}>
                    {gradeKeyLabel(g)}
                  </FilterChip>
                ))}
              </FilterRow>
            </div>
            {hasTable ? (
              <div className="px-4 pt-4">
                <ProductTableHead />
              </div>
            ) : null}
          </div>

          <div className={cn('px-4 pb-4', hasTable ? '' : 'pt-4')}>
            {isLoading ? (
              <div className="space-y-1 py-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-sm" />
                ))}
              </div>
            ) : isError ? (
              <EmptyState title="상품을 불러오지 못했어요" description="잠시 후 다시 시도해주세요." />
            ) : visible.length === 0 ? (
              <EmptyState
                title={open.length === 0 ? '지금은 모집 중인 상품이 없어요' : '이 조건에 맞는 상품이 없어요'}
                description={open.length === 0 ? '공판장에 새 개체가 올라오면 이곳에 바로 표시됩니다.' : '다른 부위나 등급을 골라보세요.'}
              />
            ) : (
              <ProductTable products={visible} selectedId={selected?.id} selectedSlots={selectedSlots} onSelect={selectProduct} onToggleZone={toggleZone} />
            )}
          </div>
        </section>

        <ProductOrderPanel selected={selected} slotNo={slotNo} onSlotChange={setSlotNo} />
      </div>
    </GroupBuyShell>
  );
}
