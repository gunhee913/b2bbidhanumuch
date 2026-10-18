'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PrimaryButton } from '@/features/group-buy/components/FormField';
import { GiftTray } from '@/features/group-buy/components/gifts/GiftTray';
import { ReceiveMethodOption } from '@/features/group-buy/components/pools/ReceiveMethodOption';
import { ShippingFields } from '@/features/group-buy/components/pools/ShippingFields';
import { EmptyState, Skeleton } from '@/features/group-buy/components/primitives';
import { PickupScheduler, type PickupSelection } from '@/features/group-buy/components/stores/PickupScheduler';
import { productTitle } from '@/features/group-buy/components/products/ProductTable';
import { useConsumerPools, useConsumerProducts, useCreateGiftSet, useGiftSettings, useShippingForm } from '@/features/group-buy/hooks';
import { useHydrateKgCart, useKgCart } from '@/features/group-buy/lib/cartStore';
import { GIFT_CELL_KG, GIFT_LEFTOVER_NOTICE, GIFT_TRAY_META, giftUsableKg, leftoverLines, packagingAmount, roundKg, type GiftRecipientMode } from '@/features/group-buy/lib/gift';
import { applyFixedKg, offersForSpec, planGiftSupply } from '@/features/group-buy/lib/giftSupply';
import { gradeKeyOf } from '@/features/group-buy/lib/pools';
import { formatPickup } from '@/features/group-buy/lib/stores';
import { isDineIn } from '@/features/group-buy/lib/receive';
import { EMPTY_SHIPPING, shippingSchema, toShippingInfo, type ShippingForm } from '@/features/group-buy/lib/shipping';
import { formatWon } from '@/features/group-buy/lib/slots';
import type { ReceiveMethod, ShippingInfo } from '@/features/group-buy/types';

const SECTION = 'rounded-sm border border-line bg-surface p-5';
const FALLBACK = 'https://picsum.photos/seed/hanwoo-gift/240/180';

