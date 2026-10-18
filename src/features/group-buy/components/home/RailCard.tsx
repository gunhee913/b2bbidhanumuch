'use client';

import Link from 'next/link';
import { SmartImage } from '@/components/ui/smart-image';
import { cn } from '@/lib/utils';
import type { ConsumerProduct } from '../../types';
import { formatKg, formatWon } from '../../lib/slots';
import { shortGrade } from '../../lib/format';
import { DeadlineBadge } from '../primitives';

const FALLBACK_IMAGE = 'https://picsum.photos/seed/hanwoo/480/360';

/**
 * 가로 스크롤 줄에 들어가는 작은 상품 카드 · 헤이딜러 차량 카드 구성을 따른다.
 * 사진 → 이름 → 스펙 한 줄 → 할인 배지 + 참고가(취소선) + 구좌가.
 */
export function RailCard({ product, rank, className }: { product: ConsumerProduct; rank?: number; className?: string }) {
  const soldOut = product.remainingCount === 0;
  const spec = [shortGrade(product.cattle.grade) ? `${shortGrade(product.cattle.grade)}등급` : null, product.cattle.slaughterHouse?.replace(/^농협\s*/, ''), formatKg(product.partWeight)]
    .filter(Boolean)
    .join(' · ');

  return (
    <Link
      href={`/group-buy/products/${product.id}`}
      className={cn('group flex w-[236px] shrink-0 flex-col overflow-hidden rounded-xl border border-line-soft bg-surface transition-shadow hover:shadow-lg hover:shadow-black/5', className)}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-accent">
        <SmartImage src={product.images[0] ?? FALLBACK_IMAGE} alt={`${product.partName} 사진`} fill fallbackSrc={FALLBACK_IMAGE} className="transition-transform duration-500 group-hover:scale-[1.04]" />
        {rank ? (
          <span className="absolute left-2.5 top-2.5 flex h-6 min-w-[24px] items-center justify-center rounded-md bg-gold-400 px-1.5 text-[12px] font-bold tabular-nums text-ink">
            {rank}
          </span>
        ) : null}
        {soldOut ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-[14px] font-bold text-white">모집 완료</div>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col px-3.5 pb-3.5 pt-3">
        <p className="truncate text-[15px] font-bold tracking-[-0.01em] text-content">{product.partName}</p>
        <p className="mt-0.5 truncate text-[12.5px] text-content-soft">{spec}</p>
        <p className="mt-0.5 text-[12px] text-content-faint">
          구좌 {formatKg(product.slotWeight)} · {soldOut ? `${product.slotCount}구좌 마감` : `${product.remainingCount}/${product.slotCount}구좌 남음`}
        </p>

        <div className="mt-2.5 flex items-center gap-1.5">
          {product.savingRate ? (
            <span className="rounded bg-meat-50 px-1.5 py-0.5 text-[11.5px] font-bold text-meat-700">{product.savingRate}%↓</span>
          ) : null}
          {product.referenceRetailPrice ? (
            <span className="text-[12px] tabular-nums text-content-ghost line-through">{formatWon(product.referenceRetailPrice)}</span>
          ) : null}
        </div>
        <div className="mt-0.5 flex items-end justify-between">
          <span className="text-[18px] font-bold tabular-nums tracking-[-0.02em] text-content">{formatWon(product.slotPrice)}</span>
          <DeadlineBadge deadline={product.recruitDeadline} className="bg-transparent px-0 text-content-faint" />
        </div>
      </div>
    </Link>
  );
}

export function RailCardSkeleton() {
  return (
    <div className="w-[236px] shrink-0 overflow-hidden rounded-xl border border-line-soft bg-surface">
      <div className="aspect-[4/3] w-full animate-pulse bg-surface-accent" />
      <div className="space-y-2 p-3.5">
        <div className="h-4 w-2/3 animate-pulse rounded bg-surface-accent" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-surface-accent" />
        <div className="h-5 w-1/3 animate-pulse rounded bg-surface-accent" />
      </div>
    </div>
  );
}
