'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { CheckCircle2, CreditCard, Lock, MapPin } from 'lucide-react';
import { PrimaryButton } from '../FormField';
import { ShippingFields } from '../pools/ShippingFields';
import { Skeleton } from '../primitives';
import { productTitle } from '../products/ProductTable';
import { useShippingForm, useSubmitKgOrders, useSubmitSlotOrders } from '../../hooks';
import { lineAmount, slotLineAmount, sumLineAmount, sumSlotAmount, type OrderLine, type SlotLine } from '../../lib/cartStore';
import { poolTitle } from '../../lib/pools';
import { DINE_IN_NOTICE } from '../../lib/receive';
import { toShippingInfo } from '../../lib/shipping';
import { formatWon } from '../../lib/slots';
import { formatPickup } from '../../lib/stores';
import type { PickupSelection } from './PickupScheduler';

const SECTION = 'rounded-sm border border-line bg-surface p-5';

/** 매장이용 주문 · 방문은 이미 정해져 있고, 받으실 분만 확인한 뒤 결제한다 */
export function StoreVisitCheckout({
  pickup,
  slotLines,
  kgLines,
  onBack,
  onDrop,
  onDone,
}: {
  pickup: PickupSelection;
  slotLines: SlotLine[];
  kgLines: OrderLine[];
  onBack: () => void;
  onDrop: (slots: { productId: string; slotNo: number }[], poolIds: string[]) => void;
  onDone: (pickup: PickupSelection, count: number, failed: string[]) => void;
}) {
  const router = useRouter();
  const { status } = useSession();
  const { form, loggedIn } = useShippingForm();
  const kgOrders = useSubmitKgOrders();
  const slotOrders = useSubmitSlotOrders();
  const isPending = kgOrders.isPending || slotOrders.isPending;
  const [error, setError] = useState('');

  const count = slotLines.length + kgLines.length;
  const total = sumSlotAmount(slotLines) + sumLineAmount(kgLines);
  const loggedOut = status === 'unauthenticated';

  const pay = async () => {
    if (count === 0 || isPending) return;
    if (!loggedIn) {
      const back = `/group-buy/stores?store=${pickup.storeId}&step=order`;
      router.push(`/group-buy/login?callbackUrl=${encodeURIComponent(back)}`);
      return;
    }
    setError('');
    const valid = await form.trigger(['name', 'phone']);
    if (!valid) {
      setError('받으실 분 이름과 연락처를 확인해주세요.');
      return;
    }
    const shipping = toShippingInfo(form.getValues());
    const pickupInput = { storeId: pickup.storeId, pickupAt: pickup.pickupAt };
    const slotResult = slotLines.length > 0 ? await slotOrders.submit(slotLines, shipping, pickupInput) : { succeeded: [] as SlotLine[], failed: [] as string[] };
    const kgResult = kgLines.length > 0 ? await kgOrders.submit(kgLines, shipping, pickupInput) : { succeeded: [] as OrderLine[], failed: [] as string[] };
    const succeededSlots = slotResult.succeeded.map((line) => ({ productId: line.product.id, slotNo: line.zone.slotNo }));
    const succeededPools = kgResult.succeeded.map((line) => line.pool.id);
    const failed = [...slotResult.failed, ...kgResult.failed];
    const succeededCount = succeededSlots.length + succeededPools.length;
    if (succeededCount === 0) {
      setError(failed.join('\n') || '주문하지 못했어요.');
      return;
    }
    onDrop(succeededSlots, succeededPools);
    if (failed.length > 0) {
      setError(failed.join('\n'));
      return;
    }
    onDone(pickup, succeededCount, failed);
  };

  return (
    <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-6">
        <section className={SECTION}>
          <h2 className="text-[15px] font-bold text-content">방문 예약</h2>
          <p className="mt-3 text-[16px] font-bold text-content">{pickup.store.name}</p>
          <p className="mt-1 flex items-start gap-1 text-[13.5px] text-content-soft">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {pickup.store.address} {pickup.store.addressDetail}
          </p>
          <p className="mt-1 text-[14px] font-bold tabular-nums text-content">{formatPickup(pickup.pickupAt)}</p>
          <p className="mt-3 text-[12.5px] leading-relaxed text-content-faint">{DINE_IN_NOTICE}</p>
        </section>

        <section className={SECTION}>
          <h2 className="text-[15px] font-bold text-content">주문 상품 {count}건</h2>
          {count === 0 ? (
            <p className="mt-3 text-[13.5px] text-content-soft">담은 상품이 없어요. 상품 단계에서 다시 골라주세요.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line-soft">
              {slotLines.map((line) => (
                <li key={`${line.product.id}-${line.zone.slotNo}`} className="flex items-baseline justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-bold text-content">
                      {productTitle(line.product)} {line.zone.label}
                    </span>
                    <span className="text-[12.5px] text-content-soft">
                      벌크 {formatWon(line.zone.pricePerKg)} × {line.zone.kg.toFixed(1)}kg
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-content">{formatWon(slotLineAmount(line))}</span>
                </li>
              ))}
              {kgLines.map((line) => (
                <li key={line.pool.id} className="flex items-baseline justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-bold text-content">{poolTitle(line.pool)}</span>
                    <span className="text-[12.5px] text-content-soft">
                      1kg {formatWon(line.pool.pricePerKg)} × {line.kg}kg
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-content">{formatWon(lineAmount(line))}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={SECTION}>
          <h2 className="text-[15px] font-bold text-content">받으실 분</h2>
          <p className="mt-1 text-[13px] text-content-soft">매장에서 받으실 분의 이름과 연락처를 입력해주세요.</p>
          {status === 'loading' ? (
            <Skeleton className="mt-4 h-[120px] rounded-sm" />
          ) : loggedOut ? (
            <p className="mt-4 text-[13.5px] text-content-soft">
              결제하려면{' '}
              <Link href={`/group-buy/login?callbackUrl=${encodeURIComponent(`/group-buy/stores?store=${pickup.storeId}&step=order`)}`} className="font-semibold text-content underline-offset-2 hover:underline">
                로그인
              </Link>
              이 필요해요. 담아 둔 방문은 그대로 남습니다.
            </p>
          ) : (
            <div className="mt-4">
              <ShippingFields form={form} idPrefix="store-visit" contactOnly />
            </div>
          )}
        </section>

        <section className={SECTION}>
          <h2 className="text-[15px] font-bold text-content">결제 수단</h2>
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
          <h2 className="text-[15px] font-bold text-content">결제 금액</h2>
          <dl className="mt-4 space-y-2 text-[13.5px]">
            <div className="flex justify-between">
              <dt className="text-content-soft">상품 금액</dt>
              <dd className="font-semibold tabular-nums text-content">{formatWon(total)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-content-soft">배송비</dt>
              <dd className="font-semibold text-content">없음 · 매장 수령</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="shrink-0 text-content-soft">방문</dt>
              <dd className="text-right font-semibold tabular-nums text-content">
                {pickup.store.name} · {formatPickup(pickup.pickupAt)}
              </dd>
            </div>
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
          <PrimaryButton className="mt-4 rounded-sm" onClick={pay} loading={isPending} disabled={count === 0 || status === 'loading'}>
            <Lock className="mr-1.5 h-4 w-4" />
            {loggedOut ? '로그인하고 결제하기' : `${formatWon(total)} 결제하기`}
          </PrimaryButton>
          <button type="button" onClick={onBack} className="mt-3 w-full text-[13px] font-medium text-content-faint hover:text-content-mid">
            이전
          </button>
        </section>
      </aside>
    </div>
  );
}
