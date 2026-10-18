'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingBag, ShoppingCart } from 'lucide-react';
import { SmartImage } from '@/components/ui/smart-image';
import { cn } from '@/lib/utils';
import type { ConsumerProduct, ReceiveMethod } from '../../types';
import { formatWon, zoneAmount } from '../../lib/slots';
import { optionFeeOf, TRIM_SLICE_FEE_PER_KG, TRIM_SLICE_LABEL } from '../../lib/pools';
import { allowsTrimAndSlice, DEFAULT_RECEIVE_METHOD, isDineIn, RECEIVE_METHOD_LABELS } from '../../lib/receive';
import { useHydrateKgCart, useKgCart } from '../../lib/cartStore';
import { PrimaryButton } from '../FormField';
import { ReceiveMethodOption } from '../pools/ReceiveMethodOption';
import { TRIM_SLICE_CONSENT_ERROR, TrimSliceOption } from '../pools/TrimSliceOption';
import { productTitle } from './ProductTable';

interface ProductOrderPanelProps {
  selected?: ConsumerProduct;
  /** 표에서 고른 구좌 번호 · 한 번에 하나 */
  slotNo?: number;
  onSlotChange: (slotNo: number | undefined) => void;
}

const FALLBACK_THUMB = 'https://picsum.photos/seed/hanwoo-thumb/96/96';
const CHECKOUT_HREF = '/group-buy/checkout';

/**
 * 공동구매 표 오른쪽 주문 패널 · 1kg 구매 패널과 같은 구성.
 * 구좌(상·중·하)는 왼쪽 표에서 고르고, 여기서는 수령 방식·손질 옵션을 정해 장바구니에 담거나 주문서로 넘긴다.
 * 배송지·결제는 주문서 페이지에서 한다.
 */
