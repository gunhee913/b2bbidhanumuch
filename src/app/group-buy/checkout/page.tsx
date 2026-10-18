'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, CreditCard, Lock } from 'lucide-react';
import { SmartImage } from '@/components/ui/smart-image';
import { cn } from '@/lib/utils';
import { GroupBuyShell } from '@/features/group-buy/components/GroupBuyShell';
import { PrimaryButton } from '@/features/group-buy/components/FormField';
import { EmptyState, Skeleton } from '@/features/group-buy/components/primitives';
import { ReceiveMethodOption } from '@/features/group-buy/components/pools/ReceiveMethodOption';
import { PickupScheduler, type PickupSelection } from '@/features/group-buy/components/stores/PickupScheduler';
import { ShippingFields } from '@/features/group-buy/components/pools/ShippingFields';
import { TRIM_SLICE_CONSENT_ERROR, TrimSliceOption } from '@/features/group-buy/components/pools/TrimSliceOption';
import { productTitle } from '@/features/group-buy/components/products/ProductTable';
import { useConsumerPools, useConsumerProducts, useShippingForm, useSubmitKgOrders, useSubmitSlotOrders } from '@/features/group-buy/hooks';
import {
  joinCartLines,
  joinSlotLines,
  lineAmount,
  slotLineAmount,
  sumLineAmount,
  sumSlotAmount,
  useHydrateKgCart,
  useKgCart,
  type CheckoutDraft,
  type OrderLine,
  type SlotLine,
} from '@/features/group-buy/lib/cartStore';
import { optionFeeOf, poolTitle, unitPriceOf } from '@/features/group-buy/lib/pools';
import { allowsTrimAndSlice, isDineIn } from '@/features/group-buy/lib/receive';
import { toShippingInfo } from '@/features/group-buy/lib/shipping';
import { formatWon } from '@/features/group-buy/lib/slots';
import { formatPickup } from '@/features/group-buy/lib/stores';
import type { ReceiveMethod } from '@/features/group-buy/types';

const FALLBACK_THUMB = 'https://picsum.photos/seed/hanwoo-thumb/96/96';
const SECTION = 'rounded-sm border border-line bg-surface p-5';
const SECTION_TITLE = 'text-[15px] font-bold text-content';

interface DoneState {
  count: number;
  failed: string[];
  pickup: PickupSelection | null;
}

/**
 * 주문서 · 패널·장바구니에서 넘어온 줄을 확인하고 배송지(또는 받으실 분)를 적은 뒤 결제한다.
 * 결제가 끝난 줄은 초안(장바구니에서 왔으면 장바구니에서도)에서 빠진다.
 */
