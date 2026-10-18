'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConsumerProduct } from '../../types';
import { RailCard, RailCardSkeleton } from './RailCard';

interface ProductRailProps {
  /** 없으면 제목 줄을 생략하고 화살표만 오른쪽에 둔다 */
  title?: string;
  description?: string;
  products: ConsumerProduct[];
  loading?: boolean;
  ranked?: boolean;
  onMore?: () => void;
  /** 비어 있을 때 줄 자체를 숨길지 */
  hideWhenEmpty?: boolean;
  className?: string;
}

const SCROLL_STEP = 236 * 3 + 16 * 3;

/** 제목 + 좌우 화살표 + 가로 스크롤 카드 줄 */
export function ProductRail({ title, description, products, loading = false, ranked = false, onMore, hideWhenEmpty = true, className }: ProductRailProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      ro.disconnect();
    };
  }, [updateArrows, products.length]);

  if (!loading && products.length === 0 && hideWhenEmpty) return null;

  const scrollBy = (dir: 1 | -1) => scrollerRef.current?.scrollBy({ left: dir * SCROLL_STEP, behavior: 'smooth' });

  return (
    <section className={className} aria-label={title}>
      <div className="mb-4 flex items-end justify-between">
        {title ? (
          <button type="button" onClick={onMore} className="group flex items-center gap-1 text-left" disabled={!onMore}>
            <h2 className="text-[22px] font-bold tracking-[-0.03em] text-content">{title}</h2>
            {onMore ? <ChevronRight className="h-5 w-5 text-content-faint transition-transform group-hover:translate-x-0.5" /> : null}
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-1.5">
          <ArrowButton dir="prev" disabled={!canPrev} onClick={() => scrollBy(-1)} />
          <ArrowButton dir="next" disabled={!canNext} onClick={() => scrollBy(1)} />
        </div>
      </div>
      {description ? <p className="-mt-2 mb-4 text-[13.5px] text-content-soft">{description}</p> : null}

      <div ref={scrollerRef} className="-mx-2 flex snap-x gap-4 overflow-x-auto px-2 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <RailCardSkeleton key={i} />)
          : products.length === 0
            ? <p className="py-10 text-[13.5px] text-content-faint">아직 해당하는 상품이 없어요.</p>
            : products.map((p, i) => <RailCard key={p.id} product={p} rank={ranked ? i + 1 : undefined} className="snap-start" />)}
      </div>
    </section>
  );
}

function ArrowButton({ dir, disabled, onClick }: { dir: 'prev' | 'next'; disabled: boolean; onClick: () => void }) {
  const Icon = dir === 'prev' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'prev' ? '이전' : '다음'}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface text-content-mid transition-colors',
        disabled ? 'opacity-30' : 'hover:bg-surface-muted',
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
