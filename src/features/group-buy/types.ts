// ============================================
// 부분육 공동구매 타입
//
// 내부(관리자·서버) 타입과 소비자용 타입을 분리한다.
// 소비자용 타입에는 경매·응찰 관련 필드가 없다 — 소비자 API 는
// `toConsumerProduct()` 매퍼를 거쳐 이 타입만 반환한다.
// ============================================

import type { GiftCellCount, GiftCellSnapshot, GiftRecipientMode } from './lib/gift';
import type { ProductZone } from './lib/slots';

/** 내부 상태 · 경매 메커니즘이 그대로 드러난다 (관리자 전용) */
export type GroupBuyStatus =
  | 'draft'
  | 'recruiting'
  | 'full'
  | 'bidding'
  | 'won'
  | 'lost'
  | 'cancelled'
  | 'processing'
  | 'shipped'
  | 'completed';

/** 소비자에게 보여주는 상태 · 경매는 없다 */
export type ConsumerStatus =
  | 'recruiting'
  | 'preparing'
  | 'processing'
  | 'shipped'
  | 'completed'
  | 'cancelled';

export type OrderStatus = 'paid' | 'cancelled' | 'refunded';

/** slot: 구좌 선점 · kg: 수요 풀 매칭(1kg 단위) */
export type SaleMode = 'slot' | 'kg';
export type PoolStatus = 'open' | 'paused';
/** open(모이는 중) → allocated(확정) · open → cancelled/expired · allocated → refunded(물량 미확보) */
export type ReservationStatus = 'open' | 'allocated' | 'cancelled' | 'expired' | 'refunded';

// ---------- DB Rows ----------

