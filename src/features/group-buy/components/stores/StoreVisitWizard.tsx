'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { PrimaryButton } from '../FormField';
import { EmptyState, Skeleton } from '../primitives';
import { StoreCard } from './StoreCard';
import { StoreMap } from './StoreMap';
import { PickupScheduler, type PickupSelection } from './PickupScheduler';
import { StoreStepBar, type StoreVisitStep } from './StoreStepBar';
import { StoreVisitCheckout } from './StoreVisitCheckout';
import { StoreVisitProducts } from './StoreVisitProducts';
import { StoreVisitSummary } from './StoreVisitSummary';
import { useConsumerPools, useConsumerProducts, useStores } from '../../hooks';
import {
  joinCartLines,
  joinSlotLines,
  useHydrateKgCart,
  useKgCart,
  type KgCartItem,
  type SlotCartItem,
  type StoreVisitDraft,
} from '../../lib/cartStore';
import { clampKg } from '../../lib/pools';
import { formatPickup } from '../../lib/stores';
import type { ProductZone } from '../../lib/slots';
import type { ConsumerPool, ConsumerProduct } from '../../types';

const STEP_COPY: Record<StoreVisitStep, { title: string; desc: string }> = {
  store: { title: '매장을 고르세요,', desc: '방문할 직영 매장을 지도에서 확인하세요.' },
  reserve: { title: '시간을 고르세요,', desc: '주문일 3일 뒤부터 방문 시간을 예약하세요.' },
  products: { title: '상품을 고르세요,', desc: '이번 방문에 벌크 구좌나 1kg를 담으세요. 손질은 매장에서 합니다.' },
  order: { title: '주문하세요,', desc: '받으실 분을 확인하고 결제하세요.' },
};

const DINE_IN = 'dine_in' as const;

interface DoneState {
  pickup: PickupSelection;
  count: number;
  failed: string[];
}

