'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Minus, Plus, ShoppingBag, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConsumerPool, ReceiveMethod } from '../../types';
import { formatWon } from '../../lib/slots';
import { TRIM_SLICE_LABEL, clampKg, lineAmountOf, unitPriceOf } from '../../lib/pools';
import { allowsTrimAndSlice, DEFAULT_RECEIVE_METHOD, isDineIn, RECEIVE_METHOD_LABELS } from '../../lib/receive';
import { useHydrateKgCart, useKgCart } from '../../lib/cartStore';
import { PrimaryButton } from '../FormField';
import { ReceiveMethodOption } from './ReceiveMethodOption';
import { TrimSliceOption } from './TrimSliceOption';

interface ReservationFormProps {
  pool: ConsumerPool;
}

/** 수량 빠른 선택 · kg 범위 안의 값만 보여준다 */
const QUICK_KG = [1, 2, 3, 5] as const;
const CHECKOUT_HREF = '/group-buy/checkout';

/**
 * 풀 상세 구매 폼 · kg · 수령 방식 · 손질 옵션을 고른 뒤 장바구니에 담거나 주문서로 넘긴다.
 * 배송지·결제는 주문서 페이지에서 한다. 가격은 고르지 않는다.
 */
export function ReservationForm({ pool }: ReservationFormProps) {
  const router = useRouter();
  const cart = useKgCart();
  useHydrateKgCart();

  const [kg, setKg] = useState(pool.minKg);
  const [trimAndSlice, setTrimAndSlice] = useState(false);
  const [receiveMethod, setReceiveMethod] = useState<ReceiveMethod>(DEFAULT_RECEIVE_METHOD);
  const [added, setAdded] = useState(false);
  const dineIn = isDineIn(receiveMethod);

  useEffect(() => {
    setKg((k) => clampKg(pool, k));
    setAdded(false);
  }, [pool.id, pool.minKg, pool.maxKg]); // eslint-disable-line react-hooks/exhaustive-deps

  // 매장에서 받기로 바꾸면 손질 옵션은 푼다
  useEffect(() => {
    if (dineIn) setTrimAndSlice(false);
  }, [dineIn]);

  const unitPrice = unitPriceOf(pool.pricePerKg, trimAndSlice);
  const amount = lineAmountOf(pool.pricePerKg, kg, trimAndSlice);
  const quickKgs = QUICK_KG.filter((k) => k >= pool.minKg && k <= pool.maxKg);
  const inCart = cart.items.find((i) => i.poolId === pool.id);

  const addToCart = () => {
    const next = clampKg(pool, (inCart?.kg ?? 0) + kg);
    if (inCart) {
      cart.setKg(pool.id, next);
      cart.setReceiveMethod(pool.id, receiveMethod);
      cart.setTrimAndSlice(pool.id, trimAndSlice);
    } else {
      cart.add(pool.id, next, trimAndSlice, receiveMethod);
    }
    setAdded(true);
  };

  // 바로 주문 · 이 줄 하나만 주문서로 넘긴다 · 로그인이 필요하면 주문서 경로가 로그인으로 보낸다
  const orderNow = () => {
    cart.startCheckout({ items: [{ poolId: pool.id, kg, trimAndSlice, receiveMethod }], slotItems: [], fromCart: false });
    router.push(CHECKOUT_HREF);
  };

  return (
    <div className="space-y-5">
      {/* 수량 */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-content-mid">몇 kg 드릴까요?</p>
            <p className="text-[12px] text-content-faint">
              1kg 단위 진공 포장 · {pool.minKg}~{pool.maxKg}kg
            </p>
          </div>
          <div className="inline-flex items-center rounded-lg border border-line">
            <button
              type="button"
              onClick={() => setKg((k) => Math.max(pool.minKg, k - 1))}
              disabled={kg <= pool.minKg}
              className="flex h-11 w-11 items-center justify-center text-content-mid hover:bg-surface-muted disabled:opacity-30"
              aria-label="1kg 줄이기"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-16 text-center text-[17px] font-bold tabular-nums text-content">{kg}kg</span>
            <button
              type="button"
              onClick={() => setKg((k) => Math.min(pool.maxKg, k + 1))}
              disabled={kg >= pool.maxKg}
              className="flex h-11 w-11 items-center justify-center text-content-mid hover:bg-surface-muted disabled:opacity-30"
              aria-label="1kg 늘리기"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
        {quickKgs.length > 1 ? (
          <div className="mt-3 flex gap-1.5">
            {quickKgs.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKg(k)}
                aria-pressed={kg === k}
                className={cn(
                  'h-8 flex-1 rounded-md border text-[12.5px] font-semibold tabular-nums transition-colors',
                  kg === k ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-content-mid hover:border-content-soft',
                )}
              >
                {k}kg
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* 옵션 · 수령 방식 먼저, 손질 옵션은 택배일 때만 */}
      <div>
        <p className="mb-2 text-[13px] font-semibold text-content-mid">옵션</p>
        <ReceiveMethodOption value={receiveMethod} onChange={setReceiveMethod} />
        {allowsTrimAndSlice(receiveMethod) ? <TrimSliceOption checked={trimAndSlice} onChange={setTrimAndSlice} className="mt-2" /> : null}
      </div>

      {/* 합계 */}
      <div className="rounded-xl bg-surface-accent/70 px-4 py-3.5">
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] font-semibold text-content-mid">결제 금액</span>
          <span className="text-[24px] font-bold tabular-nums tracking-[-0.02em] text-content">{formatWon(amount)}</span>
        </div>
        <p className="mt-1 text-[12px] tabular-nums text-content-faint">
          {kg}kg × {formatWon(unitPrice)}
          {trimAndSlice ? ` · ${TRIM_SLICE_LABEL} 포함` : ''}
          {dineIn ? ` · ${RECEIVE_METHOD_LABELS.dine_in}` : ' · 배송비 포함'}
        </p>
      </div>

      {added ? (
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
          className="inline-flex h-12 items-center justify-center gap-1.5 rounded-sm border border-line bg-surface text-[14px] font-bold text-content transition-colors hover:bg-surface-accent"
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
  );
}