export default function GroupBuyCheckoutPage() {
  const cart = useKgCart();
  const hydrated = useHydrateKgCart();
  const draft = cart.checkout;
  const { data: pools, isLoading: poolsLoading } = useConsumerPools();
  const { data: products, isLoading: productsLoading } = useConsumerProducts();
  const { form, loggedIn } = useShippingForm();
  const kgOrders = useSubmitKgOrders();
  const slotOrders = useSubmitSlotOrders();
  const isPending = kgOrders.isPending || slotOrders.isPending;

  const [error, setError] = useState('');
  const [trimConsent, setTrimConsent] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState<DoneState | null>(null);
  // 매장 수령 줄이 있을 때 고른 매장·픽업 시간 · 한 주문서의 매장 수령 줄은 모두 같은 곳·같은 시간에 받는다
  const [pickup, setPickup] = useState<PickupSelection | null>(null);

  const lines = useMemo(() => joinCartLines(draft?.items ?? [], pools ?? []), [draft?.items, pools]);
  const slotLines = useMemo(() => joinSlotLines(draft?.slotItems ?? [], products ?? []), [draft?.slotItems, products]);
  const count = lines.length + slotLines.length;
  const total = sumLineAmount(lines) + sumSlotAmount(slotLines);
  const optionTotal = lines.reduce((acc, l) => acc + optionFeeOf(l.kg, l.trimAndSlice), 0) + slotLines.reduce((acc, l) => acc + optionFeeOf(l.zone.kg, l.trimAndSlice), 0);
  const goodsTotal = total - optionTotal;

  const isLoading = !hydrated || (poolsLoading && (draft?.items.length ?? 0) > 0) || (productsLoading && (draft?.slotItems.length ?? 0) > 0);
  // 택배로 받는 줄이 하나라도 있으면 주소까지, 전부 매장 수령이면 이름·연락처만 받는다
  const receiveMethods = [...slotLines.map((l) => l.receiveMethod), ...lines.map((l) => l.receiveMethod)];
  const needsAddress = receiveMethods.some((m) => !isDineIn(m));
  const hasDineIn = receiveMethods.some((m) => isDineIn(m));

  const updateDraft = (patch: (d: CheckoutDraft) => CheckoutDraft) => {
    if (draft) cart.startCheckout(patch(draft));
  };

  const setKgLine = (poolId: string, change: Partial<Pick<OrderLine, 'trimAndSlice' | 'receiveMethod'>>) =>
    updateDraft((d) => ({
      ...d,
      items: d.items.map((i) => {
        if (i.poolId !== poolId) return i;
        const receiveMethod = change.receiveMethod ?? i.receiveMethod;
        const trimAndSlice = allowsTrimAndSlice(receiveMethod) && (change.trimAndSlice ?? i.trimAndSlice);
        return { ...i, receiveMethod, trimAndSlice };
      }),
    }));

  const setSlotLine = (productId: string, slotNo: number, change: Partial<Pick<SlotLine, 'trimAndSlice' | 'receiveMethod'>>) =>
    updateDraft((d) => ({
      ...d,
      slotItems: d.slotItems.map((i) => {
        if (i.productId !== productId || i.slotNo !== slotNo) return i;
        const receiveMethod = change.receiveMethod ?? i.receiveMethod;
        const trimAndSlice = allowsTrimAndSlice(receiveMethod) && (change.trimAndSlice ?? i.trimAndSlice);
        return { ...i, receiveMethod, trimAndSlice };
      }),
    }));

  const slotConsentKey = (productId: string, slotNo: number) => `slot:${productId}:${slotNo}`;
  const kgConsentKey = (poolId: string) => `kg:${poolId}`;
  const markConsent = (key: string, consented: boolean) => setTrimConsent((prev) => ({ ...prev, [key]: consented }));

  const pay = async () => {
    if (!draft || count === 0 || isPending) return;
    const missingConsent =
      slotLines.some((line) => line.trimAndSlice && !trimConsent[slotConsentKey(line.product.id, line.zone.slotNo)]) ||
      lines.some((line) => line.trimAndSlice && !trimConsent[kgConsentKey(line.pool.id)]);
    if (missingConsent) {
      setError(TRIM_SLICE_CONSENT_ERROR);
      return;
    }
    setError('');
    const valid = needsAddress ? await form.trigger() : await form.trigger(['name', 'phone']);
    if (!valid) {
      setError(needsAddress ? '배송지를 확인해주세요.' : '받으실 분 이름과 연락처를 확인해주세요.');
      return;
    }
    if (hasDineIn && !pickup) {
      setError('매장에서 받으실 매장과 픽업 시간을 골라주세요.');
      return;
    }
    const shipping = toShippingInfo(form.getValues());
    const pickupInput = hasDineIn && pickup ? { storeId: pickup.storeId, pickupAt: pickup.pickupAt } : undefined;
    const slotResult = slotLines.length > 0 ? await slotOrders.submit(slotLines, shipping, pickupInput) : { succeeded: [] as SlotLine[], failed: [] as string[] };
    const kgResult = lines.length > 0 ? await kgOrders.submit(lines, shipping, pickupInput) : { succeeded: [] as OrderLine[], failed: [] as string[] };

    const succeededSlots = slotResult.succeeded.map((l) => ({ productId: l.product.id, slotNo: l.zone.slotNo }));
    const succeededPools = kgResult.succeeded.map((l) => l.pool.id);
    if (draft.fromCart) {
      if (succeededSlots.length > 0) cart.removeSlots(succeededSlots);
      if (succeededPools.length > 0) cart.removeMany(succeededPools);
    }

    const failed = [...slotResult.failed, ...kgResult.failed];
    const succeededCount = succeededSlots.length + succeededPools.length;
    if (succeededCount === 0) {
      setError(failed.join('\n') || '주문하지 못했어요.');
      return;
    }
    // 실패한 줄만 초안에 남겨 다시 시도할 수 있게 한다 · 전부 성공이면 초안을 비운다
    const remaining: CheckoutDraft = {
      ...draft,
      items: draft.items.filter((i) => !succeededPools.includes(i.poolId)),
      slotItems: draft.slotItems.filter((i) => !succeededSlots.some((s) => s.productId === i.productId && s.slotNo === i.slotNo)),
    };
    if (remaining.items.length === 0 && remaining.slotItems.length === 0) cart.clearCheckout();
    else cart.startCheckout(remaining);
    if (pickupInput) cart.setPreferredStore(pickupInput.storeId);
    setDone({ count: succeededCount, failed, pickup: hasDineIn ? pickup : null });
  };

  return (
    <GroupBuyShell>
      {done ? (
        <CheckoutDone done={done} onRetry={() => setDone(null)} />
      ) : (
        <>
          <h1 className="text-[30px] font-bold leading-[1.2] tracking-[-0.03em] text-content">주문서</h1>
          <p className="mt-1 text-[13.5px] text-content-soft">주문 내용과 받으실 곳을 확인한 뒤 결제해주세요.</p>

          {isLoading ? (
            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
              <div className="space-y-6">
                <Skeleton className="h-[200px] rounded-sm" />
                <Skeleton className="h-[320px] rounded-sm" />
              </div>
              <Skeleton className="h-[280px] rounded-sm" />
            </div>
          ) : count === 0 ? (
            <div className="mt-8">
              <EmptyState
                title="주문할 상품이 없어요"
                description="주문하려던 부위가 마감되었거나 아직 고르지 않았어요. 표에서 부위를 골라 다시 주문해주세요."
                action={
                  <div className="flex items-center gap-2.5">
                    <Link href="/group-buy/products" className="inline-flex h-11 items-center rounded-sm bg-ink px-5 text-[14px] font-bold text-white hover:bg-ink-hover">
                      벌크구매 보러 가기
                    </Link>
                    <Link href="/group-buy/cart" className="inline-flex h-11 items-center rounded-sm border border-line bg-surface px-5 text-[14px] font-semibold text-content hover:bg-surface-accent">
                      장바구니
                    </Link>
                  </div>
                }
              />
            </div>
          ) : (
            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
              <div className="space-y-6">
                <section className={SECTION}>
                  <div className="flex items-baseline justify-between">
                    <h2 className={SECTION_TITLE}>주문 상품 {count}건</h2>
                    {draft?.fromCart ? (
                      <Link href="/group-buy/cart" className="text-[13px] font-medium text-content-faint hover:text-content-mid">
                        장바구니에서 바꾸기
                      </Link>
                    ) : null}
                  </div>
                  <ul className="mt-4 divide-y divide-line-soft">
                    {slotLines.map((line) => (
                      <SlotLineRow
                        key={`${line.product.id}-${line.zone.slotNo}`}
                        line={line}
                        disabled={isPending}
                        onReceiveChange={(m) => setSlotLine(line.product.id, line.zone.slotNo, { receiveMethod: m })}
                        consented={trimConsent[slotConsentKey(line.product.id, line.zone.slotNo)] === true}
                        onConsentChange={(v) => markConsent(slotConsentKey(line.product.id, line.zone.slotNo), v)}
                        onTrimChange={(v) => {
                          setSlotLine(line.product.id, line.zone.slotNo, { trimAndSlice: v });
                          markConsent(slotConsentKey(line.product.id, line.zone.slotNo), false);
                        }}
                      />
                    ))}
                    {lines.map((line) => (
                      <KgLineRow
                        key={line.pool.id}
                        line={line}
                        disabled={isPending}
                        onReceiveChange={(m) => setKgLine(line.pool.id, { receiveMethod: m })}
                        consented={trimConsent[kgConsentKey(line.pool.id)] === true}
                        onConsentChange={(v) => markConsent(kgConsentKey(line.pool.id), v)}
                        onTrimChange={(v) => {
                          setKgLine(line.pool.id, { trimAndSlice: v });
                          markConsent(kgConsentKey(line.pool.id), false);
                        }}
                      />
                    ))}
                  </ul>
                </section>

                {hasDineIn ? (
                  <section className={SECTION}>
                    <h2 className={SECTION_TITLE}>매장 수령 예약</h2>
                    <p className="mt-1 text-[13px] text-content-soft">받을 매장과 방문할 날짜·시간을 골라주세요. 픽업 전날까지 내 주문에서 바꿀 수 있어요.</p>
                    <PickupScheduler value={pickup} onChange={setPickup} preferredStoreId={cart.preferredStoreId} disabled={isPending} className="mt-4" />
                  </section>
                ) : null}

                <section className={SECTION}>
                  <h2 className={SECTION_TITLE}>{needsAddress ? '배송지' : '받으실 분'}</h2>
                  <p className="mt-1 text-[13px] text-content-soft">
                    {needsAddress ? '냉장 택배로 발송됩니다. 받으실 수 있는 주소를 입력해주세요.' : '매장에서 받으실 분의 이름과 연락처를 입력해주세요.'}
                  </p>
                  {loggedIn ? (
                    <div className="mt-4">
                      <ShippingFields form={form} idPrefix="checkout" contactOnly={!needsAddress} />
                    </div>
                  ) : (
                    <Skeleton className="mt-4 h-[160px] rounded-sm" />
                  )}
                </section>

                <section className={SECTION}>
                  <h2 className={SECTION_TITLE}>결제 수단</h2>
                  <div className="mt-4 flex items-center justify-between rounded-sm border-2 border-ink bg-surface px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-content" />
                      <div>
                        <p className="text-[14px] font-bold text-content">신용·체크카드</p>
                        <p className="text-[12px] text-content-faint">시연용 결제 · 실제 청구되지 않습니다</p>
                      </div>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-ink" />
                  </div>
                </section>
              </div>

              <aside className="lg:sticky lg:top-24">
                <section className={SECTION}>
                  <h2 className={SECTION_TITLE}>결제 금액</h2>
                  <dl className="mt-4 space-y-2 text-[13.5px]">
                    <div className="flex justify-between">
                      <dt className="text-content-soft">상품 금액</dt>
                      <dd className="font-semibold tabular-nums text-content">{formatWon(goodsTotal)}</dd>
                    </div>
                    {optionTotal > 0 ? (
                      <div className="flex justify-between">
                        <dt className="text-content-soft">손질 옵션</dt>
                        <dd className="font-semibold tabular-nums text-content">+{formatWon(optionTotal)}</dd>
                      </div>
                    ) : null}
                    <div className="flex justify-between">
                      <dt className="text-content-soft">배송비</dt>
                      <dd className="font-semibold text-content">{needsAddress ? '무료' : '없음 · 매장 수령'}</dd>
                    </div>
                    {hasDineIn ? (
                      <div className="flex justify-between gap-3">
                        <dt className="shrink-0 text-content-soft">매장 수령</dt>
                        <dd className={cn('text-right font-semibold tabular-nums', pickup ? 'text-content' : 'text-rose-600')}>
                          {pickup ? `${pickup.store.name} · ${formatPickup(pickup.pickupAt)}` : '매장·시간을 골라주세요'}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                  <div className="mt-4 flex items-baseline justify-between border-t border-line-soft pt-4">
                    <span className="text-[14px] font-bold text-content">총 결제 금액</span>
                    <span className="text-[24px] font-bold tabular-nums tracking-[-0.02em] text-content">{formatWon(total)}</span>
                  </div>

                  {error ? (
                    <p role="alert" className="mt-4 whitespace-pre-line rounded-sm bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-700">
                      {error}
                    </p>
                  ) : null}

                  <PrimaryButton className="mt-4 rounded-sm" onClick={pay} loading={isPending} disabled={count === 0 || !loggedIn || (hasDineIn && !pickup)}>
                    <Lock className="mr-1.5 h-4 w-4" />
                    {formatWon(total)} 결제하기
                  </PrimaryButton>
                  <p className="mt-3 text-center text-[12px] leading-relaxed text-content-faint">
                    배송 준비 전에는 취소할 수 있고, 물량을 확보하지 못하면 전액 자동 환불됩니다.
                  </p>
                </section>
              </aside>
            </div>
          )}
        </>
      )}
    </GroupBuyShell>
  );
}

interface LineRowProps<T> {
  line: T;
  disabled: boolean;
  consented: boolean;
  onConsentChange: (consented: boolean) => void;
  onReceiveChange: (method: ReceiveMethod) => void;
  onTrimChange: (checked: boolean) => void;
}

/** 공동구매 구좌 한 줄 · 상품 · 위치 · 옵션 · 금액 */
function SlotLineRow({ line, disabled, consented, onConsentChange, onReceiveChange, onTrimChange }: LineRowProps<SlotLine>) {
  const { product, zone, trimAndSlice, receiveMethod } = line;
  return (
    <LineRowFrame
      image={product.images[0] ?? FALLBACK_THUMB}
      title={productTitle(product)}
      subtitle={`${zone.label} · ${zone.kg.toFixed(1)}kg · kg당 ${formatWon(unitPriceOf(zone.pricePerKg, trimAndSlice))}`}
      meta={`${product.cattle.listingNo}${product.cattle.slaughterHouse ? ` · ${product.cattle.slaughterHouse}` : ''}`}
      amount={slotLineAmount(line)}
      receiveMethod={receiveMethod}
      trimAndSlice={trimAndSlice}
      consented={consented}
      disabled={disabled}
      onReceiveChange={onReceiveChange}
      onTrimChange={onTrimChange}
      onConsentChange={onConsentChange}
    />
  );
}

/** 1kg 구매 한 줄 · 부위 · kg · 옵션 · 금액 */
function KgLineRow({ line, disabled, consented, onConsentChange, onReceiveChange, onTrimChange }: LineRowProps<OrderLine>) {
  const { pool, kg, trimAndSlice, receiveMethod } = line;
  return (
    <LineRowFrame
      image={pool.image ?? FALLBACK_THUMB}
      title={poolTitle(pool)}
      subtitle={`${kg}kg · kg당 ${formatWon(unitPriceOf(pool.pricePerKg, trimAndSlice))}`}
      amount={lineAmount(line)}
      receiveMethod={receiveMethod}
      trimAndSlice={trimAndSlice}
      consented={consented}
      disabled={disabled}
      onReceiveChange={onReceiveChange}
      onTrimChange={onTrimChange}
      onConsentChange={onConsentChange}
    />
  );
}

interface LineRowFrameProps {
  image: string;
  title: string;
  subtitle: string;
  meta?: string;
  amount: number;
  receiveMethod: ReceiveMethod;
  trimAndSlice: boolean;
  consented: boolean;
  disabled: boolean;
  onReceiveChange: (method: ReceiveMethod) => void;
  onTrimChange: (checked: boolean) => void;
  onConsentChange: (consented: boolean) => void;
}

function LineRowFrame({ image, title, subtitle, meta, amount, receiveMethod, trimAndSlice, consented, disabled, onReceiveChange, onTrimChange, onConsentChange }: LineRowFrameProps) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_220px_120px] items-center gap-4 py-4 first:pt-0 last:pb-0">
      <div className="flex min-w-0 items-center gap-3">
        <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-sm bg-surface-accent">
          <SmartImage src={image} alt="" fill fallbackSrc={FALLBACK_THUMB} className="object-cover" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold text-content">{title}</p>
          <p className="truncate text-[12.5px] tabular-nums text-content-soft">{subtitle}</p>
          {meta ? <p className="truncate text-[12px] text-content-faint">{meta}</p> : null}
        </div>
      </div>
      <div className="space-y-1.5">
        <ReceiveMethodOption value={receiveMethod} onChange={onReceiveChange} disabled={disabled} size="sm" />
        {allowsTrimAndSlice(receiveMethod) ? (
          <TrimSliceOption checked={trimAndSlice} consented={consented} onChange={onTrimChange} onConsentChange={onConsentChange} disabled={disabled} size="sm" />
        ) : null}
      </div>
      <p className="text-right text-[16px] font-bold tabular-nums text-content">{formatWon(amount)}</p>
    </li>
  );
}

