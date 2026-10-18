'use client';

import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GiftCellCount } from './gift';
import type { ConsumerPool, ConsumerProduct, ReceiveMethod } from '../types';
import { isOpen } from './homeFilters';
import { lineAmountOf } from './pools';
import { allowsTrimAndSlice, toReceiveMethod } from './receive';
import { zoneAmount, type ProductZone } from './slots';

export interface KgCartItem {
  poolId: string;
  kg: number;
  /** 근막 제거 + 썰어 받기 · 택배일 때만 */
  trimAndSlice: boolean;
  receiveMethod: ReceiveMethod;
}

/** 공동구매 구좌 하나 · 상품 × 상단/중단/하단 (+ 손질 옵션 · 수령 방식) */
export interface SlotCartItem {
  productId: string;
  slotNo: number;
  trimAndSlice: boolean;
  receiveMethod: ReceiveMethod;
}

type SlotRef = Pick<SlotCartItem, 'productId' | 'slotNo'>;

/**
 * 주문서 초안 · "주문하기"를 누른 순간의 줄 묶음.
 * 장바구니에서 왔으면 결제가 끝난 줄을 장바구니에서도 뺀다.
 */
export interface CheckoutDraft {
  items: KgCartItem[];
  slotItems: SlotCartItem[];
  fromCart: boolean;
}

/** 매장이용 초안 · 매장·방문 시간과 그 방문에 담은 벌크·1kg. 장바구니와 섞지 않는다 */
export interface StoreVisitDraft {
  storeId: string;
  pickupAt: string;
  slotItems: { productId: string; slotNo: number }[];
  kgItems: { poolId: string; kg: number }[];
}

/** 선물세트 초안 · 빌더에서 주문서으로 넘긴다 */
export interface GiftDraft {
  cellCount: GiftCellCount;
  quantity: number;
  cells: { cellNo: number; productId: string | null; poolId: string | null; kg: number }[];
  supplies?: { cellNos: number[]; bulks: { productId: string; slotNos: number[] }[]; poolId: string | null; kg: number; leftoverMode?: 'pack' | 'separate' }[];
}

/** 장바구니 줄 · 풀 데이터와 합친 것 */
export interface OrderLine {
  pool: ConsumerPool;
  kg: number;
  trimAndSlice: boolean;
  receiveMethod: ReceiveMethod;
}

/** 장바구니 줄 · 상품·구좌 데이터와 합친 것 */
export interface SlotLine {
  product: ConsumerProduct;
  zone: ProductZone;
  trimAndSlice: boolean;
  receiveMethod: ReceiveMethod;
}

interface KgCartState {
  items: KgCartItem[];
  slotItems: SlotCartItem[];
  checkout: CheckoutDraft | null;
  giftDraft: GiftDraft | null;
  setGiftDraft: (draft: GiftDraft | null) => void;
  /** 매장이용에서 고른 방문 · 로그인 뒤에 주문 단계로 돌아온다 */
  storeVisit: StoreVisitDraft | null;
  setStoreVisit: (draft: StoreVisitDraft | null) => void;
  /** 매장이용에서 고른 매장 · 주문서의 기본 선택 */
  preferredStoreId: string | null;
  setPreferredStore: (storeId: string | null) => void;
  /** 주문서 페이지로 넘길 줄을 적어 둔다 · 바로 주문이면 fromCart=false */
  startCheckout: (draft: CheckoutDraft) => void;
  clearCheckout: () => void;
  /** 같은 풀이 있으면 kg을 더하고 옵션은 덮어쓴다 · 상한은 호출부에서 잘라 넘긴다 */
  add: (poolId: string, kg: number, trimAndSlice: boolean, receiveMethod: ReceiveMethod) => void;
  setKg: (poolId: string, kg: number) => void;
  setTrimAndSlice: (poolId: string, trimAndSlice: boolean) => void;
  setReceiveMethod: (poolId: string, receiveMethod: ReceiveMethod) => void;
  remove: (poolId: string) => void;
  removeMany: (poolIds: string[]) => void;
  /** 구좌 담기 · 이미 있으면 옵션만 덮어쓴다 */
  addSlot: (productId: string, slotNo: number, trimAndSlice: boolean, receiveMethod: ReceiveMethod) => void;
  setSlotTrimAndSlice: (productId: string, slotNo: number, trimAndSlice: boolean) => void;
  setSlotReceiveMethod: (productId: string, slotNo: number, receiveMethod: ReceiveMethod) => void;
  removeSlot: (productId: string, slotNo: number) => void;
  removeSlots: (items: SlotRef[]) => void;
  clear: () => void;
}

const sameSlot = (a: SlotRef, b: SlotRef) => a.productId === b.productId && a.slotNo === b.slotNo;

