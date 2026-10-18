'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { productTitle } from '../products/ProductTable';
import { GIFT_CELL_KG, roundKg } from '../../lib/gift';
import { productMatchesSpec, specKeyOf, specLabelOf, type GiftAutoGroup } from '../../lib/giftAuto';
import { offersForSpec, planGiftSupply, type GiftPoolSource, type GiftSupplyLine, type GiftSupplyPlan } from '../../lib/giftSupply';
import { formatWon } from '../../lib/slots';
import type { ConsumerProduct } from '../../types';

/** 고른 벌크와 그에 맞춘 1kg 수량을 보여주고, 다른 벌크는 버튼으로 고른다 */
export function GiftProductBoard({
  groups,
  products,
  pools,
  quantity,
  emptyCells,
  onPick,
  onFillLeftover,
}: {
  groups: GiftAutoGroup[];
  products: ConsumerProduct[];
  pools: GiftPoolSource[];
  quantity: number;
  emptyCells: number;
  onPick: (specKey: string, productId: string) => void;
  onFillLeftover: (group: GiftAutoGroup) => void;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const cellNeed = roundKg(GIFT_CELL_KG * Math.max(1, quantity));

  if (groups.length === 0) {
    return <p className="text-[13px] text-content-soft">구성에서 부위와 등급을 먼저 골라주세요.</p>;
  }

  return (
    <ul className="space-y-4">
      {groups.map((group) => {
        const key = specKeyOf(group.spec);
        const offers = offersForSpec(pools, group.spec);
        const options = products.filter((product) => productMatchesSpec(product, group.spec));
        const bulkLines = group.lines.filter((line) => line.kind === 'bulk');
        const kgLines = group.lines.filter((line) => line.kind === 'kg');
        const extra = group.shortKg === 0 ? Math.floor(group.leftoverKg / cellNeed) : 0;
        const canFill = extra > 0 && emptyCells > 0;
        const fillCount = Math.min(extra, emptyCells);
        const open = openKey === key;

        return (
          <li key={key} className="rounded-sm border border-line px-3 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[14px] font-bold text-content">
                {specLabelOf(group.spec)}
                <span className="ml-2 font-medium text-content-soft">{group.cellNos.length}칸</span>
              </p>
              <p className={cn('text-[12.5px] font-semibold tabular-nums', group.shortKg > 0 ? 'text-rose-600' : 'text-content-soft')}>
                {group.shortKg > 0 ? `${group.shortKg.toFixed(1)}kg 부족` : `남음 ${group.leftoverKg.toFixed(1)}kg`}
              </p>
            </div>
            <p className="mt-1 text-[12.5px] tabular-nums text-content-faint">
              필요 {group.needKg.toFixed(1)}kg
              {group.shortKg === 0 ? ` · ${formatWon(group.amount)}` : ''}
            </p>

            <div className="mt-3 rounded-sm bg-surface-accent px-3 py-2.5">
              <p className="text-[11.5px] font-semibold text-content-faint">벌크 구매</p>
              {group.product && bulkLines.length > 0 ? (
                <>
                  <p className="mt-1 text-[13px] font-semibold text-content">{productTitle(group.product)}</p>
                  <p className="text-[12px] text-content-faint">{group.product.cattle.listingNo}</p>
                  <ul className="mt-2 space-y-1">
                    {bulkLines.map((line) => (
                      <LineRow key={line.slotNo} line={line} />
                    ))}
                  </ul>
                </>
              ) : (
                <p className="mt-1 text-[13px] text-content-soft">{group.error ?? '고른 벌크가 없어요.'}</p>
              )}
              {options.length > 0 ? (
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenKey(open ? null : key)}
                  className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-sm border border-line bg-surface text-[13px] font-semibold text-content hover:border-content-faint"
                >
                  {open ? '닫기' : '다른 벌크 고르기'}
                </button>
              ) : null}
            </div>

            {open ? (
              <ul className="mt-2 max-h-64 space-y-1.5 overflow-y-auto">
                {options.map((product) => {
                  const plan = planGiftSupply(product.zones, group.needKg, offers, { requireZone: true });
                  const active = group.product?.id === product.id;
                  return (
                    <li key={product.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onPick(key, product.id);
                          setOpenKey(null);
                        }}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 rounded-sm border px-3 py-2 text-left',
                          active ? 'border-ink' : 'border-line hover:border-content-faint',
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-semibold text-content">{productTitle(product)}</span>
                          <span className="mt-0.5 block text-[12px] text-content-faint">{product.cattle.listingNo}</span>
                          {plan.ok === true ? <span className="mt-0.5 block text-[12px] text-content-soft">{planCaption(plan)}</span> : null}
                        </span>
                        {plan.ok === true ? (
                          <span className="shrink-0 text-right">
                            <span className="block text-[13px] font-bold tabular-nums text-content">{formatWon(plan.amount)}</span>
                            <span className="mt-0.5 block text-[12px] tabular-nums text-content-soft">남음 {plan.leftoverKg.toFixed(1)}kg</span>
                          </span>
                        ) : (
                          <span className="shrink-0 text-[12px] font-semibold text-rose-600">{plan.ok === false ? `${plan.shortKg.toFixed(1)}kg 부족` : ''}</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            <div className="mt-2 rounded-sm border border-line-soft px-3 py-2.5">
              <p className="text-[11.5px] font-semibold text-content-faint">1kg 구매</p>
              {kgLines.length > 0 ? (
                <ul className="mt-1.5 space-y-1">
                  {kgLines.map((line) => (
                    <LineRow key={line.poolId} line={line} />
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-[13px] text-content-soft">필요 없어요.</p>
              )}
            </div>

            {canFill ? (
              <button type="button" onClick={() => onFillLeftover(group)} className="mt-3 text-[12.5px] font-semibold text-content underline">
                남는 양으로 {fillCount}칸 더 담기
              </button>
            ) : group.leftoverKg > 0 ? (
              <p className="mt-3 text-[12.5px] text-content-faint">남는 양은 주문서에서 집 또는 매장으로 받습니다.</p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function LineRow({ line }: { line: GiftSupplyLine }) {
  return (
    <li className="flex items-baseline justify-between gap-3 text-[13px]">
      <span className="min-w-0 truncate text-content-mid">{line.kind === 'kg' ? line.label.replace(/^1kg 구매 · /, '') : line.label.replace(/^벌크 · /, '')}</span>
      <span className="shrink-0 tabular-nums">
        <span className="font-semibold text-content">{line.kg.toFixed(line.kind === 'kg' ? 0 : 1)}kg</span>
        <span className="ml-2 font-semibold text-content">{formatWon(line.amount)}</span>
      </span>
    </li>
  );
}

function planCaption(plan: GiftSupplyPlan) {
  const parts = [plan.bulkKg > 0 ? `벌크 ${plan.bulkKg.toFixed(1)}kg` : null, plan.kg > 0 ? `1kg 구매 ${plan.kg}kg` : null].filter(Boolean);
  return parts.join(' + ');
}