export function ProductOrderPanel({ selected, slotNo, onSlotChange }: ProductOrderPanelProps) {
  const router = useRouter();
  const cart = useKgCart();
  useHydrateKgCart();

  const [trimAndSlice, setTrimAndSlice] = useState(false);
  const [trimConsent, setTrimConsent] = useState(false);
  const [receiveMethod, setReceiveMethod] = useState<ReceiveMethod>(DEFAULT_RECEIVE_METHOD);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<'added' | null>(null);

  useEffect(() => {
    setTrimAndSlice(false);
    setTrimConsent(false);
    setError('');
    setNotice(null);
  }, [selected?.id]);

  // 매장에서 받기로 바꾸면 손질 옵션은 푼다
  useEffect(() => {
    if (isDineIn(receiveMethod)) {
      setTrimAndSlice(false);
      setTrimConsent(false);
    }
  }, [receiveMethod]);

  // 새 구좌를 고르면 이전 안내를 지운다
  useEffect(() => {
    setError('');
    setNotice(null);
  }, [slotNo]);

  // 다른 사람이 먼저 가져간 구좌면 선택을 푼다
  useEffect(() => {
    if (!selected || slotNo === undefined) return;
    if (selected.soldSlotNos.includes(slotNo)) onSlotChange(undefined);
  }, [selected?.soldSlotNos]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const zone = selected.zones.find((z) => z.slotNo === slotNo);
  const soldOut = selected.zones.every((z) => z.sold);
  const inCart = zone ? cart.slotItems.some((i) => i.productId === selected.id && i.slotNo === zone.slotNo) : false;
  const amount = zone ? zoneAmount(zone, trimAndSlice) : 0;
  const dineIn = isDineIn(receiveMethod);
  const needPick = '왼쪽 표에서 주문 위치를 골라주세요.';

  const agreed = !trimAndSlice || trimConsent;

  const addToCart = () => {
    if (!zone) {
      setError(needPick);
      return;
    }
    if (!agreed) {
      setError(TRIM_SLICE_CONSENT_ERROR);
      return;
    }
    cart.addSlot(selected.id, zone.slotNo, trimAndSlice, receiveMethod);
    setError('');
    setNotice('added');
  };

  // 바로 주문 · 이 구좌 하나만 주문서로 넘긴다 · 로그인이 필요하면 주문서 경로가 로그인으로 보낸다
  const orderNow = () => {
    if (!zone) {
      setError(needPick);
      return;
    }
    if (!agreed) {
      setError(TRIM_SLICE_CONSENT_ERROR);
      return;
    }
    cart.startCheckout({ items: [], slotItems: [{ productId: selected.id, slotNo: zone.slotNo, trimAndSlice, receiveMethod }], fromCart: false });
    router.push(CHECKOUT_HREF);
  };

  return (
    <aside className="lg:sticky lg:top-24">
      <section className="rounded-sm border border-line bg-surface p-5">
        <h2 className="text-[15px] font-bold text-content">주문하기</h2>
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-sm bg-surface-accent">
              <SmartImage src={selected.images[0] ?? FALLBACK_THUMB} alt="" fill fallbackSrc={FALLBACK_THUMB} className="object-cover" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[16px] font-bold text-content">{productTitle(selected)}</p>
              <p className="truncate text-[12.5px] text-content-faint">
                {selected.cattle.listingNo}
                {selected.cattle.slaughterHouse ? ` · ${selected.cattle.slaughterHouse}` : ''}
              </p>
            </div>
            {zone ? <p className="shrink-0 text-[17px] font-bold tabular-nums text-content">{formatWon(zone.price)}</p> : null}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-content-mid">주문 위치</p>
            {zone ? (
              <p className="text-[14px] font-bold tabular-nums text-content">
                {zone.label} <span className="font-semibold text-content-soft">{zone.kg.toFixed(1)}kg</span>
              </p>
            ) : (
              <p className="text-[13px] text-content-faint">{soldOut ? '남은 부위가 없어요' : '표에서 골라주세요'}</p>
            )}
          </div>

          <div>
            <p className="mb-2 text-[13px] font-semibold text-content-mid">옵션</p>
            <ReceiveMethodOption value={receiveMethod} onChange={setReceiveMethod} disabled={soldOut} />
            {allowsTrimAndSlice(receiveMethod) ? (
              <TrimSliceOption
                checked={trimAndSlice}
                consented={trimConsent}
                onChange={(next) => {
                  setTrimAndSlice(next);
                  setTrimConsent(false);
                }}
                onConsentChange={(next) => {
                  setTrimConsent(next);
                  setError('');
                }}
                disabled={soldOut}
                className="mt-2"
              />
            ) : null}
          </div>

          <div className="border-t border-line-soft pt-3">
            {zone ? (
              <dl className="space-y-1 text-[13px]">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-content-mid">
                    {zone.kg.toFixed(1)}kg × {formatWon(zone.pricePerKg)}
                  </dt>
                  <dd className="font-semibold tabular-nums text-content">{formatWon(zone.price)}</dd>
                </div>
                {trimAndSlice ? (
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-content-mid">
                      {TRIM_SLICE_LABEL} <span className="text-content-faint">{zone.kg.toFixed(1)}kg × {formatWon(TRIM_SLICE_FEE_PER_KG)}</span>
                    </dt>
                    <dd className="font-semibold tabular-nums text-content">+{formatWon(optionFeeOf(zone.kg, true))}</dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
            <div className={cn('flex items-baseline justify-between', zone && 'mt-2 border-t border-dashed border-line-soft pt-2')}>
              <span className="text-[13px] font-semibold text-content-mid">{zone ? '결제 금액' : '부위를 골라주세요'}</span>
              <span className="text-[22px] font-bold tabular-nums tracking-[-0.02em] text-content">{formatWon(amount)}</span>
            </div>
            {zone ? <p className="mt-1 text-right text-[12px] text-content-faint">{dineIn ? RECEIVE_METHOD_LABELS.dine_in : '배송비 포함'}</p> : null}
          </div>

          {error ? (
            <p role="alert" className="rounded-sm bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-700">
              {error}
            </p>
          ) : null}
          {notice === 'added' ? (
            <p className="rounded-sm bg-surface-accent px-3.5 py-2.5 text-[13px] text-content">
              장바구니에 담았어요.{' '}
              <Link href="/group-buy/cart" className="font-semibold underline-offset-2 hover:underline">
                장바구니 보기
              </Link>
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={addToCart}
              disabled={soldOut}
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-sm border border-line bg-surface text-[14px] font-bold text-content transition-colors hover:bg-surface-accent disabled:opacity-40"
            >
              <ShoppingCart className="h-4 w-4" />
              {inCart ? '옵션 바꿔 담기' : '장바구니 담기'}
            </button>
            <PrimaryButton className="rounded-sm" onClick={orderNow} disabled={soldOut}>
              <ShoppingBag className="mr-1.5 h-4 w-4" />
              주문하기
            </PrimaryButton>
          </div>
        </div>
      </section>
    </aside>
  );
}
