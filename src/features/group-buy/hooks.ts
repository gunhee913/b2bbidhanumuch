'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { groupBy } from 'es-toolkit';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import type { OrderLine, SlotLine } from './lib/cartStore';
import { gradeWithMarbling } from './lib/format';
import { poolTitle } from './lib/pools';
import { isDineIn } from './lib/receive';
import { EMPTY_SHIPPING, shippingSchema, type ShippingForm } from './lib/shipping';
import {
  ApiError,
  cancelConsumerOrder,
  cancelConsumerReservation,
  createConsumerOrder,
  createConsumerReservation,
  expireAdminProducts,
  fetchAdminPools,
  fetchAdminProductDetail,
  fetchAdminProducts,
  fetchConsumerOrder,
  fetchConsumerOrders,
  fetchConsumerPool,
  fetchConsumerPools,
  fetchConsumerProduct,
  fetchProductCerts,
  fetchConsumerProducts,
  fetchConsumerReservations,
  fetchConsumerGiftSet,
  fetchConsumerGiftSets,
  fetchGiftSettings,
  fetchAdminGifts,
  fetchAdminStores,
  createConsumerGiftSet,
  cancelConsumerGiftSet,
  fetchGroupBuySettings,
  fetchStore,
  fetchStores,
  fetchStoreSlots,
  fetchPartDefaults,
  matchAdminPools,
  publishAdminProduct,
  refundAdminOrder,
  saveAdminPool,
  saveAdminStore,
  savePartDefault,
  syncAdminDrafts,
  transitionAdminProduct,
  unpublishAdminProduct,
  updateAdminProductSettings,
  updateGroupBuySettings,
  updateAdminGiftSettings,
  updateOrderPickup,
  updateReservationPickup,
} from './api';
import type {
  ConsumerPoolFilter,
  ConsumerProductFilter,
  CreateGiftSetInput,
  CreateOrderInput,
  CreateReservationInput,
  GroupBuyPartDefault,
  GroupBuyStatus,
  PickupInput,
  ShippingInfo,
  UpdateProductSettingsInput,
  UpsertPoolInput,
  UpsertStoreInput,
} from './types';

export const groupBuyKeys = {
  all: ['group-buy'] as const,
  products: (filter: ConsumerProductFilter = {}) => ['group-buy', 'products', filter] as const,
  product: (id: string) => ['group-buy', 'product', id] as const,
  productCerts: (id: string) => ['group-buy', 'product', id, 'certs'] as const,
  orders: () => ['group-buy', 'orders'] as const,
  order: (id: string) => ['group-buy', 'order', id] as const,
  pools: (filter: ConsumerPoolFilter = {}) => ['group-buy', 'pools', filter] as const,
  pool: (id: string) => ['group-buy', 'pool', id] as const,
  reservations: () => ['group-buy', 'reservations'] as const,
  stores: () => ['group-buy', 'stores'] as const,
  store: (slug: string) => ['group-buy', 'store', slug] as const,
  storeSlots: (storeId: string, date: string) => ['group-buy', 'store', storeId, 'slots', date] as const,
  giftSettings: () => ['group-buy', 'gift-settings'] as const,
  gifts: () => ['group-buy', 'gifts'] as const,
  gift: (id: string) => ['group-buy', 'gift', id] as const,
  adminGifts: () => ['group-buy', 'admin', 'gifts'] as const,
  adminStores: () => ['group-buy', 'admin', 'stores'] as const,
  adminPools: () => ['group-buy', 'admin', 'pools'] as const,
  adminProducts: (filter: { status?: GroupBuyStatus | 'all'; date?: string } = {}) =>
    ['group-buy', 'admin', 'products', filter] as const,
  adminProduct: (id: string) => ['group-buy', 'admin', 'product', id] as const,
  partDefaults: () => ['group-buy', 'admin', 'part-defaults'] as const,
  settings: () => ['group-buy', 'admin', 'settings'] as const,
};

// ---------- 소비자 ----------

export function useConsumerProducts(filter: ConsumerProductFilter = {}) {
  return useQuery({ queryKey: groupBuyKeys.products(filter), queryFn: () => fetchConsumerProducts(filter), staleTime: 15_000 });
}

export function useConsumerProduct(id: string | null) {
  return useQuery({
    queryKey: groupBuyKeys.product(id ?? ''),
    queryFn: () => fetchConsumerProduct(id!),
    enabled: !!id,
  });
}

