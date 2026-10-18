'use client';

import { cn } from '@/lib/utils';
import { PrimaryButton } from '../FormField';
import { GIFT_TRAY_META, type GiftCellCount } from '../../lib/gift';
import type { GiftSupplyLine } from '../../lib/giftSupply';
import { formatWon } from '../../lib/slots';
import type { ConsumerProduct } from '../../types';

export type GiftPlanLine =
  | { productId: string; ok: true; title: string; product?: ConsumerProduct; needKg: number; usedKg: number; leftoverKg: number; amount: number; lines: GiftSupplyLine[] }
  | { productId: string; ok: false; error: string; needKg: number; usedKg: number; leftoverKg: number; product?: ConsumerProduct };

/** 견적 확인 · 구좌·남는 양·금액을 보고 주문서로 간다 */
export function GiftQuote({
  cellCount,
  quantity,
  plan,
  setKg,
  usedKg,
  leftoverKg,
  packAmount,
  meatAmount,
  ready,
  hydrated,
  onOrder,
}: {
  cellCount: GiftCellCount;
  quantity: number;
  plan: GiftPlanLine[];
  setKg: number;
  usedKg: number;
  leftoverKg: number;
  packAmount: number;
  meatAmount: number;
  ready: boolean;
  hydrated: boolean;
  onOrder: () => void;
}) {
  return (
    <section className="rounded-sm border border-line bg-surface p-5">
      <h2 className="text-[15px] font-bold text-content">견적</h2>
      <p className="mt-1 text-[13px] text-content-soft">
        {GIFT_TRAY_META[cellCount].title} · 같은 구성 {quantity}세트
      </p>

      <h3 className="mt-5 text-[13px] font-bold text-content">구매 내역</h3>
      {plan.length === 0 ? (
        <p className="mt-2 text-[13px] text-content-soft">칸에 부위를 담으면 쓰는 양과 남는 양이 나와요.</p>
      ) : (
        <>
          <ul className="mt-2 space-y-2">
            {plan.map((line) => (
              <li key={line.productId} className="rounded-sm bg-surface-accent px-3 py-2">
                <p className={cn('text-[13px] font-semibold', line.ok ? 'text-content' : 'text-rose-600')}>
                  {line.ok === false ? line.error : line.title}
                </p>
                {line.ok === true ? (
                  <div className="mt-1 space-y-0.5">
                    {line.lines.map((item) => (
                      <p key={`${item.kind}-${item.slotNo ?? item.poolId}`} className="flex justify-between gap-3 text-[12.5px] tabular-nums text-content-soft">
                        <span>
                          {item.label} {item.kg.toFixed(1)}kg
                        </span>
                        <span className="font-semibold text-content">{formatWon(item.amount)}</span>
                      </p>
                    ))}
                    <p className="text-[12.5px] tabular-nums text-content-faint">남음 {line.leftoverKg.toFixed(1)}kg</p>
                  </div>
                ) : (
                  <p className="mt-0.5 text-[12.5px] text-rose-600">세트 {line.needKg.toFixed(1)}kg 이 필요해요</p>
                )}
              </li>
            ))}
          </ul>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-sm border border-line-soft px-2 py-2">
              <dt className="text-[11.5px] text-content-faint">세트에 담기</dt>
              <dd className="mt-0.5 text-[15px] font-bold tabular-nums text-content">{setKg.toFixed(1)}kg</dd>
            </div>
            <div className="rounded-sm border border-line-soft px-2 py-2">
              <dt className="text-[11.5px] text-content-faint">구매 중량</dt>
              <dd className="mt-0.5 text-[15px] font-bold tabular-nums text-content">{usedKg.toFixed(1)}kg</dd>
            </div>
            <div className="rounded-sm border border-line-soft px-2 py-2">
              <dt className="text-[11.5px] text-content-faint">남는 양</dt>
              <dd className="mt-0.5 text-[15px] font-bold tabular-nums text-content">{leftoverKg.toFixed(1)}kg</dd>
            </div>
          </dl>
          {leftoverKg > 0 ? (
            <p className="mt-2 text-[12.5px] leading-relaxed text-content-mid">남는 양은 주문서에서 집 또는 매장으로 받으실 수 있어요.</p>
          ) : null}
        </>
      )}

      <h3 className="mt-5 text-[13px] font-bold text-content">예상 금액</h3>
      {plan.length > 0 ? (
        <ul className="mt-2 space-y-1.5 text-[13px]">
          {plan.map((line) => (
            <li key={line.productId} className="flex justify-between gap-3">
              <span className="text-content-soft">
                {line.ok ? line.title : '부위'} {line.ok === false ? line.needKg.toFixed(1) : line.usedKg.toFixed(1)}kg
              </span>
              <span className={cn('tabular-nums font-semibold', line.ok ? 'text-content' : 'text-rose-600')}>
                {line.ok === false ? line.error : formatWon(line.amount)}
              </span>
            </li>
          ))}
          <li className="flex justify-between">
            <span className="text-content-soft">포장비 × {quantity}</span>
            <span className="font-semibold tabular-nums text-content">{formatWon(packAmount)}</span>
          </li>
        </ul>
      ) : (
        <p className="mt-2 text-[13px] text-content-soft">칸을 채우면 금액이 나와요.</p>
      )}
      <div className="mt-4 flex items-baseline justify-between border-t border-line-soft pt-4">
        <span className="text-[14px] font-bold">합계</span>
        <span className="text-[22px] font-bold tabular-nums">{plan.length > 0 && plan.every((l) => l.ok) ? formatWon(meatAmount + packAmount) : '—'}</span>
      </div>
      <PrimaryButton className="mt-4 rounded-sm" disabled={!hydrated || !ready} onClick={onOrder}>
        주문하기
      </PrimaryButton>
    </section>
  );
}
