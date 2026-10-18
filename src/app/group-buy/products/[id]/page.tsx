'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { GroupBuyShell } from '@/features/group-buy/components/GroupBuyShell';
import { ImageGallery } from '@/features/group-buy/components/ImageGallery';
import { EmptyState, GradeBadge, Skeleton } from '@/features/group-buy/components/primitives';
import { ProductOrderPanel } from '@/features/group-buy/components/products/ProductOrderPanel';
import { CertificateSection, ProductDescription, ProductInfoSections, ZoneGuide } from '@/features/group-buy/components/products/ProductInfoSections';
import { ProductTable, ProductTableHead, productTitle } from '@/features/group-buy/components/products/ProductTable';
import { useConsumerProduct, useRealtimeGroupBuy } from '@/features/group-buy/hooks';
import { isOpen } from '@/features/group-buy/lib/homeFilters';
import type { ProductZone } from '@/features/group-buy/lib/slots';
import { ApiError } from '@/features/group-buy/api';

/**
 * 공동구매 상품 상세 · 목록 페이지와 같은 구성(가격표 + 오른쪽 주문 패널).
 * 아래로 사진 · 품질/도축/가공 정보 · 증명서 · 상세설명이 이어진다. 마감 시각·모집 현황은 보여주지 않는다.
 */
export default function GroupBuyProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, error } = useConsumerProduct(id);
  useRealtimeGroupBuy();
  const [slotNo, setSlotNo] = useState<number>();

  const product = data?.product;
  const selectedSlots = useMemo(() => (slotNo === undefined ? [] : [slotNo]), [slotNo]);

  if (isLoading) {
    return (
      <GroupBuyShell>
        <DetailSkeleton />
      </GroupBuyShell>
    );
  }

  if (!product) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <GroupBuyShell>
        <EmptyState
          title={notFound ? '지금은 볼 수 없는 상품이에요' : '상품을 불러오지 못했어요'}
          description={notFound ? '모집이 끝났거나 아직 공개되지 않은 상품입니다.' : '잠시 후 다시 시도해주세요.'}
          action={
            <Link href="/group-buy/products" className="inline-flex h-10 items-center rounded-sm bg-ink px-5 text-[14px] font-semibold text-white hover:bg-ink-hover">
              모집 중인 부위 보기
            </Link>
          }
        />
      </GroupBuyShell>
    );
  }

  // 구좌는 한 번에 하나 · 같은 구좌를 다시 누르면 푼다
  const toggleZone = (_p: unknown, zone: ProductZone) => {
    if (zone.sold) return;
    setSlotNo((prev) => (prev === zone.slotNo ? undefined : zone.slotNo));
  };
  const open = isOpen(product);

  return (
    <GroupBuyShell>
      <nav aria-label="경로" className="flex items-center gap-1.5 text-[13px] text-content-faint">
        <Link href="/group-buy/products" className="hover:text-content">
          벌크구매
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-content-mid">{product.partName}</span>
      </nav>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="text-[30px] font-bold leading-[1.2] tracking-[-0.03em] text-content">{productTitle(product)}</h1>
        <GradeBadge grade={product.cattle.grade} size="md" />
        <span className="text-[13px] text-content-faint">
          {product.cattle.listingNo}
          {product.cattle.slaughterHouse ? ` · ${product.cattle.slaughterHouse}` : ''}
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        <div className="space-y-6">
          {/* 가격표 · 목록과 같은 표 · 위치 줄을 눌러 고른다 */}
          <section className="rounded-sm border border-line bg-surface">
            <div className="px-4 pt-4">
              <ProductTableHead showDetailLink={false} />
              <ProductTable products={[product]} selectedId={product.id} selectedSlots={selectedSlots} onSelect={() => {}} onToggleZone={toggleZone} showDetailLink={false} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <ZoneGuide product={product} />
              {!open ? <span className="text-[12.5px] font-semibold text-content-faint">모집이 종료된 상품입니다</span> : null}
            </div>
          </section>

          <ImageGallery images={product.images} alt={product.partName} aspectClassName="aspect-[16/9]" />

          <ProductInfoSections product={product} />
          <CertificateSection product={product} />
          <ProductDescription description={product.description} />
        </div>

        <ProductOrderPanel selected={product} slotNo={slotNo} onSlotChange={setSlotNo} />
      </div>
    </GroupBuyShell>
  );
}

function DetailSkeleton() {
  return (
    <div>
      <Skeleton className="h-4 w-48" />
      <Skeleton className="mt-4 h-9 w-72" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-6">
          <Skeleton className="h-[260px] rounded-sm" />
          <Skeleton className="aspect-[16/9] w-full rounded-sm" />
          <Skeleton className="h-[280px] rounded-sm" />
        </div>
        <Skeleton className="h-[480px] rounded-sm" />
      </div>
    </div>
  );
}
