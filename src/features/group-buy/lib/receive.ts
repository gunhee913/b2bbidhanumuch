/**
 * 수령 방식 · 택배로 받거나, 식육식당(매장)으로 보내 자리에서 구워 먹는다.
 * 서버(주문 저장·검증)와 클라이언트(옵션 선택·주문 내역 표시)가 같은 라벨·매장 정보를 쓴다.
 */

import type { ReceiveMethod, ShippingInfo } from '../types';

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

/**
 * 식육식당 매장 정보 · 매장 수령 주문은 이 주소로 배송된다.
 * TODO: 매장이 확정되면 실제 주소·영업시간으로 바꾸고, 매장이 늘면 관리자 설정으로 옮긴다.
 */
export const DINE_IN_STORE = {
  name: '농협미트센터 식육식당',
  zipcode: '27675',
  address: '충북 음성군 음성읍 (매장 주소 확정 예정)',
  hours: '매일 11:00 – 21:00',
  notice: '도착 안내 문자를 받으신 뒤 매장에 방문해 주세요. 상차림비는 매장에서 별도 결제됩니다.',
};

/**
 * 매장 수령이면 배송지 주소는 매장 주소로 바꾼다 · 이름·연락처·메모는 주문자 것을 그대로 둔다.
 * 택배면 입력값 그대로.
 */
export function shippingForReceive(method: ReceiveMethod, shipping: ShippingInfo): ShippingInfo {
  if (!isDineIn(method)) return shipping;
  return {
    ...shipping,
    zipcode: DINE_IN_STORE.zipcode,
    address: DINE_IN_STORE.address,
    addressDetail: DINE_IN_STORE.name,
  };
}