/** 매장이용 · 매장 → 예약 → 상품 → 주문. 담은 상품은 장바구니와 따로 둔다 */
export function StoreVisitWizard() {
  const hydrated = useHydrateKgCart();
  const setStoreVisit = useKgCart((s) => s.setStoreVisit);
  const setPreferredStore = useKgCart((s) => s.setPreferredStore);
  const { data: stores, isLoading } = useStores();
  const { data: products } = useConsumerProducts();
  const { data: pools } = useConsumerPools();

  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<StoreVisitStep>('store');
  const [storeId, setStoreId] = useState<string | null>(null);
  const [pickupAt, setPickupAt] = useState<string | null>(null);
  const [pickedSlots, setPickedSlots] = useState<Record<string, number[]>>({});
  const [kgItems, setKgItems] = useState<{ poolId: string; kg: number }[]>([]);
  const [ordered, setOrdered] = useState<DoneState | null>(null);
  const restored = useRef(false);

  useEffect(() => {
    if (!hydrated || restored.current) return;
    restored.current = true;
    const params = new URLSearchParams(window.location.search);
    const queryStore = params.get('store');
    const queryStep = params.get('step');
    const draft = useKgCart.getState().storeVisit;
    const asked = queryStep === 'reserve' || queryStep === 'products' || queryStep === 'order';
    if (draft && (asked || queryStore) && (!queryStore || draft.storeId === queryStore)) {
      setStoreId(draft.storeId);
      setPickupAt(draft.pickupAt);
      setPickedSlots(slotsFromDraft(draft));
      setKgItems(draft.kgItems);
      const hasGoods = draft.slotItems.length + draft.kgItems.length > 0;
      if (queryStep === 'reserve' || queryStep === 'products' || queryStep === 'order') setStep(queryStep);
      else setStep(hasGoods ? 'products' : 'reserve');
    } else if (queryStore) {
      setStoreId(queryStore);
      setStep('reserve');
    } else {
      setStoreVisit(null);
    }
    setReady(true);
  }, [hydrated]);

  useEffect(() => {
    if (!ready || !stores || !storeId) return;
    if (stores.some((store) => store.id === storeId)) return;
    setStoreId(null);
    setPickupAt(null);
    setStep('store');
  }, [ready, stores, storeId]);

  const store = useMemo(() => stores?.find((item) => item.id === storeId) ?? null, [stores, storeId]);
  const pickup: PickupSelection | null = store && pickupAt ? { storeId: store.id, pickupAt, store } : null;

  const slotItems = useMemo<SlotCartItem[]>(
    () =>
      Object.entries(pickedSlots).flatMap(([productId, slotNos]) =>
        slotNos.map((slotNo) => ({ productId, slotNo, trimAndSlice: false, receiveMethod: DINE_IN })),
      ),
    [pickedSlots],
  );
  const kgCartItems = useMemo<KgCartItem[]>(
    () => kgItems.map((item) => ({ poolId: item.poolId, kg: item.kg, trimAndSlice: false, receiveMethod: DINE_IN })),
    [kgItems],
  );
  const slotLines = useMemo(() => joinSlotLines(slotItems, products ?? []), [slotItems, products]);
  const kgLines = useMemo(() => joinCartLines(kgCartItems, pools ?? []), [kgCartItems, pools]);
  const hasGoods = slotLines.length + kgLines.length > 0;

  useEffect(() => {
    if (!ready || ordered || !storeId || !pickupAt) return;
    setStoreVisit({
      storeId,
      pickupAt,
      slotItems: slotItems.map((item) => ({ productId: item.productId, slotNo: item.slotNo })),
      kgItems,
    });
    setPreferredStore(storeId);
  }, [ready, ordered, storeId, pickupAt, slotItems, kgItems, setStoreVisit, setPreferredStore]);

  const chooseStore = (id: string) => {
    if (id === storeId) return;
    setStoreId(id);
    setPickupAt(null);
    setPreferredStore(id);
  };

  const toggleZone = (product: ConsumerProduct, zone: ProductZone) => {
    if (zone.sold) return;
    setPickedSlots((prev) => {
      const current = prev[product.id] ?? [];
      const next = current.includes(zone.slotNo) ? current.filter((no) => no !== zone.slotNo) : [...current, zone.slotNo];
      return { ...prev, [product.id]: next };
    });
  };

  const removeSlot = (productId: string, slotNo: number) => {
    setPickedSlots((prev) => ({ ...prev, [productId]: (prev[productId] ?? []).filter((no) => no !== slotNo) }));
  };

  const addKg = (pool: ConsumerPool) => {
    setKgItems((prev) => (prev.some((item) => item.poolId === pool.id) ? prev : [...prev, { poolId: pool.id, kg: clampKg(pool, Math.max(pool.minKg, 1)) }]));
  };

  const dropSucceeded = (slots: { productId: string; slotNo: number }[], poolIds: string[]) => {
    setPickedSlots((prev) => {
      const next = { ...prev };
      for (const slot of slots) next[slot.productId] = (next[slot.productId] ?? []).filter((no) => no !== slot.slotNo);
      return next;
    });
    setKgItems((prev) => prev.filter((item) => !poolIds.includes(item.poolId)));
  };

  const finish = (donePickup: PickupSelection, count: number, failed: string[]) => {
    setStoreVisit(null);
    setOrdered({ pickup: donePickup, count, failed });
  };

  const enabled: Record<StoreVisitStep, boolean> = {
    store: true,
    reserve: !!storeId,
    products: !!pickup,
    order: !!pickup && hasGoods,
  };

  const go = (next: StoreVisitStep) => {
    if (!enabled[next]) return;
    setStep(next);
  };

  if (ordered) {
    return <VisitDone done={ordered} />;
  }

  const copy = STEP_COPY[step];

  return (
    <>
      <StoreStepBar step={step} enabled={enabled} onGo={go} />
      <h1 className="mt-6 text-[30px] font-bold leading-[1.2] tracking-[-0.03em] text-content">{copy.title}</h1>
      <p className="mt-1 max-w-[720px] text-[13.5px] leading-relaxed text-content-soft">{copy.desc}</p>

      {step === 'store' ? (
        isLoading ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
            <Skeleton className="h-[560px] rounded-sm" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-[112px] rounded-sm" />
              ))}
            </div>
          </div>
        ) : !stores || stores.length === 0 ? (
          <div className="mt-8">
            <EmptyState title="운영 중인 매장이 없어요" description="매장이 준비되면 여기에서 예약할 수 있어요." />
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
            <StoreMap stores={stores} selectedId={storeId} onSelect={(item) => chooseStore(item.id)} className="h-[420px] lg:sticky lg:top-24 lg:h-[640px]" />
            <div>
              <ul className="space-y-3">
                {stores.map((item) => (
                  <li key={item.id}>
                    <StoreCard store={item} selected={item.id === storeId} onSelect={(next) => chooseStore(next.id)} />
                  </li>
                ))}
              </ul>
              <PrimaryButton className="mt-4 rounded-sm" disabled={!storeId} onClick={() => go('reserve')}>
                이 매장에서 이용하기
              </PrimaryButton>
            </div>
          </div>
        )
      ) : null}

      {step !== 'store' && !store && isLoading ? <Skeleton className="mt-8 h-[360px] rounded-sm" /> : null}

      {step === 'reserve' && storeId ? (
        <section className="mt-8 max-w-[760px] rounded-sm border border-line bg-surface p-5">
          <PickupScheduler
            value={pickup}
            onChange={(next) => setPickupAt(next?.pickupAt ?? null)}
            preferredStoreId={storeId}
            lockStore
            showMapLink={false}
          />
          <div className="mt-5 flex gap-2">
            <button type="button" onClick={() => go('store')} className="inline-flex h-12 flex-1 items-center justify-center rounded-sm border border-line text-[14px] font-semibold text-content-soft hover:bg-surface-accent">
              이전
            </button>
            <PrimaryButton className="flex-1 rounded-sm" disabled={!pickup} onClick={() => go('products')}>
              상품 고르기
            </PrimaryButton>
          </div>
        </section>
      ) : null}

      {step === 'products' && pickup ? (
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0">
            <StoreVisitProducts pickedSlots={pickedSlots} onToggleZone={toggleZone} onAddKg={addKg} />
          </div>
          <StoreVisitSummary
            pickup={pickup}
            slotLines={slotLines}
            kgLines={kgLines}
            onRemoveSlot={removeSlot}
            onKg={(poolId, kg) => setKgItems((prev) => prev.map((item) => (item.poolId === poolId ? { ...item, kg } : item)))}
            onRemoveKg={(poolId) => setKgItems((prev) => prev.filter((item) => item.poolId !== poolId))}
            onOrder={() => go('order')}
            onBack={() => go('reserve')}
          />
        </div>
      ) : null}

      {step === 'order' && pickup ? (
        <StoreVisitCheckout pickup={pickup} slotLines={slotLines} kgLines={kgLines} onBack={() => go('products')} onDrop={dropSucceeded} onDone={finish} />
      ) : null}
    </>
  );
}

