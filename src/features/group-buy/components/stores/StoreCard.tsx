'use client';

import Link from 'next/link';
import { Clock, MapPin, Phone } from 'lucide-react';
import { SmartImage } from '@/components/ui/smart-image';
import { cn } from '@/lib/utils';
import { storeHoursLabel } from '../../lib/stores';
import type { ConsumerStore } from '../../types';

const FALLBACK_IMAGE = 'https://picsum.photos/seed/hanwoo-store/640/400';

interface StoreCardProps {
  store: ConsumerStore;
  selected?: boolean;
  onSelect?: (store: ConsumerStore) => void;
  className?: string;
}

/** 매장이용 목록 한 장 · 누르면 지도가 그 매장으로 옮겨가고, 상세로 들어갈 수 있다 */
export function StoreCard({ store, selected = false, onSelect, className }: StoreCardProps) {
  return (
    <article
      onClick={() => onSelect?.(store)}
      className={cn(
        'grid cursor-pointer grid-cols-[112px_minmax(0,1fr)] gap-4 rounded-sm border bg-surface p-3 transition-colors',
        selected ? 'border-ink' : 'border-line hover:border-content-faint',
        className,
      )}
    >
      <span className="relative h-[84px] w-[112px] overflow-hidden rounded-sm bg-surface-accent">
        <SmartImage src={store.imageUrl ?? FALLBACK_IMAGE} alt={store.name} fill fallbackSrc={FALLBACK_IMAGE} className="object-cover" />
      </span>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15px] font-bold text-content">{store.name}</h3>
          <Link
            href={`/group-buy/stores/${store.slug}`}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 text-[12.5px] font-semibold text-content-mid underline-offset-2 hover:underline"
          >
            자세히
          </Link>
        </div>
        <p className="mt-1 flex items-start gap-1 text-[12.5px] leading-snug text-content-soft">
          <MapPin className="mt-[2px] h-3 w-3 shrink-0" />
          <span className="truncate">
            {store.address} {store.addressDetail}
          </span>
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[12.5px] tabular-nums text-content-faint">
          <Clock className="h-3 w-3 shrink-0" />
          {storeHoursLabel(store)}
        </p>
        {store.phone ? (
          <p className="mt-0.5 flex items-center gap-1 text-[12.5px] tabular-nums text-content-faint">
            <Phone className="h-3 w-3 shrink-0" />
            {store.phone}
          </p>
        ) : null}
      </div>
    </article>
  );
}
