'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingBag, X } from 'lucide-react';
import { SmartImage } from '@/components/ui/smart-image';
import { GroupBuyShell } from '@/features/group-buy/components/GroupBuyShell';
import { EmptyState, Skeleton } from '@/features/group-buy/components/primitives';
import { PrimaryButton } from '@/features/group-buy/components/FormField';
import { KgStepper } from '@/features/group-buy/components/pools/KgStepper';
import { ReceiveMethodOption } from '@/features/group-buy/components/pools/ReceiveMethodOption';
import { TrimSliceOption } from '@/features/group-buy/components/pools/TrimSliceOption';
import { productTitle } from '@/features/group-buy/components/products/ProductTable';
import { useConsumerPools, useConsumerProducts } from '@/features/group-buy/hooks';
import {
  joinCartLines,
  joinSlotLines,
  lineAmount,
  slotLineAmount,
  sumLineAmount,
  sumSlotAmount,
  useHydrateKgCart,
  useKgCart,
  type OrderLine,
  type SlotLine,
} from '@/features/group-buy/lib/cartStore';
import { TRIM_SLICE_LABEL, poolTitle, unitPriceOf } from '@/features/group-buy/lib/pools';
import { RECEIVE_METHOD_LABELS, allowsTrimAndSlice, isDineIn } from '@/features/group-buy/lib/receive';
import { formatWon } from '@/features/group-buy/lib/slots';

const FALLBACK_THUMB = 'https://picsum.photos/seed/hanwoo-thumb/96/96';
const CHECKOUT_HREF = '/group-buy/checkout';
const CELL = 'border border-line-soft px-4 text-[15px] font-semibold tabular-nums whitespace-nowrap';
const HEAD = 'border border-line-soft border-b-line bg-surface-accent/60 px-4 py-3 text-[13.5px] font-semibold text-content-faint';

const slotLineTitle = (line: SlotLine) => `${productTitle(line.product)} ${line.zone.label}`;

