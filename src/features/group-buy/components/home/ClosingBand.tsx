'use client';

import { useEffect, useState } from 'react';
import type { ConsumerProduct } from '../../types';
import { remainingUntil } from '../../lib/format';
import { ProductRail } from './ProductRail';

/**
 * 하늘색 바탕의 "마감 임박" 띠 · 헤이딜러 "위클리 특가" 블록에 해당.
 * 가장 빠른 마감까지 초 단위 카운트다운 + 순위 카드 줄.
 */
export function ClosingBand({ products, loading, onMore }: { products: ConsumerProduct[]; loading: boolean; onMore: () => void }) {
  if (!loading && products.length === 0) return null;

  const maxSaving = products.reduce((m, p) => Math.max(m, p.savingRate ?? 0), 0);
  const soonest = products[0];

  return (
    <section className="rounded-2xl bg-gold-50 px-10 pb-10 pt-9" aria-label="마감 임박">
      <div className="text-center">
        <h2 className="text-[30px] font-bold tracking-[-0.035em] text-meat-700">마감 임박</h2>
        {maxSaving > 0 ? (
          <span className="mt-2 inline-block rounded-full bg-meat-600 px-3 py-1 text-[12.5px] font-bold text-white">소매가 대비 최대 {maxSaving}% 절약</span>
        ) : null}
        {soonest ? <Countdown deadline={soonest.recruitDeadline} /> : null}
      </div>
      <ProductRail products={products} loading={loading} ranked hideWhenEmpty={false} className="mt-4" />
      <div className="mt-6 text-center">
        <button type="button" onClick={onMore} className="inline-flex h-10 items-center rounded-full bg-white px-5 text-[13.5px] font-bold text-meat-700 shadow-sm ring-1 ring-gold-200 transition-colors hover:bg-gold-100">
          마감 임박 모두 보기
        </button>
      </div>
    </section>
  );
}

function Countdown({ deadline }: { deadline: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const r = remainingUntil(deadline, now);
  const text = r.isOver
    ? '가장 빠른 모집이 마감됐어요'
    : `가장 빠른 마감까지 ${r.days > 0 ? `${r.days}일 ` : ''}${r.hours}시간 ${r.minutes}분 ${String(r.seconds).padStart(2, '0')}초 남음`;
  return <p className="mt-3 text-[13.5px] font-semibold tabular-nums text-meat-700/80">{text}</p>;
}
