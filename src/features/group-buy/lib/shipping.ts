import { z } from 'zod';
import type { ShippingInfo } from '../types';

export const shippingSchema = z.object({
  name: z.string().trim().min(2, '받으실 분 이름을 입력해주세요.').max(20),
  phone: z.string().regex(/^01[016789]-\d{3,4}-\d{4}$/, '휴대폰 번호 형식을 확인해주세요.'),
  zipcode: z.string().trim().regex(/^\d{5}$/, '우편번호 5자리를 입력해주세요.'),
  address: z.string().trim().min(5, '주소를 입력해주세요.'),
  addressDetail: z.string().trim().min(1, '상세 주소를 입력해주세요.'),
  memo: z.string().trim().max(100).optional(),
});
export type ShippingForm = z.infer<typeof shippingSchema>;

export const EMPTY_SHIPPING: ShippingForm = { name: '', phone: '', zipcode: '', address: '', addressDetail: '', memo: '' };

/** 폼 값 → API 입력 · 빈 메모는 보내지 않는다 */
export function toShippingInfo(values: ShippingForm): ShippingInfo {
  return {
    name: values.name,
    phone: values.phone,
    zipcode: values.zipcode,
    address: values.address,
    addressDetail: values.addressDetail,
    memo: values.memo || undefined,
  };
}