/** 장바구니 · 공동구매 구좌와 1kg 구매를 모아 주문서로 넘긴다 · 배송지·결제는 주문서 페이지에서 */
export default function GroupBuyCartPage() {
  const router = useRouter();
  const cart = useKgCart();
  useHydrateKgCart();
  const { data: pools, isLoading: poolsLoading } = useConsumerPools();
  const { data: products, isLoading: productsLoading } = useConsumerProducts();

  const lines = useMemo(() => joinCartLines(cart.items, pools ?? []), [cart.items, pools]);
  const slotLines = useMemo(() => joinSlotLines(cart.slotItems, products ?? []), [cart.slotItems, products]);
  const count = lines.length + slotLines.length;
  const total = sumLineAmount(lines) + sumSlotAmount(slotLines);
  const isLoading = (poolsLoading && cart.items.length > 0) || (productsLoading && cart.slotItems.length > 0);

  // 지금 살아 있는 줄만 주문서로 넘긴다 · 마감됐거나 먼저 팔린 줄은 조용히 뺀다
  const checkout = () => {
    if (count === 0) return;
    cart.startCheckout({
      items: lines.map((l) => ({ poolId: l.pool.id, kg: l.kg, trimAndSlice: l.trimAndSlice, receiveMethod: l.receiveMethod })),
      slotItems: slotLines.map((l) => ({ productId: l.product.id, slotNo: l.zone.slotNo, trimAndSlice: l.trimAndSlice, receiveMethod: l.receiveMethod })),
      fromCart: true,
    });
    router.push(CHECKOUT_HREF);
  };

  return (
    <GroupBuyShell>
      <div className="flex items-end justify-between">
        <h1 className="text-[30px] font-bold leading-[1.2] tracking-[-0.03em] text-content">
          장바구니 {count > 0 ? <span className="text-content-soft">{count}</span> : null}
        </h1>
        {count > 0 ? (
          <button type="button" onClick={cart.clear} className="text-[13.5px] font-medium text-content-faint hover:text-content-mid">
            모두 비우기
          </button>
        ) : null}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        <section className="space-y-6 rounded-sm border border-line bg-surface p-4">
          {isLoading ? (
            <div className="space-y-1 py-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-sm" />
              ))}
            </div>
          ) : count === 0 ? (
            <EmptyState
              title="장바구니가 비어 있어요"
              description="벌크구매 표에서 받을 부위를 골라 담아보세요."
              action={
                <Link href="/group-buy/products" className="inline-flex h-11 items-center rounded-sm bg-ink px-5 text-[14px] font-bold text-white hover:bg-ink-hover">
                  부위 고르러 가기
                </Link>
              }
            />
          ) : (
            <>
              {slotLines.length > 0 ? <SlotLinesTable lines={slotLines} disabled={false} /> : null}
              {lines.length > 0 ? <KgLinesTable lines={lines} disabled={false} /> : null}
            </>
          )}
        </section>

        <aside className="lg:sticky lg:top-24">
          <section className="rounded-sm border border-line bg-surface p-5">
            <h2 className="text-[15px] font-bold text-content">주문 요약</h2>

            <ul className="mt-4 space-y-1.5 text-[13.5px]">
              {slotLines.map((line) => (
                <li key={`${line.product.id}-${line.zone.slotNo}`} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 text-content-mid">
                    <span className="block truncate">
                      {productTitle(line.product)} <span className="text-content-faint">{line.zone.label} · {line.zone.kg.toFixed(1)}kg</span>
                    </span>
                    {line.trimAndSlice || isDineIn(line.receiveMethod) ? (
                      <span className="block text-[12px] text-content-faint">
                        {[line.trimAndSlice ? TRIM_SLICE_LABEL : null, isDineIn(line.receiveMethod) ? RECEIVE_METHOD_LABELS.dine_in : null].filter(Boolean).join(' · ')}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-content">{formatWon(slotLineAmount(line))}</span>
                </li>
              ))}
              {lines.map((line) => (
                <li key={line.pool.id} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 text-content-mid">
                    <span className="truncate">
                      {poolTitle(line.pool)} <span className="text-content-faint">× {line.kg}kg</span>
                    </span>
                    {line.trimAndSlice || isDineIn(line.receiveMethod) ? (
                      <span className="block text-[12px] text-content-faint">
                        {[line.trimAndSlice ? TRIM_SLICE_LABEL : null, isDineIn(line.receiveMethod) ? RECEIVE_METHOD_LABELS.dine_in : null].filter(Boolean).join(' · ')}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-content">{formatWon(lineAmount(line))}</span>
                </li>
              ))}
              {count === 0 ? <li className="text-content-faint">담긴 부위가 없어요.</li> : null}
            </ul>

            <div className="mt-4 flex items-baseline justify-between border-t border-line-soft pt-3">
              <span className="text-[13px] font-semibold text-content-mid">총 {count}건</span>
              <span className="text-[22px] font-bold tabular-nums tracking-[-0.02em] text-content">{formatWon(total)}</span>
            </div>

            <PrimaryButton className="mt-3 rounded-sm" onClick={checkout} disabled={count === 0}>
              <ShoppingBag className="mr-1.5 h-4 w-4" />
              {count > 0 ? `${count}건 주문하기` : '주문하기'}
            </PrimaryButton>
            <p className="mt-2.5 text-center text-[12px] leading-relaxed text-content-faint">다음 단계에서 배송지를 확인하고 결제합니다.</p>
          </section>
        </aside>
      </div>
    </GroupBuyShell>
  );
}

interface SlotLinesTableProps {
  lines: SlotLine[];
  disabled: boolean;
}

/** 공동구매 구좌 줄 · 상품 × 상단/중단/하단 · 손질 옵션·수령 방식은 표 안에서 바로 고친다 */
function SlotLinesTable({ lines, disabled }: SlotLinesTableProps) {
  const cart = useKgCart();
  return (
    <div>
      <h2 className="mb-2 text-[13.5px] font-bold text-content-mid">벌크구매</h2>
      <table className="w-full table-fixed border-collapse border border-line">
        <colgroup>
          <col className="w-[26%]" />
          <col className="w-[8%]" />
          <col className="w-[13%]" />
          <col className="w-[9%]" />
          <col className="w-[26%]" />
          <col className="w-[13%]" />
          <col className="w-[5%]" />
        </colgroup>
        <thead>
          <tr>
            <th className={`${HEAD} text-left`}>상품정보</th>
            <th className={`${HEAD} text-center`}>위치</th>
            <th className={`${HEAD} text-right`}>kg당 가격</th>
            <th className={`${HEAD} text-right`}>중량</th>
            <th className={`${HEAD} text-left`}>옵션</th>
            <th className={`${HEAD} text-right`}>금액</th>
            <th className={HEAD} aria-label="빼기" />
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const { product, zone, trimAndSlice, receiveMethod } = line;
            return (
              <tr key={`${product.id}-${zone.slotNo}`} className="h-[72px]">
                <td className={CELL}>
                  <div className="flex items-center gap-3">
                    <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-sm bg-surface-accent">
                      <SmartImage src={product.images[0] ?? FALLBACK_THUMB} alt="" fill fallbackSrc={FALLBACK_THUMB} className="object-cover" />
                    </span>
                    <span className="min-w-0">
                      <Link href={`/group-buy/products/${product.id}`} className="block truncate text-content hover:underline">
                        {productTitle(product)}
                      </Link>
                      <span className="block truncate text-[12px] font-medium text-content-faint">
                        {product.cattle.listingNo}
                        {product.cattle.slaughterHouse ? ` · ${product.cattle.slaughterHouse}` : ''}
                      </span>
                    </span>
                  </div>
                </td>
                <td className={`${CELL} text-center text-[13.5px] text-content-mid`}>{zone.label}</td>
                <td className={`${CELL} text-right text-content`}>
                  {formatWon(unitPriceOf(zone.pricePerKg, trimAndSlice))}
                  {trimAndSlice ? <span className="block text-[11.5px] font-medium text-content-faint">옵션 포함</span> : null}
                </td>
                <td className={`${CELL} text-right text-content`}>{zone.kg.toFixed(1)}kg</td>
                <td className={`${CELL} space-y-1.5 py-2`}>
                  <ReceiveMethodOption value={receiveMethod} onChange={(m) => cart.setSlotReceiveMethod(product.id, zone.slotNo, m)} disabled={disabled} size="sm" />
                  {allowsTrimAndSlice(receiveMethod) ? (
                    <TrimSliceOption checked={trimAndSlice} onChange={(v) => cart.setSlotTrimAndSlice(product.id, zone.slotNo, v)} disabled={disabled} size="sm" />
                  ) : null}
                </td>
                <td className={`${CELL} text-right text-content`}>{formatWon(slotLineAmount(line))}</td>
                <td className={`${CELL} text-center`}>
                  <button
                    type="button"
                    onClick={() => cart.removeSlot(product.id, zone.slotNo)}
                    disabled={disabled}
                    aria-label={`${slotLineTitle(line)} 빼기`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-content-ghost hover:bg-surface-accent hover:text-content-mid"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface KgLinesTableProps {
  lines: OrderLine[];
  disabled: boolean;
}

/** 1kg 구매 줄 · 주문량·수령 방식·손질 옵션을 표 안에서 바로 고친다 */
function KgLinesTable({ lines, disabled }: KgLinesTableProps) {
  const cart = useKgCart();
  return (
    <div>
      <h2 className="mb-2 text-[13.5px] font-bold text-content-mid">1kg 구매</h2>
      <table className="w-full table-fixed border-collapse border border-line">
        <colgroup>
          <col className="w-[26%]" />
          <col className="w-[14%]" />
          <col className="w-[15%]" />
          <col className="w-[26%]" />
          <col className="w-[14%]" />
          <col className="w-[5%]" />
        </colgroup>
        <thead>
          <tr>
            <th className={`${HEAD} text-left`}>부위 · 등급</th>
            <th className={`${HEAD} text-right`}>kg당 가격</th>
            <th className={`${HEAD} text-center`}>주문량</th>
            <th className={`${HEAD} text-left`}>옵션</th>
            <th className={`${HEAD} text-right`}>금액</th>
            <th className={HEAD} aria-label="빼기" />
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const { pool, kg, trimAndSlice, receiveMethod } = line;
            return (
              <tr key={pool.id} className="h-[72px]">
                <td className={CELL}>
                  <div className="flex items-center gap-3">
                    <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-sm bg-surface-accent">
                      <SmartImage src={pool.image ?? FALLBACK_THUMB} alt="" fill fallbackSrc={FALLBACK_THUMB} className="object-cover" />
                    </span>
                    <Link href={`/group-buy/kg/${pool.id}`} className="truncate text-content hover:underline">
                      {poolTitle(pool)}
                    </Link>
                  </div>
                </td>
                <td className={`${CELL} text-right text-content`}>
                  {formatWon(unitPriceOf(pool.pricePerKg, trimAndSlice))}
                  {trimAndSlice ? <span className="block text-[11.5px] font-medium text-content-faint">옵션 포함</span> : null}
                </td>
                <td className={`${CELL} text-center`}>
                  <KgStepper value={kg} min={pool.minKg} max={pool.maxKg} onChange={(v) => cart.setKg(pool.id, v)} size="sm" />
                </td>
                <td className={`${CELL} space-y-1.5 py-2`}>
                  <ReceiveMethodOption value={receiveMethod} onChange={(m) => cart.setReceiveMethod(pool.id, m)} disabled={disabled} size="sm" />
                  {allowsTrimAndSlice(receiveMethod) ? (
                    <TrimSliceOption checked={trimAndSlice} onChange={(v) => cart.setTrimAndSlice(pool.id, v)} disabled={disabled} size="sm" />
                  ) : null}
                </td>
                <td className={`${CELL} text-right text-content`}>{formatWon(lineAmount(line))}</td>
                <td className={`${CELL} text-center`}>
                  <button
                    type="button"
                    onClick={() => cart.remove(pool.id)}
                    disabled={disabled}
                    aria-label={`${poolTitle(pool)} 빼기`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-content-ghost hover:bg-surface-accent hover:text-content-mid"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