/** 증명서 스캔본 · 파일이 커서 상세 본문과 따로 받는다 · 10분 캐시 */
export function useProductCerts(id: string | null) {
  return useQuery({
    queryKey: groupBuyKeys.productCerts(id ?? ''),
    queryFn: () => fetchProductCerts(id!),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
}

/** 구좌 선점·상태 변경을 실시간으로 반영 · 상품 목록·상세 공용 */
export function useRealtimeGroupBuy(enabled = true) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: groupBuyKeys.all });
  useRealtimeTable({ table: 'group_buy_order_slots', onChange: invalidate, enabled });
  useRealtimeTable({ table: 'group_buy_products', onChange: invalidate, enabled });
}

// ---------- 소비자 · kg 수요 풀 ----------

export function useConsumerPools(filter: ConsumerPoolFilter = {}) {
  return useQuery({ queryKey: groupBuyKeys.pools(filter), queryFn: () => fetchConsumerPools(filter), staleTime: 10_000 });
}

export function useConsumerPool(id: string | null) {
  return useQuery({ queryKey: groupBuyKeys.pool(id ?? ''), queryFn: () => fetchConsumerPool(id!), enabled: !!id });
}

/** 다른 사람의 참여가 들어올 때 모인 중량이 바로 자라게 */
export function useRealtimePools(enabled = true) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: groupBuyKeys.all });
  useRealtimeTable({ table: 'group_buy_reservations', onChange: invalidate, enabled });
  useRealtimeTable({ table: 'group_buy_products', onChange: invalidate, enabled });
}

export function useConsumerReservations(enabled = true) {
  return useQuery({ queryKey: groupBuyKeys.reservations(), queryFn: fetchConsumerReservations, enabled });
}

export function useCreateReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReservationInput) => createConsumerReservation(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupBuyKeys.all }),
  });
}

export function useCancelReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelConsumerReservation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupBuyKeys.all }),
  });
}

/**
 * 배송지 폼 · 로그인한 소비자의 가입 주소로 채워 두고 접어둔다.
 * 주소가 없으면 바로 펼쳐서 입력을 받는다.
 */
export function useShippingForm() {
  const { data: session, status } = useSession();
  const consumer = session?.consumer;
  const loggedIn = status === 'authenticated' && !!consumer;
  const form = useForm<ShippingForm>({ resolver: zodResolver(shippingSchema), defaultValues: EMPTY_SHIPPING });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!consumer) return;
    form.reset({
      name: consumer.name ?? '',
      phone: consumer.phone ?? '',
      zipcode: consumer.zipcode ?? '',
      address: consumer.address ?? '',
      addressDetail: consumer.addressDetail ?? '',
      memo: '',
    });
    if (!consumer.address) setOpen(true);
  }, [consumer, form]);

  return { form, open, setOpen, loggedIn };
}

export interface SubmitKgOrdersResult {
  succeeded: OrderLine[];
  failed: string[];
}

/** 여러 풀에 kg 주문을 순서대로 넣는다 · 실패한 줄은 메시지로 모아 돌려준다 */
export function useSubmitKgOrders() {
  const create = useCreateReservation();
  const [isPending, setIsPending] = useState(false);

  const submit = useCallback(
    async (lines: OrderLine[], shipping: ShippingInfo, pickup?: PickupInput): Promise<SubmitKgOrdersResult> => {
      setIsPending(true);
      const succeeded: OrderLine[] = [];
      const failed: string[] = [];
      for (const line of lines) {
        try {
          await create.mutateAsync({
            poolId: line.pool.id,
            kg: line.kg,
            trimAndSlice: line.trimAndSlice,
            receiveMethod: line.receiveMethod,
            pickup: isDineIn(line.receiveMethod) ? pickup : undefined,
            shipping,
          });
          succeeded.push(line);
        } catch (e) {
          failed.push(`${poolTitle(line.pool)}: ${e instanceof Error ? e.message : '주문하지 못했어요.'}`);
        }
      }
      setIsPending(false);
      return { succeeded, failed };
    },
    [create],
  );

  return { submit, isPending };
}

export interface SubmitSlotOrdersResult {
  succeeded: SlotLine[];
  failed: string[];
}

/**
 * 장바구니의 구좌 줄을 상품·옵션·수령 방식별로 묶어 주문한다 · 같은 상품·같은 옵션·같은 수령 방식 = 주문 하나.
 * 누가 먼저 가져간 구좌(409)는 그 줄만 실패로 돌려주고 나머지 구좌로 다시 시도한다.
 */