export interface GroupBuyProductRow {
  id: string;
  part_id: string;
  listing_id: string;
  part_group: string;
  sale_mode: SaleMode;
  pool_id: string | null;
  slot_count: number | null;
  slot_weight: number | null;
  price_per_kg: number | null;
  slot_price: number | null;
  reference_retail_price: number | null;
  positional: boolean;
  bid_price_cap: number | null;
  recruit_deadline: string | null;
  status: GroupBuyStatus;
  published_at: string | null;
  bid_id: string | null;
  result_price: number | null;
  cancelled_reason: string | null;
  /** 소비자 상세 페이지 상세설명 · 상품마다 따로 */
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroupBuyOrderRow {
  id: string;
  order_no: string;
  product_id: string;
  consumer_id: string;
  quantity: number;
  amount: number;
  status: OrderStatus;
  payment_provider: string;
  payment_key: string | null;
  paid_at: string | null;
  refunded_at: string | null;
  refund_reason: string | null;
  shipping: ShippingInfo;
  /** 수령 방식 · 없으면 택배 */
  receive_method: ReceiveMethod | null;
  /** 매장 수령 · 받을 매장 · 픽업 예약 시각 */
  store_id: string | null;
  pickup_at: string | null;
  weight_kg: number | string | null;
  /** kg 주문 · 근막 제거 + 썰어 받기 옵션 */
  trim_and_slice: boolean | null;
  reservation_id: string | null;
  /** 선물세트 원천 구좌 주문이면 세트 id */
  gift_set_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroupBuyPoolRow {
  id: string;
  part_group: string;
  grade_key: string;
  /** 관리자가 정한 kg당 판매 단가 */
  price_per_kg: number;
  bid_price_cap: number | null;
  reference_retail_price_per_kg: number | null;
  /** 한 덩어리 목표 중량 · 이만큼 모이면 경매 참여 */
  typical_weight_kg: number | string;
  min_kg: number;
  max_kg: number;
  reservation_ttl_days: number;
  status: PoolStatus;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface GroupBuyReservationRow {
  id: string;
  reservation_no: string;
  pool_id: string;
  consumer_id: string;
  kg: number;
  price_per_kg: number;
  /** 근막 제거 + 썰어 받기 옵션 */
  trim_and_slice: boolean;
  /** 옵션 kg당 추가 요금 · 주문 시점 값 */
  option_fee_per_kg: number;
  /** 결제 금액 = kg × (단가 + 옵션 요금) */
  held_amount: number;
  status: ReservationStatus;
  product_id: string | null;
  order_id: string | null;
  allocated_at: string | null;
  payment_provider: string;
  payment_key: string | null;
  paid_at: string | null;
  refunded_at: string | null;
  refund_reason: string | null;
  shipping: ShippingInfo;
  /** 수령 방식 · 없으면 택배 */
  receive_method: ReceiveMethod | null;
  store_id: string | null;
  pickup_at: string | null;
  expires_at: string;
  /** 선물세트에 묶인 1kg 구매 */
  gift_set_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroupBuyPartDefaultRow {
  part_group: string;
  slot_count: number | null;
  price_per_kg: number | null;
  reference_retail_price_per_kg: number | null;
  bid_price_cap: number | null;
  positional: boolean;
  updated_at: string;
  updated_by: string | null;
}

export interface GroupBuyEventRow {
  id: string;
  product_id: string | null;
  order_id: string | null;
  type: string;
  message: string | null;
  payload: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

// ---------- 공통 ----------

/** 수령 방식 · delivery = 냉장 택배, dine_in = 식육식당 매장 수령(현장 취식) */
export type ReceiveMethod = 'delivery' | 'dine_in';

export interface ShippingInfo {
  name: string;
  phone: string;
  zipcode: string;
  address: string;
  addressDetail: string;
  memo?: string;
}

// ------------------------------------------------------------
// 매장 · 픽업 예약
// ------------------------------------------------------------

export interface GroupBuyStoreRow {
  id: string;
  slug: string;
  name: string;
  zipcode: string | null;
  address: string;
  address_detail: string | null;
  phone: string | null;
  lat: number;
  lng: number;
  /** 'HH:MM:SS' */
  open_time: string;
  close_time: string;
  /** 0=일 … 6=토 */
  closed_weekdays: number[];
  slot_minutes: number;
  slot_capacity: number;
  description: string | null;
  directions: string | null;
  parking: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ConsumerStore {
  id: string;
  slug: string;
  name: string;
  zipcode: string;
  address: string;
  addressDetail: string;
  phone: string;
  lat: number;
  lng: number;
  /** 'HH:MM' */
  openTime: string;
  closeTime: string;
  closedWeekdays: number[];
  slotMinutes: number;
  slotCapacity: number;
  description: string;
  directions: string;
  parking: string;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
}

/** 주문·예약에 붙는 매장 요약 */
export interface StoreSummary {
  id: string;
  slug: string;
  name: string;
  address: string;
  addressDetail: string;
  phone: string;
}

/** 픽업 슬롯 하나 · `at` 은 ISO(+09:00), `label` 은 'HH:MM' */
export interface PickupSlot {
  at: string;
  label: string;
  remaining: number;
}

export interface PickupInput {
  storeId: string;
  pickupAt: string;
}

export interface UpsertStoreInput {
  id?: string;
  slug: string;
  name: string;
  zipcode?: string;
  address: string;
  addressDetail?: string;
  phone?: string;
  lat: number;
  lng: number;
  openTime: string;
  closeTime: string;
  closedWeekdays: number[];
  slotMinutes: number;
  slotCapacity: number;
  description?: string;
  directions?: string;
  parking?: string;
  imageUrl?: string | null;
  isActive: boolean;
  sortOrder: number;
}

/** 개체(소) 정보 · 소비자에게도 보여주는 신뢰 요소 */
export interface CattleSummary {
  listingNo: string;
  listingDate: string;
  grade: string | null;
  marblingScore: number | null;
  gender: string | null;
  monthAge: number | null;
  traceNo: string | null;
  slaughterHouse: string | null;
  slaughterDate: string | null;
  carcassWeight: number | null;
  companyName: string | null;
  hasGradeCert: boolean;
  hasSlaughterCert: boolean;
  /** 도축 */
  slaughterNo: string | null;
  /** 등급 판정 항목 */
  backFat: number | null;
  eyeMuscle: number | null;
  meatColor: number | null;
  fatColor: number | null;
  texture: number | null;
  maturity: number | null;
  /** 가공 */
  processDate: string | null;
  processWeight: number | null;
}

/** 증명서 스캔본 · data URL 그대로 · 부분육 경매 플랫폼에 등록된 파일 */
export interface CertificateFile {
  fileName: string;
  fileData: string;
  fileType: string;
}

export interface ProductCerts {
  gradeCert: CertificateFile | null;
  slaughterCert: CertificateFile | null;
}

// ---------- 소비자용 ----------

export interface ConsumerProduct {
  id: string;
  partName: string;
  partGroup: string;
  side: '좌' | '우' | null;
  partWeight: number;
  slotCount: number;
  slotWeight: number;
  slotPrice: number;
  pricePerKg: number;
  pricePer100g: number;
  referenceRetailPrice: number | null;
  savingRate: number | null;
  positional: boolean;
  recruitDeadline: string;
  status: ConsumerStatus;
  soldSlotNos: number[];
  soldCount: number;
  remainingCount: number;
  /** 상·중·하 세 구좌 · 중량(0.1kg)·가격·판매 여부 */
  zones: ProductZone[];
  images: string[];
  cattle: CattleSummary;
  publishedAt: string | null;
  /** 관리자가 쓴 상세설명 · 없으면 null */
  description: string | null;
}

/** 같은 개체의 다른 부위 · 상세 페이지 하단 */
export interface ConsumerProductSummary {
  id: string;
  partName: string;
  partGroup: string;
  slotPrice: number;
  slotWeight: number;
  remainingCount: number;
  slotCount: number;
  status: ConsumerStatus;
  image: string | null;
  recruitDeadline: string;
}

export interface ConsumerOrder {
  id: string;
  orderNo: string;
  productId: string;
  partName: string;
  partGroup: string;
  listingNo: string;
  grade: string | null;
  image: string | null;
  saleMode: SaleMode;
  slotNos: number[];
  quantity: number;
  slotWeight: number;
  /** kg 모드 · 주문 중량 · 구좌 모드는 slotWeight × quantity 와 같다 */
  weightKg: number;
  pricePerKg: number;
  /** kg 모드 · 근막 제거 + 썰어 받기 옵션 */
  trimAndSlice: boolean;
  /** 택배 배송 또는 식육식당 매장 수령 */
  receiveMethod: ReceiveMethod;
  /** 매장 수령 · 받을 매장과 픽업 예약 시각 */
  store: StoreSummary | null;
  pickupAt: string | null;
  amount: number;
  positional: boolean;
  status: ConsumerStatus;
  statusLabel: string;
  statusMessage: string | null;
  isRefunded: boolean;
  canCancel: boolean;
  recruitDeadline: string;
  shipping: ShippingInfo;
  paidAt: string | null;
  refundedAt: string | null;
  createdAt: string;
  giftSetId: string | null;
}

export interface CreateOrderInput {
  productId: string;
  slotNos: number[];
  shipping: ShippingInfo;
  /** 근막 제거 + 썰어 받기 */
  trimAndSlice?: boolean;
  /** 수령 방식 · 기본 택배 */
  receiveMethod?: ReceiveMethod;
  /** 매장 수령일 때 필수 */
  pickup?: PickupInput;
  /** 선물세트 원천 주문 · 서버만 채운다 */
  giftSetId?: string;
  /** 선물세트 묶음 결제 · 서버만 쓴다 */
  skipPayment?: boolean;
}

export interface ConsumerProductFilter {
  partGroup?: string;
  grade?: string;
  slaughterHouse?: string;
  status?: 'recruiting' | 'all';
}

// ---------- 수요 풀(1kg 구매) · 소비자용 ----------

/** 부위×등급 한 줄 · 관리자가 정한 단가로 kg이 모이고, 목표 중량이 차면 경매로 확보한다 */
export interface ConsumerPool {
  id: string;
  partGroup: string;
  gradeKey: string;
  gradeLabel: string;
  pricePerKg: number;
  referenceRetailPricePerKg: number | null;
  /** 시중 소매가 대비 절약률(%) · 소매가 없으면 null */
  savingRate: number | null;
  /** 지금 모인 kg (open 예약 합) */
  totalKg: number;
  participantCount: number;
  /** 한 덩어리 목표 중량 */
  targetKg: number;
  /** 목표까지 더 필요한 kg */
  kgToFill: number;
  /** 0~100 */
  fillPct: number;
  minKg: number;
  maxKg: number;
  /** 이 풀에서 확보가 진행 중인 덩어리 수 */
  matchedCount: number;
  reviewCount: number;
  image: string | null;
  status: PoolStatus;
}

export interface ConsumerReservation {
  id: string;
  reservationNo: string;
  poolId: string;
  partGroup: string;
  gradeKey: string;
  gradeLabel: string;
  kg: number;
  pricePerKg: number;
  /** 근막 제거 + 썰어 받기 옵션 */
  trimAndSlice: boolean;
  /** 옵션 kg당 추가 요금 · 옵션 미선택이면 0 */
  optionFeePerKg: number;
  /** 택배 배송 또는 식육식당 매장 수령 */
  receiveMethod: ReceiveMethod;
  store: StoreSummary | null;
  pickupAt: string | null;
  /** 결제 금액 = kg × (단가 + 옵션 요금) */
  amount: number;
  status: ReservationStatus;
  statusLabel: string;
  statusMessage: string | null;
  orderId: string | null;
  canCancel: boolean;
  expiresAt: string;
  createdAt: string;
  image: string | null;
}

export interface CreateReservationInput {
  poolId: string;
  kg: number;
  /** 근막 제거 + 썰어 받기 · 기본 false · 택배일 때만 */
  trimAndSlice?: boolean;
  /** 수령 방식 · 기본 택배 */
  receiveMethod?: ReceiveMethod;
  /** 매장 수령일 때 필수 */
  pickup?: PickupInput;
  shipping: ShippingInfo;
}

export interface ConsumerPoolFilter {
  partGroup?: string;
  grade?: string;
}

// ---------- 수요 풀 · 관리자용 ----------

export interface AdminPool {
  id: string;
  partGroup: string;
  gradeKey: string;
  gradeLabel: string;
  pricePerKg: number;
  bidPriceCap: number | null;
  referenceRetailPricePerKg: number | null;
  targetKg: number;
  minKg: number;
  maxKg: number;
  reservationTtlDays: number;
  status: PoolStatus;
  openKg: number;
  openCount: number;
  allocatedCount: number;
  waitingDraftCount: number;
  updatedAt: string;
}

export interface UpsertPoolInput {
  id?: string;
  partGroup: string;
  gradeKey: string;
  pricePerKg: number;
  bidPriceCap: number | null;
  referenceRetailPricePerKg: number | null;
  targetKg: number;
  minKg: number;
  maxKg: number;
  reservationTtlDays: number;
  status: PoolStatus;
}

// ---------- 관리자용 ----------

export interface AdminProduct {
  id: string;
  partId: string;
  listingId: string;
  listingNo: string;
  listingDate: string;
  partName: string;
  partGroup: string;
  saleMode: SaleMode;
  partWeight: number;
  minPrice: number | null;
  slotCount: number | null;
  slotWeight: number | null;
  pricePerKg: number | null;
  slotPrice: number | null;
  referenceRetailPrice: number | null;
  positional: boolean;
  bidPriceCap: number | null;
  recruitDeadline: string | null;
  status: GroupBuyStatus;
  publishedAt: string | null;
  bidId: string | null;
  resultPrice: number | null;
  cancelledReason: string | null;
  soldCount: number;
  orderCount: number;
  grade: string | null;
  slaughterHouse: string | null;
  companyName: string | null;
  winningDealerId: string | null;
  image: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProductDetail extends AdminProduct {
  orders: AdminOrder[];
  events: GroupBuyEvent[];
  soldSlotNos: number[];
}

export interface AdminOrder {
  id: string;
  orderNo: string;
  consumerId: string;
  consumerName: string;
  consumerPhone: string;
  slotNos: number[];
  quantity: number;
  /** kg 주문 · 근막 제거 + 썰어 받기 옵션 */
  trimAndSlice: boolean;
  receiveMethod: ReceiveMethod;
  amount: number;
  status: OrderStatus;
  paidAt: string | null;
  refundedAt: string | null;
  refundReason: string | null;
  shipping: ShippingInfo;
  createdAt: string;
}

export interface GroupBuyEvent {
  id: string;
  type: string;
  message: string | null;
  payload: Record<string, unknown>;
  createdBy: string | null;
  createdAt: string;
}

export interface GroupBuyPartDefault {
  partGroup: string;
  slotCount: number | null;
  pricePerKg: number | null;
  referenceRetailPricePerKg: number | null;
  bidPriceCap: number | null;
  positional: boolean;
}

export interface UpdateProductSettingsInput {
  slotCount?: number | null;
  pricePerKg?: number | null;
  referenceRetailPrice?: number | null;
  positional?: boolean;
  bidPriceCap?: number | null;
  recruitDeadline?: string | null;
  description?: string | null;
}

export type GiftSetStatus = 'paid' | 'cancelled' | 'refunded';

export interface GiftRecipient {
  setIndex: number;
  shipping: ShippingInfo;
  message: string | null;
}

export interface GiftLeftoverLine {
  productId: string;
  label: string;
  leftoverKg: number;
}

export interface ConsumerGiftSet {
  id: string;
  giftNo: string;
  cellCount: GiftCellCount;
  quantity: number;
  packagingFee: number;
  cells: GiftCellSnapshot[];
  recipientMode: GiftRecipientMode;
  leftoverReceiveMethod: ReceiveMethod;
  leftoverStore: StoreSummary | null;
  leftoverPickupAt: string | null;
  leftoverShipping: ShippingInfo | null;
  leftoverKg: number;
  leftoverLines: GiftLeftoverLine[];
  meatAmount: number;
  amount: number;
  status: GiftSetStatus;
  statusLabel: string;
  canCancel: boolean;
  recipients: GiftRecipient[];
  orders: ConsumerOrder[];
  paidAt: string | null;
  refundedAt: string | null;
  createdAt: string;
}

export interface GiftSupplyInput {
  cellNos: number[];
  bulks: { productId: string; slotNos: number[] }[];
  poolId?: string | null;
  kg: number;
  /** pack 이면 남는 중량을 세트에 나눠 담고, separate 이면 따로 받는다 */
  leftoverMode?: 'pack' | 'separate';
}

export interface CreateGiftSetInput {
  cellCount: GiftCellCount;
  quantity: number;
  cells: { cellNo: number; productId?: string | null; poolId?: string | null; kg?: number }[];
  /** 칸을 채우는 벌크 구좌와 1kg · 있으면 이 구좌를 그대로 산다 */
  supplies?: GiftSupplyInput[];
  recipientMode: GiftRecipientMode;
  recipients: Array<{ shipping: ShippingInfo; message?: string }>;
  leftoverReceiveMethod: ReceiveMethod;
  leftoverPickup?: PickupInput;
  leftoverShipping: ShippingInfo;
}

export interface GiftSettings {
  packagingFee: number;
}