function CheckoutDone({ done, onRetry }: { done: DoneState; onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-[560px] py-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
        <CheckCircle2 className="h-9 w-9 text-emerald-600" />
      </div>
      <h1 className="mt-5 text-[26px] font-bold tracking-[-0.02em] text-content">주문이 접수됐어요</h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-content-soft">
        {done.count}건을 결제했어요. 소분·포장이 끝나면 택배로 보내드리거나 매장 도착을 문자로 안내해 드릴게요.
        <br />
        배송 준비 전에는 내 주문에서 취소할 수 있어요.
      </p>
      {done.pickup ? (
        <div className="mx-auto mt-5 max-w-[420px] rounded-sm border border-line bg-surface px-4 py-3 text-left">
          <p className="text-[12.5px] font-semibold text-content-mid">매장 수령 예약</p>
          <p className="mt-0.5 text-[15px] font-bold text-content">{done.pickup.store.name}</p>
          <p className="text-[13px] text-content-soft">
            {done.pickup.store.address} {done.pickup.store.addressDetail}
          </p>
          <p className="mt-1 text-[14px] font-bold tabular-nums text-content">픽업 {formatPickup(done.pickup.pickupAt)}</p>
        </div>
      ) : null}
      {done.failed.length > 0 ? (
        <div className="mt-5 rounded-sm bg-rose-50 px-4 py-3 text-left text-[13px] leading-relaxed text-rose-700">
          <p className="font-semibold">일부 주문은 접수되지 않았어요</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {done.failed.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <button type="button" onClick={onRetry} className="mt-2 inline-block font-semibold underline-offset-2 hover:underline">
            남은 주문 다시 시도
          </button>
        </div>
      ) : null}
      <div className="mt-7 flex items-center justify-center gap-3">
        <Link href="/group-buy/mypage/orders" className="inline-flex h-11 items-center rounded-sm bg-ink px-5 text-[14px] font-bold text-white hover:bg-ink-hover">
          내 주문 보기
        </Link>
        <Link href="/group-buy/products" className="inline-flex h-11 items-center rounded-sm border border-line bg-surface px-5 text-[14px] font-semibold text-content hover:bg-surface-accent">
          계속 둘러보기
        </Link>
      </div>
    </div>
  );
}
