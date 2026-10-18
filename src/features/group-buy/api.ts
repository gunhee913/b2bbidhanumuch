import type {
  AdminPool,
  AdminProduct,
  AdminProductDetail,
  ConsumerOrder,
  ConsumerPool,
  ConsumerPoolFilter,
  ConsumerProduct,
  ConsumerProductFilter,
  ConsumerProductSummary,
  ConsumerReservation,
  CreateOrderInput,
  CreateReservationInput,
  GroupBuyPartDefault,
  GroupBuyStatus,
  ProductCerts,
  UpdateProductSettingsInput,
  UpsertPoolInput,
} from './types';

const CONSUMER_BASE = '/api/group-buy';
const ADMIN_BASE = '/api/admin/group-buy';

export class ApiError extends Error {
  status: number;
  code?: string;
  takenSlotNos?: number[];

  constructor(message: string, status: number, extra?: { code?: string; takenSlotNos?: number[] }) {
    super(message);
    this.status = status;
    this.code = extra?.code;
    this.takenSlotNos = extra?.takenSlotNos;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(body?.error ?? '요청 처리 중 오류가 발생했습니다.', res.status, {
      code: body?.code,
      takenSlotNos: body?.takenSlotNos,
    });
  }
  return body as T;
}

// ---------- 소비자 ----------

export function fetchConsumerProducts(filter: ConsumerProductFilter = {}) {
  const params = new URLSearchParams();
  if (filter.partGroup) params.set('partGroup', filter.partGroup);
  if (filter.grade) params.set('grade', filter.grade);
  if (filter.slaughterHouse) params.set('house', filter.slaughterHouse);
  if (filter.status) params.set('status', filter.status);
  const qs = params.toString();
  return request<ConsumerProduct[]>(`${CONSUMER_BASE}/products${qs ? `?${qs}` : ''}`);
}

export function fetchConsumerProduct(id: string) {
  return request<{ product: ConsumerProduct; siblings: ConsumerProductSummary[] }>(`${CONSUMER_BASE}/products/${id}`);
}

export function fetchProductCerts(id: string) {
  return request<ProductCerts>(`${CONSUMER_BASE}/products/${id}/certs`);
}

export function fetchConsumerOrders() {
  return request<ConsumerOrder[]>(`${CONSUMER_BASE}/orders`);
}

export function fetchConsumerOrder(id: string) {
  return request<ConsumerOrder>(`${CONSUMER_BASE}/orders/${id}`);
}

export function createConsumerOrder(input: CreateOrderInput) {
  return request<ConsumerOrder>(`${CONSUMER_BASE}/orders`, { method: 'POST', body: JSON.stringify(input) });
}

export function cancelConsumerOrder(id: string) {
  return request<{ ok: boolean; message: string }>(`${CONSUMER_BASE}/orders/${id}/cancel`, { method: 'POST' });
}

// ---------- 소비자 · kg 수요 풀 ----------

export function fetchConsumerPools(filter: ConsumerPoolFilter = {}) {
  const params = new URLSearchParams();
  if (filter.partGroup) params.set('partGroup', filter.partGroup);
  if (filter.grade) params.set('grade', filter.grade);
  const qs = params.toString();
  return request<ConsumerPool[]>(`${CONSUMER_BASE}/pools${qs ? `?${qs}` : ''}`);
}

export function fetchConsumerPool(id: string) {
  return request<ConsumerPool>(`${CONSUMER_BASE}/pools/${id}`);
}

export function fetchConsumerReservations() {
  return request<ConsumerReservation[]>(`${CONSUMER_BASE}/reservations`);
}

export function createConsumerReservation(input: CreateReservationInput) {
  return request<{ reservation: ConsumerReservation; matched: boolean }>(`${CONSUMER_BASE}/reservations`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function cancelConsumerReservation(id: string) {
  return request<{ ok: boolean; message: string }>(`${CONSUMER_BASE}/reservations/${id}/cancel`, { method: 'POST' });
}

export function signupConsumer(input: {
  phone: string;
  password: string;
  name: string;
  email?: string;
  zipcode?: string;
  address?: string;
  addressDetail?: string;
}) {
  return request<{ id: string }>(`${CONSUMER_BASE}/auth/signup`, { method: 'POST', body: JSON.stringify(input) });
}

// ---------- 관리자 ----------

export function fetchAdminProducts(filter: { status?: GroupBuyStatus | 'all'; date?: string } = {}) {
  const params = new URLSearchParams();
  if (filter.status) params.set('status', filter.status);
  if (filter.date) params.set('date', filter.date);
  const qs = params.toString();
  return request<AdminProduct[]>(`${ADMIN_BASE}/products${qs ? `?${qs}` : ''}`);
}

export function fetchAdminProductDetail(id: string) {
  return request<AdminProductDetail>(`${ADMIN_BASE}/products/${id}`);
}

export function updateAdminProductSettings(id: string, input: UpdateProductSettingsInput) {
  return request<AdminProduct>(`${ADMIN_BASE}/products/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function publishAdminProduct(id: string) {
  return request<{ ok: boolean }>(`${ADMIN_BASE}/products/${id}/publish`, { method: 'POST' });
}

export function unpublishAdminProduct(id: string) {
  return request<{ ok: boolean }>(`${ADMIN_BASE}/products/${id}/unpublish`, { method: 'POST' });
}

export function transitionAdminProduct(id: string, to: GroupBuyStatus, note?: string) {
  return request<{ ok: boolean }>(`${ADMIN_BASE}/products/${id}/transition`, {
    method: 'POST',
    body: JSON.stringify({ to, note }),
  });
}

export function refundAdminOrder(orderId: string, reason?: string) {
  return request<{ ok: boolean }>(`${ADMIN_BASE}/orders/${orderId}/refund`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function fetchPartDefaults() {
  return request<GroupBuyPartDefault[]>(`${ADMIN_BASE}/part-defaults`);
}

export function savePartDefault(input: GroupBuyPartDefault) {
  return request<{ ok: boolean }>(`${ADMIN_BASE}/part-defaults`, { method: 'PUT', body: JSON.stringify(input) });
}

export interface GroupBuySettingsResponse {
  platformDealerId: string | null;
  platformDealerName: string | null;
  deadlineOffsetMin: number;
  dealers: { id: string; dealerNo: string; name: string }[];
}

export function fetchGroupBuySettings() {
  return request<GroupBuySettingsResponse>(`${ADMIN_BASE}/settings`);
}

export function updateGroupBuySettings(input: { platformDealerId?: string | null; deadlineOffsetMin?: number }) {
  return request<GroupBuySettingsResponse>(`${ADMIN_BASE}/settings`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function syncAdminDrafts() {
  return request<{ listings: number; created: number; published: number }>(`${ADMIN_BASE}/sync`, { method: 'POST' });
}

export function expireAdminProducts() {
  return request<{ expired: number }>(`${ADMIN_BASE}/expire`, { method: 'POST' });
}

// ---------- 관리자 · kg 수요 풀 ----------

export function fetchAdminPools() {
  return request<AdminPool[]>(`${ADMIN_BASE}/pools`);
}

export function saveAdminPool(input: UpsertPoolInput) {
  return request<{ ok: boolean }>(`${ADMIN_BASE}/pools`, { method: 'PUT', body: JSON.stringify(input) });
}

export function matchAdminPools() {
  return request<{ expired: number; matched: number }>(`${ADMIN_BASE}/pools/match`, { method: 'POST' });
}
