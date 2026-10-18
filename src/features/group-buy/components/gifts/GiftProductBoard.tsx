'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { SmartImage } from '@/components/ui/smart-image';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ProductTable, ProductTableHead, productTitle } from '../products/ProductTable';
import { GIFT_CELL_KG, GIFT_TRIM_LOSS_RATE, roundKg, type GiftLeftoverMode } from '../../lib/gift';
import { LeftoverModePicker } from './LeftoverModePicker';
import { productMatchesSpec, specKeyOf, specLabelOf, type GiftAutoGroup } from '../../lib/giftAuto';
import { type GiftPoolSource, type GiftSupplyLine } from '../../lib/giftSupply';
import { formatWon } from '../../lib/slots';
import type { ConsumerProduct } from '../../types';

const FALLBACK = 'https://picsum.photos/seed/hanwoo-gift-bulk/240/180';
const KG_FALLBACK = 'https://picsum.photos/seed/hanwoo-gift-kg/240/180';

/** 구성 칸의 구매를 위에서부터 한 줄로 보여준다. 다른 벌크는 표에서 구좌 단위로 담는다 */
export function GiftProductBoard({
  groups,
  products,
  quantity,
  emptyCells,
  onToggleBulk,
  onKg,
  onFillLeftover,
  leftoverModes,
  onLeftoverMode,
}: {
  groups: GiftAutoGroup[];
  products: ConsumerProduct[];
  pools: GiftPoolSource[];
  quantity: number;
  emptyCells: number;
  onToggleBulk: (specKey: string, productId: string, slotNo: number) => void;
  onKg: (specKey: string, kg: number) => void;
  onFillLeftover: (group: GiftAutoGroup) => void;
  leftoverModes: Record<string, GiftLeftoverMode>;
  onLeftoverMode: (specKey: string, mode: GiftLeftoverMode) => void;
}) {
  const [tableKey, setTableKey] = useState<string | null>(null);
  const cellNeed = roundKg(GIFT_CELL_KG * Math.max(1, quantity));
  const tableGroup = groups.find((group) => specKeyOf(group.spec) === tableKey) ?? null;
  const ordered = [...groups].sort((a, b) => Math.min(...a.cellNos) - Math.min(...b.cellNos));

  if (groups.length === 0) {
    return <p className="text-[13px] text-content-soft">구성에서 부위와 등급을 먼저 골라주세요.</p>;
  }

  return (
    <>
      <ul className="space-y-6">
        {ordered.map((group) => {
          const key = specKeyOf(group.spec);
          const bulkLines = group.lines.filter((line) => line.kind === 'bulk');
          const extra = group.shortKg === 0 ? Math.floor(group.leftoverKg / cellNeed) : 0;
          const canFill = extra > 0 && emptyCells > 0;
          const fillCount = Math.min(extra, emptyCells);
          const gap = roundKg(group.usedKg - group.needKg);
          const gapHint = gap > 0 ? '남음' : gap < 0 ? '필요' : '맞춤';
          const options = products.filter((product) => productMatchesSpec(product, group.spec));

          return (
            <li key={key} className="overflow-hidden rounded-sm border border-line bg-surface">
              <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-accent px-4 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  {group.cellNos.map((cellNo) => (
                    <span key={cellNo} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-content text-[13px] font-bold text-white">
                      {cellNo}
                    </span>
                  ))}
                  <p className="truncate text-[15px] font-bold text-content">{specLabelOf(group.spec)}</p>
                </div>
                <p className="shrink-0 text-right">
                  <span className="block text-[11px] font-semibold text-content-faint">합계</span>
                  <span className={cn('text-[15px] font-bold tabular-nums tracking-tight', group.shortKg > 0 ? 'text-rose-600' : 'text-content')}>{formatWon(group.amount)}</span>
                </p>
              </div>
              <div className="px-4 pb-4">
              <div className="mt-3 grid grid-cols-3 divide-x divide-line overflow-hidden rounded-sm border border-line">
                <WeightStat label="필요 중량" value={`${group.needKg.toFixed(1)}kg`} />
                <WeightStat label="구성 중량" value={`${group.usedKg.toFixed(1)}kg`} />
                <WeightStat label="남는(필요) 중량" value={`${gapHint} ${Math.abs(gap).toFixed(1)}kg`} warn={gap < 0} />
              </div>
              <p className="mt-2 text-[12px] leading-snug text-content-faint">근막 제거로 중량 {Math.round(GIFT_TRIM_LOSS_RATE * 100)}%를 빼고 구성해요.</p>
              {group.leftoverKg > 0 ? (
                <LeftoverModePicker
                  className="mt-2"
                  value={leftoverModes[key] ?? 'separate'}
                  onChange={(mode) => onLeftoverMode(key, mode)}
                />
              ) : null}

              <div className="mt-3 space-y-2">
                {bulkLines.length > 0 ? (
                  bulkLines.map((line) => {
                    const product = products.find((item) => item.id === line.productId) ?? group.product;
                    if (!product || line.slotNo == null) return null;
                    return (
                      <BulkCard
                        key={`${product.id}-${line.slotNo}`}
                        product={product}
                        line={line}
                        onRemove={() => onToggleBulk(key, product.id, line.slotNo!)}
                      />
                    );
                  })
                ) : (
                  <p className="rounded-sm bg-surface-accent px-3 py-3 text-[13px] text-content-soft">{group.kg > 0 ? '고른 벌크가 없어요.' : (group.error ?? '고른 벌크가 없어요.')}</p>
                )}
                {options.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setTableKey(key)}
                    className="flex h-10 w-full items-center justify-center rounded-sm border border-line text-[13px] font-semibold text-content hover:bg-surface-accent"
                  >
                    벌크 상품추가
                  </button>
                ) : null}

              {group.kgMax > 0 && bulkLines.length > 0 ? (
                <div className="flex justify-center py-2 text-content-faint" aria-hidden>
                  <Plus className="h-5 w-5" strokeWidth={2.5} />
                </div>
              ) : null}

              {group.kgMax > 0 ? (
                <div className={bulkLines.length > 0 ? undefined : 'mt-3'}>
                  <KgCard
                    name={group.kgLabel ?? '1kg 구매'}
                    image={group.kgImage ?? KG_FALLBACK}
                    kg={group.kg}
                    pricePerKg={group.kgPrice}
                    maxKg={group.kgMax}
                    onChange={(next) => onKg(key, next)}
                  />
                </div>
              ) : null}

              {canFill ? (
                <button type="button" onClick={() => onFillLeftover(group)} className="mt-3 text-[12.5px] font-semibold text-content underline">
                  남는 양으로 {fillCount}칸 더 담기
                </button>
              ) : null}
              </div>
              </div>
            </li>
          );
        })}
      </ul>

      <Dialog open={!!tableGroup} onOpenChange={(open) => { if (!open) setTableKey(null); }}>
        <DialogContent className="max-h-[86vh] w-[calc(100vw-2rem)] max-w-[1080px] overflow-y-auto">
          {tableGroup ? (
            <BulkTable
              group={tableGroup}
              products={products.filter((product) => productMatchesSpec(product, tableGroup.spec) && !groups.some((item) => item !== tableGroup && item.bulks.some((bulk) => bulk.productId === product.id)))}
              onToggle={(productId, slotNo) => onToggleBulk(specKeyOf(tableGroup.spec), productId, slotNo)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function BulkTable({
  group,
  products,
  onToggle,
}: {
  group: GiftAutoGroup;
  products: ConsumerProduct[];
  onToggle: (productId: string, slotNo: number) => void;
}) {
  const pickedSlots = Object.fromEntries(group.bulks.map((bulk) => [bulk.productId, bulk.slotNos]));
  return (
    <>
      <DialogHeader>
        <DialogTitle>{specLabelOf(group.spec)} 벌크</DialogTitle>
        <DialogDescription>구좌를 누르면 담고, 다시 누르면 뺍니다. 1kg 없이 벌크만으로 맞출 수도 있어요.</DialogDescription>
      </DialogHeader>
      {products.length === 0 ? (
        <p className="text-[13px] text-content-soft">이 부위·등급으로 고를 벌크가 없어요.</p>
      ) : (
        <div>
          <ProductTableHead />
          <ProductTable
            products={products}
            selectedSlots={[]}
            pickedSlots={pickedSlots}
            detailNewTab
            onSelect={() => undefined}
            onToggleZone={(product, zone) => {
              if (zone.sold) return;
              onToggle(product.id, zone.slotNo);
            }}
          />
        </div>
      )}
    </>
  );
}

function WeightStat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="px-1.5 py-2.5 text-center">
      <p className="text-[11px] font-semibold leading-tight text-content-faint">{label}</p>
      <p className={cn('mt-1 text-[15px] font-bold tabular-nums tracking-tight', warn ? 'text-rose-600' : 'text-content')}>{value}</p>
    </div>
  );
}

function BulkCard({ product, line, onRemove }: { product: ConsumerProduct; line: GiftSupplyLine; onRemove: () => void }) {
  const zone = product.zones.find((item) => item.slotNo === line.slotNo);
  const zoneLabel = line.label.replace(/^벌크 · /, '').replace(product.partName, '').trim() || zone?.label || line.label;
  return (
    <article className="overflow-hidden rounded-sm border border-line bg-surface">
      <div className="flex items-center justify-between bg-content px-2.5 py-1.5 text-white">
        <p className="text-[12px] font-bold">벌크</p>
        <p className="text-[11px] font-semibold text-white/80">구좌 1개</p>
      </div>
      <div className="flex gap-3 px-2.5 py-2.5">
      <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-sm bg-surface-accent">
        <SmartImage src={product.images[0] ?? FALLBACK} alt={productTitle(product)} fill fallbackSrc={FALLBACK} className="object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-[13.5px] font-bold text-content">{productTitle(product)}</p>
          <Link
            href={`/group-buy/products/${product.id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-7 items-center rounded-sm border border-line px-2 text-[12px] font-semibold text-content hover:bg-surface-accent"
          >
            상세
          </Link>
        </div>
        <p className="mt-0.5 text-[12px] text-content-soft">
          {zoneLabel} · {product.cattle.listingNo}
        </p>
        <p className="mt-1 text-[12px] tabular-nums text-content-soft">{formatWon(zone?.pricePerKg ?? product.pricePerKg)}/kg</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-[13.5px] font-bold tabular-nums text-content">
            {line.kg.toFixed(1)}kg
            <span className="ml-2">{formatWon(line.amount)}</span>
          </p>
          <button type="button" aria-label="이 벌크 빼기" onClick={onRemove} className="flex h-8 w-8 items-center justify-center text-content-soft hover:text-content">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      </div>
    </article>
  );
}

function KgCard({
  name,
  image,
  kg,
  pricePerKg,
  maxKg,
  onChange,
}: {
  name: string;
  image: string;
  kg: number;
  pricePerKg: number;
  maxKg: number;
  onChange: (kg: number) => void;
}) {
  return (
    <article className="overflow-hidden rounded-sm border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line bg-surface-accent px-2.5 py-1.5">
        <p className="text-[12px] font-bold text-content">1kg</p>
        <p className="text-[11px] font-semibold text-content-soft">단위 구매</p>
      </div>
      <div className="flex gap-3 px-2.5 py-2.5">
      <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-sm bg-surface-accent">
        <SmartImage src={image} alt={name} fill fallbackSrc={KG_FALLBACK} className="object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-bold text-content">{name}</p>
        <p className="mt-1 text-[12px] tabular-nums text-content-soft">{formatWon(pricePerKg)}/kg</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="1kg 줄이기"
              disabled={kg <= 0}
              onClick={() => onChange(kg - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-sm border border-line text-content disabled:text-content-faint"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-10 text-center text-[14px] font-bold tabular-nums text-content">{kg}개</span>
            <button
              type="button"
              aria-label="1kg 늘리기"
              disabled={kg >= maxKg}
              onClick={() => onChange(kg + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-sm border border-line text-content disabled:text-content-faint"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            type="button"
            aria-label="1kg 삭제"
            disabled={kg <= 0}
            onClick={() => onChange(0)}
            className="flex h-8 w-8 items-center justify-center text-content-soft hover:text-content disabled:text-content-faint"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 text-[13.5px] font-bold tabular-nums text-content">
          {kg}kg
          <span className="ml-2">{formatWon(pricePerKg * kg)}</span>
        </p>
      </div>
      </div>
    </article>
  );
}
