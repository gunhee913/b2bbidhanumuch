'use client';

import { useState } from 'react';
import { SmartImage } from '@/components/ui/smart-image';
import { cn } from '@/lib/utils';

const FALLBACK_IMAGE = 'https://picsum.photos/seed/hanwoo-detail/960/720';

interface ImageGalleryProps {
  images: string[];
  alt: string;
  /** 큰 사진 비율 · 상품 상세는 가격표가 중심이라 16:9 로 낮게 쓴다 */
  aspectClassName?: string;
  className?: string;
}

export function ImageGallery({ images, alt, aspectClassName = 'aspect-[4/3]', className }: ImageGalleryProps) {
  const list = images.length > 0 ? images : [FALLBACK_IMAGE];
  const [index, setIndex] = useState(0);
  const current = list[Math.min(index, list.length - 1)];

  return (
    <div className={className}>
      <div className={cn('relative w-full overflow-hidden rounded-sm bg-surface-accent', aspectClassName)}>
        <SmartImage key={current} src={current} alt={alt} fill fallbackSrc={FALLBACK_IMAGE} priority />
      </div>
      {list.length > 1 ? (
        <div className="mt-3 flex gap-2">
          {list.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`${i + 1}번째 사진 보기`}
              aria-pressed={i === index}
              className={cn(
                'relative h-16 w-20 shrink-0 overflow-hidden rounded-sm ring-2 transition-all',
                i === index ? 'ring-ink' : 'ring-transparent opacity-70 hover:opacity-100',
              )}
            >
              <SmartImage src={src} alt="" fill fallbackSrc={FALLBACK_IMAGE} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