function slotsFromDraft(draft: StoreVisitDraft): Record<string, number[]> {
  return draft.slotItems.reduce<Record<string, number[]>>((acc, item) => {
    acc[item.productId] = [...(acc[item.productId] ?? []), item.slotNo];
    return acc;
  }, {});
}

function VisitDone({ done }: { done: DoneState }) {
  return (
    <div className="mx-auto max-w-[560px] py-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
        <CheckCircle2 className="h-9 w-9 text-emerald-600" />
      </div>
      <h1 className="mt-5 text-[26px] font-bold tracking-[-0.02em] text-content">방문 예약이 접수됐어요</h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-content-soft">
        {done.count}건을 결제했어요. 예약한 시간에 매장으로 오시면 됩니다.
        <br />
        픽업 전날까지 내 주문에서 시간을 바꿀 수 있어요.
      </p>
      <div className="mx-auto mt-5 max-w-[420px] rounded-sm border border-line bg-surface px-4 py-3 text-left">
        <p className="text-[12.5px] font-semibold text-content-mid">방문 예약</p>
        <p className="mt-0.5 text-[15px] font-bold text-content">{done.pickup.store.name}</p>
        <p className="text-[13px] text-content-soft">
          {done.pickup.store.address} {done.pickup.store.addressDetail}
        </p>
        <p className="mt-1 text-[14px] font-bold tabular-nums text-content">{formatPickup(done.pickup.pickupAt)}</p>
      </div>
      {done.failed.length > 0 ? (
        <div className="mt-5 rounded-sm bg-rose-50 px-4 py-3 text-left text-[13px] leading-relaxed text-rose-700">
          <p className="font-semibold">일부 주문은 접수되지 않았어요</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {done.failed.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="mt-7 flex items-center justify-center gap-3">
        <Link href="/group-buy/mypage/orders" className="inline-flex h-11 items-center rounded-sm bg-ink px-5 text-[14px] font-bold text-white hover:bg-ink-hover">
          내 주문 보기
        </Link>
        <Link href="/group-buy/stores" className="inline-flex h-11 items-center rounded-sm border border-line bg-surface px-5 text-[14px] font-semibold text-content hover:bg-surface-accent">
          매장이용
        </Link>
      </div>
    </div>
  );
}