function readStoreVisit(value: StoreVisitDraft | null | undefined): StoreVisitDraft | null {
  if (!value || typeof value.storeId !== 'string' || typeof value.pickupAt !== 'string') return null;
  const slotItems = Array.isArray(value.slotItems)
    ? value.slotItems.flatMap((item) => (item?.productId && typeof item.slotNo === 'number' ? [{ productId: item.productId, slotNo: item.slotNo }] : []))
    : [];
  const kgItems = Array.isArray(value.kgItems)
    ? value.kgItems.flatMap((item) => (item?.poolId && typeof item.kg === 'number' ? [{ poolId: item.poolId, kg: item.kg }] : []))
    : [];
  return { storeId: value.storeId, pickupAt: value.pickupAt, slotItems, kgItems };
}

/**
 * 장바구니 · 1kg 구매(풀 id·kg·손질 옵션)와 공동구매 구좌(상품 id·구좌 번호)를 함께 담는다.
 * 가격은 항상 서버 목록에서 다시 읽는다.
 * SSR 불일치를 피하려고 수동 rehydrate(skipHydration) 한다 — `useHydrateKgCart` 로 호출.
 */
export const useKgCart = create<KgCartState>()(
  persist(
    (set) => ({
      items: [],
      slotItems: [],
      checkout: null,
      giftDraft: null,
      setGiftDraft: (draft) => set({ giftDraft: draft }),
      storeVisit: null,
      setStoreVisit: (draft) => set({ storeVisit: draft }),
      preferredStoreId: null,
      setPreferredStore: (storeId) => set({ preferredStoreId: storeId }),
      startCheckout: (draft) => set({ checkout: draft }),
      clearCheckout: () => set({ checkout: null }),
      add: (poolId, kg, trimAndSlice, receiveMethod) =>
        set((s) => {
          const option = allowsTrimAndSlice(receiveMethod) && trimAndSlice;
          const exists = s.items.some((i) => i.poolId === poolId);
          return {
            items: exists
              ? s.items.map((i) => (i.poolId === poolId ? { ...i, kg: i.kg + kg, trimAndSlice: option, receiveMethod } : i))
              : [...s.items, { poolId, kg, trimAndSlice: option, receiveMethod }],
          };
        }),
      setKg: (poolId, kg) => set((s) => ({ items: s.items.map((i) => (i.poolId === poolId ? { ...i, kg } : i)) })),
      setTrimAndSlice: (poolId, trimAndSlice) => set((s) => ({ items: s.items.map((i) => (i.poolId === poolId ? { ...i, trimAndSlice } : i)) })),
      setReceiveMethod: (poolId, receiveMethod) =>
        set((s) => ({
          items: s.items.map((i) => (i.poolId === poolId ? { ...i, receiveMethod, trimAndSlice: allowsTrimAndSlice(receiveMethod) && i.trimAndSlice } : i)),
        })),
      remove: (poolId) => set((s) => ({ items: s.items.filter((i) => i.poolId !== poolId) })),
      removeMany: (poolIds) => set((s) => ({ items: s.items.filter((i) => !poolIds.includes(i.poolId)) })),
      addSlot: (productId, slotNo, trimAndSlice, receiveMethod) =>
        set((s) => {
          const next = { productId, slotNo, trimAndSlice: allowsTrimAndSlice(receiveMethod) && trimAndSlice, receiveMethod };
          const exists = s.slotItems.some((i) => sameSlot(i, next));
          return { slotItems: exists ? s.slotItems.map((i) => (sameSlot(i, next) ? next : i)) : [...s.slotItems, next] };
        }),
      setSlotTrimAndSlice: (productId, slotNo, trimAndSlice) =>
        set((s) => ({ slotItems: s.slotItems.map((i) => (sameSlot(i, { productId, slotNo }) ? { ...i, trimAndSlice } : i)) })),
      // 매장에서 받기로 바꾸면 손질 옵션은 함께 푼다 · 택배일 때만 고를 수 있는 옵션
      setSlotReceiveMethod: (productId, slotNo, receiveMethod) =>
        set((s) => ({
          slotItems: s.slotItems.map((i) =>
            sameSlot(i, { productId, slotNo }) ? { ...i, receiveMethod, trimAndSlice: allowsTrimAndSlice(receiveMethod) && i.trimAndSlice } : i,
          ),
        })),
      removeSlot: (productId, slotNo) => set((s) => ({ slotItems: s.slotItems.filter((i) => !sameSlot(i, { productId, slotNo })) })),
      removeSlots: (items) => set((s) => ({ slotItems: s.slotItems.filter((i) => !items.some((r) => sameSlot(i, r))) })),
      clear: () => set({ items: [], slotItems: [] }),
    }),
    {
      name: 'gb.kg.cart',
      version: 10,
      skipHydration: true,
      partialize: (s) => ({ items: s.items, slotItems: s.slotItems, checkout: s.checkout, giftDraft: s.giftDraft, storeVisit: s.storeVisit, preferredStoreId: s.preferredStoreId }),
      // v1 에는 옵션이 없었다 · v2 에는 구좌가 없었다 · v3 구좌에는 옵션이 없었다 · v4 구좌에는 수령 방식이 없었다 · v5 kg 줄에는 수령 방식이 없었다 · v6 에는 주문서 초안이 없었다 · v7 에는 선호 매장이 없었다 · v9 까지는 매장이용 초안이 없었다
      migrate: (persisted) => {
        const state = persisted as
          | {
              items?: Array<Partial<KgCartItem>>;
              slotItems?: Array<Partial<SlotCartItem>>;
              checkout?: CheckoutDraft | null;
              giftDraft?: GiftDraft | null;
              storeVisit?: StoreVisitDraft | null;
              preferredStoreId?: string | null;
            }
          | undefined;
        return {
          items: (state?.items ?? []).flatMap((i) =>
            i.poolId && typeof i.kg === 'number'
              ? [{ poolId: i.poolId, kg: i.kg, trimAndSlice: i.trimAndSlice === true, receiveMethod: toReceiveMethod(i.receiveMethod) }]
              : [],
          ),
          slotItems: (state?.slotItems ?? []).flatMap((i) =>
            i.productId && typeof i.slotNo === 'number'
              ? [{ productId: i.productId, slotNo: i.slotNo, trimAndSlice: i.trimAndSlice === true, receiveMethod: toReceiveMethod(i.receiveMethod) }]
              : [],
          ),
          checkout: state?.checkout ?? null,
          giftDraft: state?.giftDraft ?? null,
          storeVisit: readStoreVisit(state?.storeVisit),
          preferredStoreId: typeof state?.preferredStoreId === 'string' ? state.preferredStoreId : null,
        } as KgCartState;
      },
    },
  ),
);

