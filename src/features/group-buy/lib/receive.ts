/**
 * 수령 방식 · 택배로 받거나, 고른 식육식당(매장)에서 예약한 시간에 받는다.
 * 서버(주문 저장·검증)와 클라이언트(옵션 선택·주문 내역 표시)가 같은 라벨을 쓴다.
 */

import type { ReceiveMethod, ShippingInfo, StoreSummary } from '../types';

export const DEFAULT_RECEIVE_METHOD: ReceiveMethod = 'delivery';

export const RECEIVE_METHODS: { key: ReceiveMethod; label: string }[] = [
  { key: 'delivery', label: '택배로 받기' },
  { key: 'dine_in', label: '매장에서 받기' },
];

/** 손질 옵션(근막 제거 + 썰어 받기)은 택배로 받을 때만 고를 수 있다 · 매장에서는 주방이 바로 손질한다 */
export const allowsTrimAndSlice = (method: ReceiveMethod | null | undefined) => !isDineIn(method);

export const RECEIVE_METHOD_LABELS: Record<ReceiveMethod, string> = {
  delivery: '택배 배송',
  dine_in: '매장 수령',
};

export const isDineIn = (method: ReceiveMethod | null | undefined) => method === 'dine_in';

export const toReceiveMethod = (value: string | null | undefined): ReceiveMethod => (value === 'dine_in' ? 'dine_in' : 'delivery');

/** 매장 수령 공통 안내 · 매장별 안내는 매장 레코드에 있다 */
export const DINE_IN_NOTICE = '예약하신 시간에 매장에 방문해 주세요. 상차림비는 매장에서 별도 결제됩니다.';

/**
 * 매장 수령이면 배송지 주소는 고른 매장 주소로 바꾼다 · 이름·연락처·메모는 주문자 것을 그대로 둔다.
 * 택배면 입력값 그대로.
 */
export function shippingForReceive(
  method: ReceiveMethod,
  shipping: ShippingInfo,
  store?: Pick<StoreSummary, 'name' | 'address' | 'addressDetail'> & { zipcode?: string | null },
): ShippingInfo {
  if (!isDineIn(method) || !store) return shipping;
  return {
    ...shipping,
    zipcode: store.zipcode ?? '',
    address: store.address,
    addressDetail: [store.addressDetail, store.name].filter(Boolean).join(' · '),
  };
}