export function useSubmitSlotOrders() {
  const create = useCreateOrder();
  const [isPending, setIsPending] = useState(false);

  const submit = useCallback(
    async (lines: SlotLine[], shipping: ShippingInfo, pickup?: PickupInput): Promise<SubmitSlotOrdersResult> => {
      setIsPending(true);
      const succeeded: SlotLine[] = [];
      const failed: string[] = [];
      const byProduct = groupBy(lines, (l) => `${l.product.id}:${l.trimAndSlice}:${l.receiveMethod}`);

      for (const group of Object.values(byProduct)) {
        const { product, trimAndSlice, receiveMethod } = group[0];
        const linePickup = isDineIn(receiveMethod) ? pickup : undefined;
        const title = `${product.partName} ${gradeWithMarbling(product.cattle.grade, product.cattle.marblingScore)}`;
        let pending = group;
        try {
          await create.mutateAsync({ productId: product.id, slotNos: pending.map((l) => l.zone.slotNo), trimAndSlice, receiveMethod, pickup: linePickup, shipping });
          succeeded.push(...pending);
          continue;
        } catch (e) {
          const taken = e instanceof ApiError && e.status === 409 ? new Set(e.takenSlotNos ?? []) : null;
          if (!taken || taken.size === 0) {
            failed.push(`${title}: ${e instanceof Error ? e.message : '주문하지 못했어요.'}`);
            continue;
          }
          failed.push(`${title} ${pending.filter((l) => taken.has(l.zone.slotNo)).map((l) => l.zone.label).join('·')}: 방금 다른 분이 먼저 주문했어요.`);
          pending = pending.filter((l) => !taken.has(l.zone.slotNo));
        }
        if (pending.length === 0) continue;
        try {
          await create.mutateAsync({ productId: product.id, slotNos: pending.map((l) => l.zone.slotNo), trimAndSlice, receiveMethod, pickup: linePickup, shipping });
          succeeded.push(...pending);
        } catch (e) {
          failed.push(`${title}: ${e instanceof Error ? e.message : '주문하지 못했어요.'}`);
        }
      }
      setIsPending(false);
      return { succeeded, failed };
    },
    [create],
  );

  return { submit, isPending };
}

export function useConsumerOrders(enabled = true) {
  return useQuery({ queryKey: groupBuyKeys.orders(), queryFn: fetchConsumerOrders, enabled });
}

export function useConsumerOrder(id: string | null) {
  return useQuery({ queryKey: groupBuyKeys.order(id ?? ''), queryFn: () => fetchConsumerOrder(id!), enabled: !!id });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrderInput) => createConsumerOrder(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupBuyKeys.all }),
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelConsumerOrder(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupBuyKeys.all }),
  });
}

// ---------- 매장 · 픽업 ----------

export function useStores() {
  return useQuery({ queryKey: groupBuyKeys.stores(), queryFn: fetchStores, staleTime: 5 * 60 * 1000 });
}

export function useStore(slug: string | null) {
  return useQuery({ queryKey: groupBuyKeys.store(slug ?? ''), queryFn: () => fetchStore(slug!), enabled: !!slug, staleTime: 5 * 60 * 1000 });
}

/** 하루치 픽업 슬롯 · 잔여는 자주 바뀌니 짧게만 캐시 */
export function useStoreSlots(storeId: string | null, date: string | null) {
  return useQuery({
    queryKey: groupBuyKeys.storeSlots(storeId ?? '', date ?? ''),
    queryFn: () => fetchStoreSlots(storeId!, date!),
    enabled: !!storeId && !!date,
    staleTime: 15 * 1000,
  });
}

export function useUpdateOrderPickup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, input }: { orderId: string; input: PickupInput }) => updateOrderPickup(orderId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupBuyKeys.all }),
  });
}

export function useUpdateReservationPickup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reservationId, input }: { reservationId: string; input: PickupInput }) => updateReservationPickup(reservationId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupBuyKeys.all }),
  });
}

export function useAdminStores() {
  return useQuery({ queryKey: groupBuyKeys.adminStores(), queryFn: fetchAdminStores });
}

export function useSaveAdminStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertStoreInput) => saveAdminStore(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupBuyKeys.adminStores() });
      queryClient.invalidateQueries({ queryKey: groupBuyKeys.stores() });
    },
  });
}

// ---------- 선물세트 ----------

