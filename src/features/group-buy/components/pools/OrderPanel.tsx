'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingBag, ShoppingCart } from 'lucide-react';
import { SmartImage } from '@/components/ui/smart-image';
import type { ConsumerPool, ReceiveMethod } from '../../types';
import { formatWon } from '../../lib/slots';
import { TRIM_SLICE_FEE_PER_KG, TRIM_SLICE_LABEL, clampKg, lineAmountOf, optionFeeOf, poolTitle } from '../../lib/pools';
import { allowsTrimAndSlice, DEFAULT_RECEIVE_METHOD, isDineIn, RECEIVE_METHOD_LABELS } from '../../lib/receive';
import { useHydrateKgCart, useKgCart } from '../../lib/cartStore';
import { PrimaryButton } from '../FormField';
import { KgStepper } from './KgStepper';
import { ReceiveMethodOption } from './ReceiveMethodOption';
import { TRIM_SLICE_CONSENT_ERROR, TrimSliceOption } from './TrimSliceOption';

interface OrderPanelProps {
  selected?: ConsumerPool;
}

const FALLBACK_THUMB = 'https://picsum.photos/seed/hanwoo-thumb/96/96';
const CHECKOUT_HREF = '/group-buy/checkout';

/** 표 오른쪽 주문 패널 · 표에서 고른 부위를 장바구니에 담거나 주문서로 넘긴다 · 배송지·결제는 주문서 페이지에서 */
export function OrderPanel({ selected }: OrderPanelProps) {
  const router = useRouter();
  const cart = useKgCart();
  useHydrateKgCart();

  const [kg, setKg] = useState(1);
  const [trimAndSlice, setTrimAndSlice] = useState(false);
  const [trimConsent, setTrimConsent] = useState(false);
  const [receiveMethod, setReceiveMethod] = useState<ReceiveMethod>(DEFAULT_RECEIVE_METHOD);
  const [notice, setNotice] = useState<'added' | null>(null);
  const [error, setError] = useState('');

  // 매장에서 받기로 바꾸면 손질 옵션은 푼다
  useEffect(() => {
    if (isDineIn(receiveMethod)) {
      setTrimAndSlice(false);
      setTrimConsent(false);
    }
  }, [receiveMethod]);

  useEffect(() => {
    if (!selected) return;
    setKg(clampKg(selected, 1));
    setTrimAndSlice(false);
    setNotice(null);
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!selected) {
    return (
      <aside className="lg:sticky lg:top-24">
        <section className="rounded-sm border border-line bg-surface p-5">
          <h2 className="text-[15px] font-bold text-content">주문하기</h2>
          <p className="mt-3 rounded-sm bg-surface-accent/70 px-4 py-6 text-center text-[13.5px] leading-relaxed text-content-soft">
            왼쪽 표에서 부위를 누르면
            <br />
            여기서 바로 주문할 수 있어요.
          </p>
        </section>
      </aside>
    );
  }

  const amount = lineAmountOf(selected.pricePerKg, kg, trimAndSlice);
  const inCart = cart.items.find((i) => i.poolId === selected.id);
  const dineIn = isDineIn(receiveMethod);

  const agreed = !trimAndSlice || trimConsent;

  const addToCart = () => {
    if (!agreed) {
      setError(TRIM_SLICE_CONSENT_ERROR);
      return;
    }
    setError('');
    const next = clampKg(selected, (inCart?.kg ?? 0) + kg);
    if (inCart) {
      cart.setKg(selected.id, next);
      cart.setReceiveMethod(selected.id, receiveMethod);
      cart.setTrimAndSlice(selected.id, trimAndSlice);
    } else {
      cart.add(selected.id, next, trimAndSlice, receiveMethod);
    }
    setNotice('added');
  };

  // 바로 주문 · 이 줄 하나만 주문서로 넘긴다 · 로그인이 필요하면 주문서 경로가 로그인으로 보낸다
  const orderNow = () => {
    if (!agreed) {
      setError(TRIM_SLICE_CONSENT_ERROR);
      return;
    }
    setError('');
    cart.startCheckout({ items: [{ poolId: selected.id, kg, trimAndSlice, receiveMethod }], slotItems: [], fromCart: false });
    router.push(CHECKOUT_HREF);
  };

  return (
    <aside className="lg:sticky lg:top-24">
      <section className="rounded-sm border border-line bg-surface p-5">
        <h2 className="text-[15px] font-bold text-content">주문하기</h2>
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-sm bg-surface-accent">
              <SmartImage src={selected.image ?? FALLBACK_THUMB} alt="" fill fallbackSrc={FALLBACK_THUMB} className="object-cover" />
            </span>
            <p className="min-w-0 flex-1 truncate text-[16px] font-bold text-content">{poolTitle(selected)}</p>
            <p className="shrink-0 text-[17px] font-bold tabular-nums text-content">
              {formatWon(selected.pricePerKg)}
              <span className="text-[13px] font-medium text-content-faint">/kg</span>
            </p>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-content-mid">주문량</p>
            <KgStepper value={kg} min={selected.minKg} max={selected.maxKg} onChange={setKg} />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-semibold text-content-mid">옵션</p>
            <ReceiveMethodOption value={receiveMethod} onChange={setReceiveMethod} />
            {allowsTrimAndSlice(receiveMethod) ? (
              <TrimSliceOption
                checked={trimAndSlice}
                consented={trimConsent}
                onChange={(next) => {
                  setTrimAndSlice(next);
                  setTrimConsent(false);
                  setError('');
                }}
                onConsentChange={(next) => {
                  setTrimConsent(next);
                  setError('');
                }}
                className="mt-2"
              />
            ) : null}
          </div>

          <div className="border-t border-line-soft pt-3">
            <dl className="space-y-1 text-[13px]">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-content-mid">
                  {kg}kg × {formatWon(selected.pricePerKg)}
                </dt>
                <dd className="font-semibold tabular-nums text-content">{formatWon(selected.pricePerKg * kg)}</dd>
              </div>
              {trimAndSlice ? (
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-content-mid">
                    {TRIM_SLICE_LABEL} <span className="text-content-faint">{kg}kg × {formatWon(TRIM_SLICE_FEE_PER_KG)}</span>
                  </dt>
                  <dd className="font-semibold tabular-nums text-content">+{formatWon(optionFeeOf(kg, true))}</dd>
                </div>
              ) : null}
            </dl>
            <div className="mt-2 flex items-baseline justify-between border-t border-dashed border-line-soft pt-2">
              <span className="text-[13px] font-semibold text-content-mid">결제 금액</span>
              <span className="text-[22px] font-bold tabular-nums tracking-[-0.02em] text-content">{formatWon(amount)}</span>
            </div>
            <p className="mt-1 text-right text-[12px] text-content-faint">{dineIn ? RECEIVE_METHOD_LABELS.dine_in : '배송비 포함'}</p>
          </div>

          {error ? <p role="alert" className="rounded-sm bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-700">{error}</p> : null}
          {notice === 'added' ? (
            <p className="rounded-sm bg-surface-accent px-3.5 py-2.5 text-[13px] text-content">
              장바구니에 담았어요 (현재 {inCart?.kg ?? kg}kg).{' '}
              <Link href="/group-buy/cart" className="font-semibold underline-offset-2 hover:underline">
                장바구니 보기
              </Link>
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={addToCart}
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-sm border border-line bg-surface text-[14px] font-bold text-content transition-colors hover:bg-surface-accent disabled:opacity-40"
            >
              <ShoppingCart className="h-4 w-4" />
              장바구니 담기
            </button>
            <PrimaryButton className="rounded-sm" onClick={orderNow}>
              <ShoppingBag className="mr-1.5 h-4 w-4" />
              주문하기
            </PrimaryButton>
          </div>
        </div>
      </section>
    </aside>
  );
}
