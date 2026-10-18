import type { ConsumerStatus, GroupBuyStatus, OrderStatus, ReservationStatus } from '../types';

/** kg 예약 상태 라벨 · 소비자 화면 */
export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  open: '주문 접수',
  allocated: '배송 준비중',
  cancelled: '취소 · 환불완료',
  expired: '처리 불가 · 환불완료',
  refunded: '환불완료',
};

export function reservationStatusMessage(status: ReservationStatus): string | null {
  switch (status) {
    case 'open':
      return '주문이 접수됐어요. 소분·진공 포장 후 냉장 배송해 드려요. 배송 준비 전에는 취소할 수 있어요.';
    case 'allocated':
      return '배송 준비가 시작됐어요. 보내드리면 다시 알려드릴게요.';
    case 'cancelled':
      return '요청하신 대로 주문이 취소되어 결제 금액이 환불되었습니다.';
    case 'expired':
      return '주문을 처리하지 못해 전액 자동 환불되었습니다.';
    case 'refunded':
      return '주문을 처리하지 못해 전액 자동 환불되었습니다. 다시 주문하실 수 있어요.';
    default:
      return null;
  }
}

/** 내부 상태 라벨 · 관리자 화면 전용 */
export const INTERNAL_STATUS_LABELS: Record<GroupBuyStatus, string> = {
  draft: '설정 필요',
  recruiting: '모집중',
  full: '모집완료',
  bidding: '응찰중',
  won: '낙찰',
  lost: '미확보(유찰)',
  cancelled: '주문 없음 종료',
  processing: '소분 가공',
  shipped: '배송중',
  completed: '완료',
};

export const INTERNAL_STATUS_ORDER: GroupBuyStatus[] = [
  'draft',
  'recruiting',
  'full',
  'bidding',
  'won',
  'processing',
  'shipped',
  'completed',
  'lost',
  'cancelled',
];

/** 관리자가 강제로 옮길 수 있는 전이 · 시연 중 경매를 기다리지 않기 위해 */
export const ADMIN_FORCE_TRANSITIONS: Partial<Record<GroupBuyStatus, GroupBuyStatus[]>> = {
  recruiting: ['full', 'cancelled'],
  full: ['bidding', 'won', 'lost', 'recruiting'],
  bidding: ['won', 'lost'],
  won: ['processing'],
  processing: ['shipped'],
  shipped: ['completed'],
};

/**
 * 내부 상태 → 소비자 상태.
 * full·bidding·won 은 전부 "준비중" 이다 — 소비자는 경매가 있다는 것을 알 필요가 없다.
 */
export function toConsumerStatus(status: GroupBuyStatus): ConsumerStatus {
  switch (status) {
    case 'recruiting':
      return 'recruiting';
    case 'full':
    case 'bidding':
    case 'won':
      return 'preparing';
    case 'processing':
      return 'processing';
    case 'shipped':
      return 'shipped';
    case 'completed':
      return 'completed';
    case 'lost':
    case 'cancelled':
      return 'cancelled';
    case 'draft':
    default:
      return 'cancelled';
  }
}

export const CONSUMER_STATUS_LABELS: Record<ConsumerStatus, string> = {
  recruiting: '모집중',
  preparing: '모집완료 · 준비중',
  processing: '소분 가공중',
  shipped: '배송중',
  completed: '배송완료',
  cancelled: '취소 · 환불완료',
};

/** 소비자 타임라인 단계 · 취소는 별도 처리 */
export const CONSUMER_STEPS: { key: ConsumerStatus; label: string; description: string }[] = [
  { key: 'recruiting', label: '모집중', description: '모집 마감까지 주문을 받습니다' },
  { key: 'preparing', label: '모집완료', description: '공판장에서 물량을 확보합니다' },
  { key: 'processing', label: '소분 가공', description: '구좌 위치대로 나누어 포장합니다' },
  { key: 'shipped', label: '배송중', description: '냉장 택배로 발송됩니다' },
  { key: 'completed', label: '배송완료', description: '맛있게 드세요' },
];

export function consumerStepIndex(status: ConsumerStatus): number {
  const idx = CONSUMER_STEPS.findIndex((s) => s.key === status);
  return idx < 0 ? -1 : idx;
}

/**
 * 취소·환불 사유 문구 · 내부 사유를 소비자 언어로 번역한다.
 * 경매·유찰·낙찰 같은 말은 쓰지 않는다.
 */
export function consumerCancelMessage(
  productStatus: GroupBuyStatus,
  orderStatus: OrderStatus,
): string | null {
  if (orderStatus === 'cancelled') return '요청하신 대로 주문이 취소되어 결제 금액이 환불되었습니다.';
  if (productStatus === 'cancelled') return '모집이 종료되어 자동으로 환불되었습니다.';
  if (productStatus === 'lost') return '물량 확보가 되지 않아 자동으로 환불되었습니다. 불편을 드려 죄송합니다.';
  if (orderStatus === 'refunded') return '결제 금액이 환불되었습니다.';
  return null;
}

/** 이벤트 타입 · group_buy_events.type */
export const EVENT_TYPES = {
  DRAFT_CREATED: 'draft_created',
  PUBLISHED: 'published',
  SETTINGS_UPDATED: 'settings_updated',
  ORDER_PLACED: 'order_placed',
  ORDER_CANCELLED: 'order_cancelled',
  FULL: 'full',
  BID_PLACED: 'bid_placed',
  BID_FAILED: 'bid_failed',
  WON: 'won',
  LOST: 'lost',
  EXPIRED: 'expired',
  REFUNDED: 'refunded',
  STATUS_FORCED: 'status_forced',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  COMPLETED: 'completed',
  RESERVATION_PLACED: 'reservation_placed',
  RESERVATION_CANCELLED: 'reservation_cancelled',
  RESERVATION_EXPIRED: 'reservation_expired',
  POOL_MATCHED: 'pool_matched',
} as const;