/**
 * 마운트 후 localStorage 에서 장바구니를 읽는다 · 헤더·패널·장바구니 페이지가 각자 부른다.
 * 읽기가 끝났는지 돌려준다 — 주문서 페이지가 "비어 있음"을 섣불리 보여주지 않게.
 */
export function useHydrateKgCart() {
  // 서버 렌더에서는 persist API 가 없다 · 항상 "아직" 으로 시작해 SSR 결과와 맞춘다
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const api = useKgCart.persist;
    if (!api) return;
    if (api.hasHydrated()) setHydrated(true);
    const unsubscribe = api.onFinishHydration(() => setHydrated(true));
    void api.rehydrate();
    return unsubscribe;
  }, []);
  return hydrated;
}

/** 헤더 배지용 · kg 줄 + 구좌 줄 */
export const useCartCount = () => useKgCart((s) => s.items.length + s.slotItems.length);

/** 장바구니 항목 ↔ 현재 열린 풀 목록을 합친다 · 닫힌 풀은 조용히 뺀다 */
export function joinCartLines(items: KgCartItem[], pools: ConsumerPool[]): OrderLine[] {
  const byId = new Map(pools.map((p) => [p.id, p]));
  return items.flatMap((item) => {
    const pool = byId.get(item.poolId);
    return pool ? [{ pool, kg: item.kg, trimAndSlice: item.trimAndSlice, receiveMethod: toReceiveMethod(item.receiveMethod) }] : [];
  });
}

/** 구좌 항목 ↔ 현재 모집 중인 상품을 합친다 · 마감됐거나 먼저 팔린 구좌는 조용히 뺀다 */
export function joinSlotLines(items: SlotCartItem[], products: ConsumerProduct[]): SlotLine[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  return items.flatMap((item) => {
    const product = byId.get(item.productId);
    if (!product || !isOpen(product)) return [];
    const zone = product.zones.find((z) => z.slotNo === item.slotNo);
    return zone && !zone.sold ? [{ product, zone, trimAndSlice: item.trimAndSlice, receiveMethod: toReceiveMethod(item.receiveMethod) }] : [];
  });
}

export const lineAmount = (line: OrderLine) => lineAmountOf(line.pool.pricePerKg, line.kg, line.trimAndSlice);

export const sumLineAmount = (lines: OrderLine[]) => lines.reduce((acc, l) => acc + lineAmount(l), 0);

export const slotLineAmount = (line: SlotLine) => zoneAmount(line.zone, line.trimAndSlice);

export const sumSlotAmount = (lines: SlotLine[]) => lines.reduce((acc, l) => acc + slotLineAmount(l), 0);
