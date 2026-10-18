'use client';

import type { UseFormReturn } from 'react-hook-form';
import type { ShippingForm } from '../../lib/shipping';
import { FormField, GB_INPUT_CLASS, formatPhoneInput } from '../FormField';

interface ShippingFieldsProps {
  form: UseFormReturn<ShippingForm>;
  /** 한 화면에 폼이 둘 이상일 때 id 충돌을 피한다 */
  idPrefix?: string;
  /** 매장 수령 · 받는 분·연락처·메모만 받고 주소 칸은 숨긴다 */
  contactOnly?: boolean;
}

/** 배송지 입력 칸 묶음 · 받는 분 / 연락처 / 우편번호 / 주소 / 상세 / 메모 */
export function ShippingFields({ form, idPrefix = 'ship', contactOnly = false }: ShippingFieldsProps) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;
  const phoneValue = watch('phone');
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className="grid grid-cols-2 gap-3">
      <FormField label="받는 분" htmlFor={id('name')} required error={errors.name?.message}>
        <input id={id('name')} autoComplete="name" className={GB_INPUT_CLASS} {...register('name')} />
      </FormField>
      <FormField label="연락처" htmlFor={id('phone')} required error={errors.phone?.message}>
        <input
          id={id('phone')}
          type="tel"
          inputMode="numeric"
          maxLength={13}
          className={GB_INPUT_CLASS}
          value={phoneValue}
          onChange={(e) => setValue('phone', formatPhoneInput(e.target.value), { shouldValidate: !!errors.phone })}
        />
      </FormField>
      {!contactOnly ? (
        <>
          <FormField label="우편번호" htmlFor={id('zip')} required error={errors.zipcode?.message}>
            <input id={id('zip')} inputMode="numeric" maxLength={5} placeholder="12345" className={GB_INPUT_CLASS} {...register('zipcode')} />
          </FormField>
          <FormField label="주소" htmlFor={id('address')} required error={errors.address?.message} className="col-span-2">
            <input id={id('address')} placeholder="도로명 주소" className={GB_INPUT_CLASS} {...register('address')} />
          </FormField>
          <FormField label="상세 주소" htmlFor={id('detail')} required error={errors.addressDetail?.message} className="col-span-2">
            <input id={id('detail')} placeholder="동·호수 등" className={GB_INPUT_CLASS} {...register('addressDetail')} />
          </FormField>
        </>
      ) : null}
      <FormField label={contactOnly ? '요청 사항' : '배송 메모'} htmlFor={id('memo')} error={errors.memo?.message} className="col-span-2">
        <input id={id('memo')} placeholder={contactOnly ? '방문 예정 시간 등' : '부재 시 문 앞에 두세요 등'} className={GB_INPUT_CLASS} {...register('memo')} />
      </FormField>
    </div>
  );
}