export function useGiftSettings() {
  return useQuery({ queryKey: groupBuyKeys.giftSettings(), queryFn: fetchGiftSettings, staleTime: 60 * 1000 });
}

export function useConsumerGiftSets(enabled = true) {
  return useQuery({ queryKey: groupBuyKeys.gifts(), queryFn: fetchConsumerGiftSets, enabled });
}

export function useConsumerGiftSet(id: string | null) {
  return useQuery({ queryKey: groupBuyKeys.gift(id ?? ''), queryFn: () => fetchConsumerGiftSet(id!), enabled: !!id });
}

export function useCreateGiftSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGiftSetInput) => createConsumerGiftSet(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupBuyKeys.all }),
  });
}

export function useCancelGiftSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelConsumerGiftSet(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupBuyKeys.all }),
  });
}

export function useAdminGifts() {
  return useQuery({ queryKey: groupBuyKeys.adminGifts(), queryFn: fetchAdminGifts });
}

export function useUpdateGiftSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { packagingFee: number }) => updateAdminGiftSettings(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupBuyKeys.adminGifts() });
      queryClient.invalidateQueries({ queryKey: groupBuyKeys.giftSettings() });
    },
  });
}

// ---------- 관리자 ----------

export function useAdminProducts(filter: { status?: GroupBuyStatus | 'all'; date?: string } = {}) {
  return useQuery({ queryKey: groupBuyKeys.adminProducts(filter), queryFn: () => fetchAdminProducts(filter) });
}

export function useAdminProductDetail(id: string | null) {
  return useQuery({ queryKey: groupBuyKeys.adminProduct(id ?? ''), queryFn: () => fetchAdminProductDetail(id!), enabled: !!id });
}

function useAdminInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: groupBuyKeys.all });
}

export function useUpdateProductSettings() {
  const invalidate = useAdminInvalidate();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProductSettingsInput }) => updateAdminProductSettings(id, input),
    onSuccess: invalidate,
  });
}

export function usePublishProduct() {
  const invalidate = useAdminInvalidate();
  return useMutation({ mutationFn: (id: string) => publishAdminProduct(id), onSuccess: invalidate });
}

export function useUnpublishProduct() {
  const invalidate = useAdminInvalidate();
  return useMutation({ mutationFn: (id: string) => unpublishAdminProduct(id), onSuccess: invalidate });
}

export function useTransitionProduct() {
  const invalidate = useAdminInvalidate();
  return useMutation({
    mutationFn: ({ id, to, note }: { id: string; to: GroupBuyStatus; note?: string }) => transitionAdminProduct(id, to, note),
    onSuccess: invalidate,
  });
}

export function useRefundOrder() {
  const invalidate = useAdminInvalidate();
  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason?: string }) => refundAdminOrder(orderId, reason),
    onSuccess: invalidate,
  });
}

export function usePartDefaults() {
  return useQuery({ queryKey: groupBuyKeys.partDefaults(), queryFn: fetchPartDefaults });
}

export function useSavePartDefault() {
  const invalidate = useAdminInvalidate();
  return useMutation({ mutationFn: (input: GroupBuyPartDefault) => savePartDefault(input), onSuccess: invalidate });
}

export function useGroupBuySettings() {
  return useQuery({ queryKey: groupBuyKeys.settings(), queryFn: fetchGroupBuySettings });
}

export function useUpdateGroupBuySettings() {
  const invalidate = useAdminInvalidate();
  return useMutation({
    mutationFn: (input: { platformDealerId?: string | null; deadlineOffsetMin?: number }) => updateGroupBuySettings(input),
    onSuccess: invalidate,
  });
}

export function useSyncDrafts() {
  const invalidate = useAdminInvalidate();
  return useMutation({ mutationFn: syncAdminDrafts, onSuccess: invalidate });
}

export function useExpireProducts() {
  const invalidate = useAdminInvalidate();
  return useMutation({ mutationFn: expireAdminProducts, onSuccess: invalidate });
}

// ---------- 관리자 · kg 수요 풀 ----------

export function useAdminPools() {
  return useQuery({ queryKey: groupBuyKeys.adminPools(), queryFn: fetchAdminPools });
}

export function useSavePool() {
  const invalidate = useAdminInvalidate();
  return useMutation({ mutationFn: (input: UpsertPoolInput) => saveAdminPool(input), onSuccess: invalidate });
}

export function useMatchPools() {
  const invalidate = useAdminInvalidate();
  return useMutation({ mutationFn: matchAdminPools, onSuccess: invalidate });
}
