'use client';

import { X } from 'lucide-react';
import { PrimaryButton } from '../FormField';
import { KgStepper } from '../pools/KgStepper';
import { productTitle } from '../products/ProductTable';
import { lineAmount, slotLineAmount, sumLineAmount, sumSlotAmount, type OrderLine, type SlotLine } from '../../lib/cartStore';
import { clampKg, poolTitle } from '../../lib/pools';
import { formatPickup } from '../../lib/stores';
import { formatWon } from '../../lib/slots';
import type { PickupSelection } from './PickupScheduler';

/** 상품 단계 오른쪽 요약 · 이번 방문에 담은 벌크·1kg */
export function StoreVisitSummary({
  pickup,
  slotLines,
  kgLines,
  onRemoveSlot,
  onKg,
  onRemoveKg,
  onOrder,
  onBack,
}: {
  pickup: PickupSelection;
  slotLines: SlotLine[];
  kgLines: OrderLine[];
  onRemoveSlot: (productId: string, slotNo: number) => void;
  onKg: (poolId: string, kg: number) => void;
  onRemoveKg: (poolId: string) => void;
  onOrder: () => void;
  onBack: () => void;
}) {
  const bulkAmount = sumSlotAmount(slotLines);
  const kgAmount = sumLineAmount(kgLines);
  const total = bulkAmount + kgAmount;
  const count = slotLines.length + kgLines.length;

  return (
    <aside className="sticky top-24 flex h-[calc(100dvh-120px)] min-h-[480px] flex-col">
      <section className="flex h-full min-h-0 flex-col rounded-sm border border-line bg-surface">
        <div className="shrink-0 border-b border-line bg-surface-accent px-5 py-4">
          <h2 className="text-[15px] font-bold text-content">주문 요약</h2>
          <p className="mt-1 text-[13px] font-semibold text-content">{pickup.store.name}</p>
          <p className="text-[12.5px] tabular-nums text-content-soft">{formatPickup(pickup.pickupAt)}</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5">
          {count === 0 ? (
            <p className="mt-4 rounded-sm bg-surface-accent px-4 py-6 text-center text-[13.5px] leading-relaxed text-content-soft">
              표에서 구좌나 1kg를 누르면
              <br />
              여기에 담겨요.
            </p>
          ) : (
            <ul className="mt-4 space-y-3 pb-3">
              {slotLines.map((line) => (
                <li key={`${line.product.id}-${line.zone.slotNo}`} className="border-t border-line-soft pt-3 first:border-t-0 first:pt-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 text-[13.5px] font-bold text-content">
                      {productTitle(line.product)} {line.zone.label}
                    </p>
                    <button
                      type="button"
                      onClick={() => onRemoveSlot(line.product.id, line.zone.slotNo)}
                      className="shrink-0 text-content-faint hover:text-content"
                      aria-label="빼기"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="min-w-0">
                      <span className="font-bold text-content">벌크</span>
                      <span className="text-content-soft">
                        {' '}
                        {formatWon(line.zone.pricePerKg)} × {line.zone.kg.toFixed(1)}kg
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums text-content">{formatWon(slotLineAmount(line))}</span>
                  </div>
                </li>
              ))}
              {kgLines.map((line) => (
                <li key={line.pool.id} className="border-t border-line-soft pt-3 first:border-t-0 first:pt-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 text-[13.5px] font-bold text-content">{poolTitle(line.pool)}</p>
                    <button type="button" onClick={() => onRemoveKg(line.pool.id)} className="shrink-0 text-content-faint hover:text-content" aria-label="빼기">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <KgStepper
                      value={line.kg}
                      min={Math.max(line.pool.minKg, 1)}
                      max={line.pool.maxKg}
                      size="sm"
                      onChange={(kg) => onKg(line.pool.id, clampKg(line.pool, kg))}
                    />
                    <span className="text-right">
                      <span className="block text-[12px] text-content-soft">1kg {formatWon(line.pool.pricePerKg)} × {line.kg}kg</span>
                      <span className="block font-semibold tabular-nums text-content">{formatWon(lineAmount(line))}</span>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="shrink-0 border-t border-line px-5 py-4">
          <dl className="space-y-1.5 text-[13px]">
            {bulkAmount > 0 ? (
              <div className="flex justify-between">
                <dt className="text-content-soft">벌크</dt>
                <dd className="font-semibold tabular-nums text-content">{formatWon(bulkAmount)}</dd>
              </div>
            ) : null}
            {kgAmount > 0 ? (
              <div className="flex justify-between">
                <dt className="text-content-soft">1kg</dt>
                <dd className="font-semibold tabular-nums text-content">{formatWon(kgAmount)}</dd>
              </div>
            ) : null}
            <div className="flex items-baseline justify-between pt-1">
              <dt className="text-[14px] font-bold text-content">총금액</dt>
              <dd className="text-[20px] font-bold tabular-nums tracking-[-0.02em] text-content">{formatWon(total)}</dd>
            </div>
          </dl>
          <PrimaryButton className="mt-4 rounded-sm" disabled={count === 0} onClick={onOrder}>
            주문하기
          </PrimaryButton>
          <button type="button" onClick={onBack} className="mt-3 w-full text-[13px] font-medium text-content-faint hover:text-content-mid">
            이전
          </button>
        </div>
      </section>
    </aside>
  );
}