/** 선물세트 주문 · 배송지와 남는 중량을 받을 곳을 정한 뒤 결제한다 */
export function GiftCheckout({ embedded = false, onBack, onDone }: { embedded?: boolean; onBack?: () => void; onDone?: (id: string) => void }) {
  const router = useRouter();
  const hydrated = useHydrateKgCart();
  const draft = useKgCart((s) => s.giftDraft);
  const preferredStoreId = useKgCart((s) => s.preferredStoreId);
  const clearGift = useKgCart((s) => s.setGiftDraft);
  const { data: products, isLoading } = useConsumerProducts({ status: 'recruiting' });
  const { data: pools } = useConsumerPools();
  const { data: settings } = useGiftSettings();
  const { form: leftoverForm, loggedIn } = useShippingForm();
  const { form: batchForm } = useShippingForm();
  const create = useCreateGiftSet();

  const [mode, setMode] = useState<GiftRecipientMode>('batch');
  const [splitShips, setSplitShips] = useState<ShippingForm[]>([]);
  const [messages, setMessages] = useState<string[]>([]);
  const [leftoverMethod, setLeftoverMethod] = useState<ReceiveMethod>('delivery');
  const [pickup, setPickup] = useState<PickupSelection | null>(null);
  const [error, setError] = useState('');
  const [doneId, setDoneId] = useState<string | null>(null);

  const openProducts = useMemo(() => products ?? [], [products]);
  const cells = draft?.cells ?? [];
  const quantity = draft?.quantity ?? 1;
  const cellCount = draft?.cellCount ?? 3;

  const plan = useMemo(() => {
    if (!draft) return [];
    const openPools = (pools ?? []).filter((pool) => pool.status === 'open');
    if (draft.supplies && draft.supplies.length > 0) {
      return draft.supplies.map((supply) => {
        const needKg = roundKg(GIFT_CELL_KG * draft.quantity * supply.cellNos.length);
        let amount = 0;
        let used = 0;
        let product = undefined as (typeof openProducts)[number] | undefined;
        for (const bulk of supply.bulks) {
          const item = openProducts.find((row) => row.id === bulk.productId);
          if (!item) return { productId: bulk.productId, ok: false as const, error: '모집이 끝난 부위', needKg, leftoverKg: 0, packedKg: 0 };
          product = product ?? item;
          for (const slotNo of bulk.slotNos) {
            const zone = item.zones.find((row) => row.slotNo === slotNo && !row.sold);
            if (!zone) return { productId: item.id, ok: false as const, error: '이미 팔린 구좌', needKg, leftoverKg: 0, packedKg: 0, product: item };
            amount += zone.price;
            used += zone.kg;
          }
        }
        const pool = supply.kg > 0 ? openPools.find((item) => item.id === supply.poolId) : undefined;
        if (supply.kg > 0 && !pool) return { productId: supply.poolId ?? 'kg', ok: false as const, error: '1kg 구매를 진행할 수 없어요', needKg, leftoverKg: 0, packedKg: 0, product };
        if (pool) amount += pool.pricePerKg * supply.kg;
        const usableKg = giftUsableKg(roundKg(used + (supply.kg > 0 ? supply.kg : 0)));
        const shortKg = roundKg(Math.max(0, needKg - usableKg));
        if (shortKg > 0) return { productId: product?.id ?? supply.poolId ?? 'short', ok: false as const, error: `${shortKg.toFixed(1)}kg 부족`, needKg, leftoverKg: 0, packedKg: 0, product };
        const extra = roundKg(Math.max(0, usableKg - needKg));
        const packed = supply.leftoverMode === 'pack' && extra > 0;
        return {
          productId: product?.id ?? pool?.id ?? supply.cellNos.join('-'),
          ok: true as const,
          product,
          title: product ? productTitle(product) : pool ? `${pool.partGroup} ${pool.gradeLabel}` : '1kg 구매',
          needKg,
          leftoverKg: packed ? 0 : extra,
          packedKg: packed ? extra : 0,
          amount,
        };
      });
    }
    const groups = new Map<string, { productId: string | null; poolId: string | null; count: number; kg: number | null }>();
    for (const cell of draft.cells) {
      const key = cell.productId ? `product:${cell.productId}` : `pool:${cell.poolId ?? ''}`;
      const prev = groups.get(key);
      groups.set(key, { productId: cell.productId, poolId: cell.poolId, count: (prev?.count ?? 0) + 1, kg: prev?.kg ?? (typeof cell.kg === 'number' ? cell.kg : null) });
    }
    return Array.from(groups.entries()).map(([key, group]) => {
      const needKg = roundKg(GIFT_CELL_KG * draft.quantity * group.count);
      const product = group.productId ? openProducts.find((item) => item.id === group.productId) : undefined;
      if (group.productId && !product) return { productId: key, ok: false as const, error: '모집이 끝난 부위', needKg, leftoverKg: 0, packedKg: 0 };
      const gradeKey = product ? gradeKeyOf(product.cattle.grade, product.cattle.marblingScore) : null;
      const matched = product && gradeKey ? offersForSpec(openPools, { partGroup: product.partGroup, gradeKey }) : [];
      const locked = group.poolId ? openPools.find((pool) => pool.id === group.poolId) : undefined;
      const offers = product
        ? matched
        : locked
          ? [{ id: locked.id, label: `${locked.partGroup} ${locked.gradeLabel}`, pricePerKg: locked.pricePerKg, minKg: locked.minKg, maxKg: locked.maxKg }]
          : [];
      const planned = planGiftSupply(product?.zones ?? [], needKg, offers, product ? { requireZone: true } : undefined);
      if (planned.ok === false) return { productId: key, ok: false as const, error: planned.error, needKg, leftoverKg: 0, packedKg: 0, product };
      const supply = typeof group.kg === 'number' ? applyFixedKg(planned, group.kg, offers, needKg) : planned;
      const shortKg = roundKg(Math.max(0, needKg - supply.usedKg));
      if (shortKg > 0) return { productId: key, ok: false as const, error: `${shortKg.toFixed(1)}kg 부족`, needKg, leftoverKg: 0, packedKg: 0, product };
      return {
        productId: key,
        ok: true as const,
        product,
        title: product ? productTitle(product) : (supply.poolLabel ?? '1kg 구매'),
        needKg,
        leftoverKg: supply.leftoverKg,
        packedKg: 0,
        amount: supply.amount,
      };
    });
  }, [draft, openProducts, pools]);

  const readyLines = plan.filter((line): line is Extract<typeof line, { ok: true }> => line.ok);
  const leftoverKg = readyLines.reduce((acc, line) => acc + line.leftoverKg, 0);
  const packedKg = readyLines.reduce((acc, line) => acc + line.packedKg, 0);
  const leftoverText = leftoverLines(readyLines.map((line) => ({ label: line.title, leftoverKg: line.leftoverKg })));
  const packedText = leftoverLines(readyLines.map((line) => ({ label: line.title, leftoverKg: line.packedKg })));
  const meatAmount = plan.reduce((acc, l) => acc + (l.ok ? l.amount : 0), 0);
  const packFee = settings?.packagingFee ?? 15000;
  const total = meatAmount + packagingAmount(packFee, quantity);
  const readyPlan = plan.length > 0 && plan.every((l) => l.ok);

  const syncSplit = (qty: number, base: ShippingForm) => {
    setSplitShips((prev) => Array.from({ length: qty }, (_, i) => prev[i] ?? { ...base }));
    setMessages((prev) => Array.from({ length: qty }, (_, i) => prev[i] ?? ''));
  };

  const pay = async () => {
    if (!draft || !readyPlan || create.isPending) return;
    setError('');

    const leftoverShip = leftoverForm.getValues();
    if (leftoverKg > 0 && isDineIn(leftoverMethod) && !pickup) {
      setError('남는 양을 받을 매장과 픽업 시간을 골라주세요.');
      return;
    }
    if (leftoverKg > 0 && !isDineIn(leftoverMethod)) {
      const ok = await leftoverForm.trigger();
      if (!ok) {
        setError('남는 양을 받으실 주소를 확인해주세요.');
        return;
      }
    }

    let recipients: Array<{ shipping: ShippingInfo; message?: string }> = [];
    if (mode === 'batch') {
      leftoverForm.getValues();
      const copied = leftoverKg > 0 && !isDineIn(leftoverMethod) ? leftoverForm.getValues() : leftoverForm.getValues();
      batchForm.reset(copied.name ? copied : leftoverForm.getValues());
      const valid = await batchForm.trigger();
      if (!valid) {
        setError('선물세트를 받으실 주소를 확인해주세요.');
        return;
      }
      recipients = [{ shipping: toShippingInfo(batchForm.getValues()), message: messages[0] }];
    } else {
      if (splitShips.length !== quantity) syncSplit(quantity, leftoverForm.getValues());
      const parsed = (splitShips.length === quantity ? splitShips : Array.from({ length: quantity }, () => leftoverForm.getValues())).map((s) => shippingSchema.safeParse(s));
      const bad = parsed.find((p) => !p.success);
      if (bad && !bad.success) {
        setError(bad.error.issues[0]?.message ?? '받는 분 주소를 확인해주세요.');
        return;
      }
      recipients = parsed.map((p, i) => ({ shipping: toShippingInfo((p as { data: ShippingForm }).data), message: messages[i] }));
    }

    try {
      const gift = await create.mutateAsync({
        cellCount: draft.cellCount,
        quantity: draft.quantity,
        cells: draft.cells,
        supplies: draft.supplies,
        recipientMode: mode,
        recipients,
        leftoverReceiveMethod: leftoverMethod,
        leftoverPickup: leftoverKg > 0 && isDineIn(leftoverMethod) && pickup ? { storeId: pickup.storeId, pickupAt: pickup.pickupAt } : undefined,
        leftoverShipping: leftoverKg > 0 && !isDineIn(leftoverMethod) ? toShippingInfo(leftoverShip) : recipients[0].shipping,
      });
      clearGift(null);
      setDoneId(gift.id);
      onDone?.(gift.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : '주문하지 못했어요.');
    }
  };

  if (doneId) {
    return (
        <div className="mx-auto max-w-[560px] py-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-9 w-9 text-emerald-600" />
          </div>
          <h1 className="mt-5 text-[26px] font-bold tracking-[-0.02em] text-content">선물세트가 접수됐어요</h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-content-soft">
            {GIFT_TRAY_META[cellCount].title} {quantity}세트를 포장해 보내드릴게요.
            {leftoverText.length > 0 ? ` 남는 중량(예상, ${leftoverText.join(' · ')})도 함께 준비합니다. ${GIFT_LEFTOVER_NOTICE}` : ''}
          </p>
          <div className="mt-7 flex items-center justify-center gap-3">
            <Link href={`/group-buy/mypage/orders/gift/${doneId}`} className="inline-flex h-11 items-center rounded-sm bg-ink px-5 text-[14px] font-bold text-white hover:bg-ink-hover">
              주문 보기
            </Link>
            <Link href="/group-buy/gift" className="inline-flex h-11 items-center rounded-sm border border-line bg-surface px-5 text-[14px] font-semibold text-content hover:bg-surface-accent">
              세트 더 만들기
            </Link>
          </div>
        </div>
    );
  }

  return (
    <>
      {embedded ? null : (
        <>
          <h1 className="text-[30px] font-bold leading-[1.2] tracking-[-0.03em] text-content">선물세트 주문서</h1>
          <p className="mt-1 text-[13.5px] text-content-soft">배송지와 남는 중량을 받을 곳을 정한 뒤 결제해주세요.</p>
        </>
      )}

      {!hydrated || isLoading ? (
        <Skeleton className="mt-8 h-[360px] rounded-sm" />
      ) : !draft || cells.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="구성이 없어요" description="선물세트 칸을 먼저 채워주세요." action={<Link href="/group-buy/gift" className="text-[14px] font-semibold underline">선물세트로</Link>} />
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
          <div className="space-y-6">
            <section className={SECTION}>
              <h2 className="text-[15px] font-bold text-content">구성 {GIFT_TRAY_META[cellCount].title} × {quantity}</h2>
              <GiftTray
                className="mt-3 max-w-[320px]"
                cellCount={cellCount}
                fills={cells.map((cell) => {
                  const product = openProducts.find((item) => item.id === cell.productId);
                  const pool = (pools ?? []).find((item) => item.id === cell.poolId);
                  return { cellNo: cell.cellNo, label: product?.partName ?? pool?.partGroup ?? '부위', image: product?.images[0] ?? pool?.image ?? FALLBACK };
                })}
              />
              <ul className="mt-3 space-y-1 text-[13px] text-content-soft">
                {plan.map((line) => (
                  <li key={line.productId} className={line.ok ? '' : 'text-rose-600'}>
                    {line.ok ? `${line.title} ${line.needKg.toFixed(1)}kg` : line.error}
                    {line.ok && line.packedKg > 0 ? ` · 세트에 나눠 담기 (예상) ${line.packedKg.toFixed(1)}kg` : ''}
                    {line.ok && line.leftoverKg > 0 ? ` · 따로 받기 (예상) ${line.leftoverKg.toFixed(1)}kg` : ''}
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => (onBack ? onBack() : router.push('/group-buy/gift'))} className="mt-3 text-[13px] font-medium text-content-faint hover:text-content-mid">
                {embedded ? '이전' : '구성 바꾸기'}
              </button>
            </section>

            <section className={SECTION}>
              <h2 className="text-[15px] font-bold text-content">배송지</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(
                  [
                    { key: 'batch', label: '일괄 수령', hint: '한 주소로 모두' },
                    { key: 'split', label: '여러 수령인', hint: '세트마다 다른 분' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => {
                      setMode(m.key);
                      if (m.key === 'split') syncSplit(quantity, leftoverForm.getValues());
                    }}
                    className={cn('rounded-sm border px-3 py-2.5 text-left', mode === m.key ? 'border-ink bg-surface-accent/60' : 'border-line hover:bg-surface-accent/40')}
                  >
                    <span className="block text-[13.5px] font-bold">{m.label}</span>
                    <span className="text-[12px] text-content-faint">{m.hint}</span>
                  </button>
                ))}
              </div>
              {mode === 'batch' ? (
                <div className="mt-4">
                  <ShippingFields form={batchForm} idPrefix="gift-batch" />
                  <label className="mt-3 block text-[13px] font-semibold text-content-mid">메시지 카드</label>
                  <input
                    className="mt-1.5 h-11 w-full rounded-lg border border-line px-3.5 text-[14px]"
                    value={messages[0] ?? ''}
                    onChange={(e) => setMessages([e.target.value])}
                    placeholder="함께 적어 드릴 한 줄 (선택)"
                    maxLength={80}
                  />
                </div>
              ) : (
                <div className="mt-4 space-y-5">
                  {Array.from({ length: quantity }, (_, i) => (
                    <div key={i} className="rounded-sm border border-line-soft p-4">
                      <p className="text-[13px] font-semibold text-content-mid">{i + 1}번째 세트</p>
                      <RecipientEditor
                        value={splitShips[i] ?? EMPTY_SHIPPING}
                        onChange={(next) => setSplitShips((prev) => {
                          const copy = [...(prev.length === quantity ? prev : Array.from({ length: quantity }, () => EMPTY_SHIPPING))];
                          copy[i] = next;
                          return copy;
                        })}
                        idPrefix={`gift-split-${i}`}
                      />
                      <label className="mt-3 block text-[13px] font-semibold text-content-mid">메시지 카드</label>
                      <input
                        className="mt-1.5 h-11 w-full rounded-lg border border-line px-3.5 text-[14px]"
                        value={messages[i] ?? ''}
                        onChange={(e) => setMessages((prev) => {
                          const copy = [...(prev.length === quantity ? prev : Array.from({ length: quantity }, () => ''))];
                          copy[i] = e.target.value;
                          return copy;
                        })}
                        placeholder="함께 적어 드릴 한 줄 (선택)"
                        maxLength={80}
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>

            {packedKg > 0 ? (
              <section className={SECTION}>
                <h2 className="text-[15px] font-bold text-content">세트에 나눠 담기 (예상)</h2>
                <p className="mt-1 text-[13px] text-content-soft">{packedText.join(' · ')}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-content-faint">{GIFT_LEFTOVER_NOTICE}</p>
              </section>
            ) : null}

            {leftoverKg > 0 ? (
              <section className={SECTION}>
                <h2 className="text-[15px] font-bold text-content">따로 받을 중량 (예상)</h2>
                <p className="mt-1 text-[13px] text-content-soft">{leftoverText.join(' · ')}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-content-faint">{GIFT_LEFTOVER_NOTICE}</p>
                <p className="mt-3 text-[13px] font-semibold text-content">받을 곳</p>
                <ReceiveMethodOption value={leftoverMethod} onChange={setLeftoverMethod} className="mt-4" />
                {isDineIn(leftoverMethod) ? (
                  <PickupScheduler value={pickup} onChange={setPickup} preferredStoreId={preferredStoreId} disabled={create.isPending} className="mt-4" />
                ) : loggedIn ? (
                  <div className="mt-4">
                    <ShippingFields form={leftoverForm} idPrefix="gift-left" />
                  </div>
                ) : (
                  <Skeleton className="mt-4 h-[160px] rounded-sm" />
                )}
              </section>
            ) : null}
          </div>

          <aside className="lg:sticky lg:top-24">
            <section className={SECTION}>
              <h2 className="text-[15px] font-bold text-content">결제 금액</h2>
              <dl className="mt-4 space-y-2 text-[13.5px]">
                <div className="flex justify-between">
                  <dt className="text-content-soft">부위 금액</dt>
                  <dd className="font-semibold tabular-nums">{formatWon(meatAmount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-content-soft">포장비 {formatWon(packFee)} × {quantity}세트</dt>
                  <dd className="font-semibold tabular-nums">{formatWon(packagingAmount(packFee, quantity))}</dd>
                </div>
                {packedKg > 0 ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-content-soft">세트에 담기 (예상)</dt>
                    <dd className="text-right text-[12.5px] text-content-mid">{packedText.join(' · ')}</dd>
                  </div>
                ) : null}
                {leftoverKg > 0 ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-content-soft">따로 받을 중량 (예상)</dt>
                    <dd className="text-right text-[12.5px] text-content-mid">{leftoverText.join(' · ')}</dd>
                  </div>
                ) : null}
                {isDineIn(leftoverMethod) && leftoverKg > 0 ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-content-soft">매장 수령</dt>
                    <dd className={cn('text-right font-semibold tabular-nums', pickup ? 'text-content' : 'text-rose-600')}>
                      {pickup ? `${pickup.store.name} · ${formatPickup(pickup.pickupAt)}` : '매장·시간을 골라주세요'}
                    </dd>
                  </div>
                ) : null}
              </dl>
              <div className="mt-4 flex items-baseline justify-between border-t border-line-soft pt-4">
                <span className="text-[14px] font-bold">총 결제 금액</span>
                <span className="text-[24px] font-bold tabular-nums">{formatWon(total)}</span>
              </div>
              {error ? <p role="alert" className="mt-4 whitespace-pre-line rounded-sm bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-700">{error}</p> : null}
              <PrimaryButton className="mt-4 rounded-sm" onClick={pay} loading={create.isPending} disabled={!readyPlan || !loggedIn}>
                <Lock className="mr-1.5 h-4 w-4" />
                {formatWon(total)} 결제하기
              </PrimaryButton>
            </section>
          </aside>
        </div>
      )}
    </>
  );
}

function RecipientEditor({ value, onChange, idPrefix }: { value: ShippingForm; onChange: (next: ShippingForm) => void; idPrefix: string }) {
  const form = useForm<ShippingForm>({ resolver: zodResolver(shippingSchema), defaultValues: value, values: value });
  return (
    <div className="mt-3">
      <ShippingFields
        form={{
          ...form,
          setValue: (name, v, opts) => {
            form.setValue(name, v, opts);
            onChange({ ...form.getValues(), [name]: v } as ShippingForm);
          },
        } as typeof form}
        idPrefix={idPrefix}
      />
    </div>
  );
}
