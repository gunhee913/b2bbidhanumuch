'use client';

import { cn } from '@/lib/utils';
import { PrimaryButton } from '../FormField';
import { GIFT_LEFTOVER_NOTICE, type GiftLeftoverMode } from '../../lib/gift';
import { specKeyOf, specLabelOf, type GiftAutoGroup } from '../../lib/giftAuto';
import { LeftoverModePicker } from './LeftoverModePicker';
import { formatWon } from '../../lib/slots';

/** 상품 단계 오른쪽 요약 · 벌크구매 주문 패널과 같은 자리 */
export function GiftOrderSummary({
  quantity,
  groups,
  packAmount,
  meatAmount,
  ready,
  short,
  leftoverModes,
  onLeftoverMode,
  onOrder,
  onBack,
}: {
  quantity: number;
  groups: GiftAutoGroup[];
  packAmount: number;
  meatAmount: number;
  ready: boolean;
  short: boolean;
  leftoverModes: Record<string, GiftLeftoverMode>;
  onLeftoverMode: (specKey: string, mode: GiftLeftoverMode) => void;
  onOrder: () => void;
  onBack: () => void;
}) {
  const ordered = [...groups].sort((a, b) => Math.min(...a.cellNos) - Math.min(...b.cellNos));
  const bulkAmount = ordered.reduce((acc, group) => acc + group.lines.filter((line) => line.kind === 'bulk').reduce((sum, line) => sum + line.amount, 0), 0);
  const kgAmount = ordered.reduce((acc, group) => acc + group.lines.filter((line) => line.kind === 'kg').reduce((sum, line) => sum + line.amount, 0), 0);
  const usedKg = ordered.reduce((acc, group) => acc + group.usedKg, 0);
  const leftovers = ordered.filter((group) => group.leftoverKg > 0);
  const modeOf = (group: GiftAutoGroup): GiftLeftoverMode => leftoverModes[specKeyOf(group.spec)] ?? 'separate';
  const separateKg = leftovers.reduce((acc, group) => acc + (modeOf(group) === 'separate' ? group.leftoverKg : 0), 0);
  const packedKg = leftovers.reduce((acc, group) => acc + (modeOf(group) === 'pack' ? group.leftoverKg : 0), 0);
  const total = meatAmount + packAmount;

  return (
    <aside className="sticky top-24 flex h-[calc(100dvh-120px)] min-h-[480px] flex-col">
      <section className="flex h-full min-h-0 flex-col rounded-sm border border-line bg-surface">
        <div className="shrink-0 border-b border-line bg-surface-accent px-5 py-4">
          <h2 className="text-[15px] font-bold text-content">주문 요약</h2>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5">
        {ordered.length === 0 ? (
          <p className="mt-4 rounded-sm bg-surface-accent px-4 py-6 text-center text-[13.5px] leading-relaxed text-content-soft">구성에서 부위를 담으면 여기에 모아 보여요.</p>
        ) : (
          <ul className="mt-4 space-y-3 pb-3">
            {ordered.map((group) => (
              <li key={group.cellNos.join('-')} className="border-t border-line-soft pt-3 first:border-t-0 first:pt-0">
                <div className="flex items-center gap-2">
                  {group.cellNos.map((cellNo) => (
                    <span key={cellNo} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-content text-[12px] font-bold text-white">
                      {cellNo}
                    </span>
                  ))}
                  <p className="min-w-0 truncate text-[13.5px] font-bold text-content">{specLabelOf(group.spec)}</p>
                </div>
                {group.lines.length > 0 ? (
                  <ul className="mt-1.5 space-y-1">
                    {group.lines.map((line) => (
                      <li key={`${line.kind}-${line.productId ?? ''}-${line.slotNo ?? line.poolId}`} className="flex items-baseline justify-between gap-3 text-[13px]">
                        <span className="min-w-0">
                          <span className="font-bold text-content">{line.kind === 'bulk' ? '벌크' : '1kg'}</span>
                          <span className="text-content-soft"> {formatWon(line.pricePerKg)} × {line.kg.toFixed(1)}kg</span>
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums text-content">{formatWon(line.amount)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-[12.5px] text-rose-600">{group.error ?? '중량이 부족해요'}</p>
                )}
              </li>
            ))}
          </ul>
        )}
        {leftovers.length > 0 ? (
          <div className="border-t border-line-soft pb-4 pt-3">
            <p className="text-[13px] font-bold text-content">남는 부위 (예상)</p>
            <ul className="mt-1.5 space-y-3">
              {leftovers.map((group) => {
                const key = specKeyOf(group.spec);
                const mode = modeOf(group);
                return (
                  <li key={`left-${group.cellNos.join('-')}`}>
                    <div className="flex items-baseline justify-between gap-3 text-[13px]">
                      <span className="min-w-0 truncate text-content">{specLabelOf(group.spec)}</span>
                      <span className="shrink-0 font-semibold tabular-nums text-content">{group.leftoverKg.toFixed(1)}kg</span>
                    </div>
                    <LeftoverModePicker className="mt-1.5" value={mode} onChange={(next) => onLeftoverMode(key, next)} />
                    {mode === 'pack' ? (
                      <p className="mt-1 text-[12px] text-content-faint">세트당 {(group.leftoverKg / Math.max(1, quantity)).toFixed(1)}kg</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
        </div>

        <div className="shrink-0 border-t border-line-soft px-5 py-4">
          {leftovers.length > 0 ? (
            <div className="mb-3 space-y-1.5 border-b border-line-soft pb-3 text-[13px]">
              {packedKg > 0 ? (
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-bold text-content">세트에 담기 (예상)</span>
                  <span className="font-semibold tabular-nums text-content">{packedKg.toFixed(1)}kg</span>
                </div>
              ) : null}
              {separateKg > 0 ? (
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-bold text-content">따로 받기 (예상)</span>
                  <span className="font-semibold tabular-nums text-content">{separateKg.toFixed(1)}kg</span>
                </div>
              ) : null}
              <p className="text-[12px] leading-snug text-content-faint">{GIFT_LEFTOVER_NOTICE}</p>
            </div>
          ) : null}
          <dl className="space-y-1.5 text-[13px]">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="font-bold text-content">벌크</dt>
              <dd className="font-semibold tabular-nums text-content">{formatWon(bulkAmount)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="font-bold text-content">1kg</dt>
              <dd className="font-semibold tabular-nums text-content">{formatWon(kgAmount)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-content-mid">포장비 {formatWon(packAmount / Math.max(1, quantity))} × {quantity}세트</dt>
              <dd className="font-semibold tabular-nums text-content">{formatWon(packAmount)}</dd>
            </div>
          </dl>
          <div className="mt-2 flex items-baseline justify-between border-t border-dashed border-line-soft pt-2">
            <span className="text-[13px] font-semibold text-content-mid">총금액</span>
            <span className={cn('text-[22px] font-bold tabular-nums tracking-[-0.02em]', short ? 'text-rose-600' : 'text-content')}>{formatWon(total)}</span>
          </div>
          <p className="mt-1 flex items-baseline justify-end gap-3 text-[12.5px] tabular-nums text-content-mid">
            <span>세트당 {formatWon(total / Math.max(1, quantity))}</span>
            {usedKg > 0 ? <span>kg당 {formatWon(total / usedKg)}</span> : null}
          </p>
          {short ? <p className="mt-2 text-[12.5px] text-rose-600">중량이 부족한 칸이 있어요.</p> : null}
          <PrimaryButton className="mt-4 rounded-sm" disabled={!ready} onClick={onOrder}>
            주문하기
          </PrimaryButton>
          <button type="button" onClick={onBack} className="mt-2 inline-flex h-12 w-full items-center justify-center rounded-sm border border-line text-[14px] font-semibold text-content-soft hover:bg-surface-accent">
            이전
          </button>
        </div>
      </section>
    </aside>
  );
}
