'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GroupBuyShell } from '@/features/group-buy/components/GroupBuyShell';
import { AuthCard, FormField, GB_INPUT_CLASS, PrimaryButton, formatPhoneInput } from '@/features/group-buy/components/FormField';
import { ApiError, signupConsumer } from '@/features/group-buy/api';

const signupSchema = z
  .object({
    name: z.string().trim().min(2, '이름을 2자 이상 입력해주세요.').max(20),
    phone: z.string().regex(/^01[016789]-\d{3,4}-\d{4}$/, '휴대폰 번호 형식을 확인해주세요.'),
    password: z.string().min(6, '비밀번호는 6자 이상이어야 해요.').max(64),
    passwordConfirm: z.string(),
    email: z.string().trim().email('이메일 형식을 확인해주세요.').or(z.literal('')).optional(),
    agree: z.boolean().refine((v) => v, '약관에 동의해주세요.'),
  })
  .refine((v) => v.password === v.passwordConfirm, { message: '비밀번호가 서로 달라요.', path: ['passwordConfirm'] });

type SignupForm = z.infer<typeof signupSchema>;

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get('callbackUrl');
  const callbackUrl = rawCallback && rawCallback.startsWith('/group-buy') ? rawCallback : '/group-buy';

  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', phone: '', password: '', passwordConfirm: '', email: '', agree: false },
  });
  const phone = watch('phone');

  const onSubmit = async (values: SignupForm) => {
    setServerError('');
    try {
      await signupConsumer({
        name: values.name,
        phone: values.phone,
        password: values.password,
        email: values.email || undefined,
      });
      const result = await signIn('consumer-login', { phone: values.phone, password: values.password, redirect: false });
      if (result?.error) {
        router.push(`/group-buy/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setServerError('이미 가입된 휴대폰 번호예요. 로그인해주세요.');
        return;
      }
      setServerError(e instanceof Error ? e.message : '가입 중 문제가 생겼어요.');
    }
  };

  return (
    <AuthCard
      title="회원가입"
      description="휴대폰 번호와 비밀번호만 있으면 돼요. 배송지는 참여할 때 입력합니다."
      footer={
        <>
          이미 계정이 있으신가요?{' '}
          <Link href={`/group-buy/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-semibold text-content underline-offset-4 hover:underline">
            로그인
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <FormField label="이름" htmlFor="name" required error={errors.name?.message}>
          <input id="name" autoComplete="name" placeholder="받으실 분 이름" className={GB_INPUT_CLASS} {...register('name')} />
        </FormField>
        <FormField label="휴대폰 번호" htmlFor="phone" required error={errors.phone?.message} hint="로그인 아이디로 사용돼요.">
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="010-0000-0000"
            maxLength={13}
            className={GB_INPUT_CLASS}
            value={phone}
            onChange={(e) => setValue('phone', formatPhoneInput(e.target.value), { shouldValidate: !!errors.phone })}
          />
        </FormField>
        <FormField label="비밀번호" htmlFor="password" required error={errors.password?.message}>
          <input id="password" type="password" autoComplete="new-password" placeholder="6자 이상" className={GB_INPUT_CLASS} {...register('password')} />
        </FormField>
        <FormField label="비밀번호 확인" htmlFor="passwordConfirm" required error={errors.passwordConfirm?.message}>
          <input id="passwordConfirm" type="password" autoComplete="new-password" placeholder="한 번 더 입력" className={GB_INPUT_CLASS} {...register('passwordConfirm')} />
        </FormField>
        <FormField label="이메일" htmlFor="email" error={errors.email?.message} hint="선택 · 참여 내역 안내를 받을 주소">
          <input id="email" type="email" autoComplete="email" placeholder="name@example.com" className={GB_INPUT_CLASS} {...register('email')} />
        </FormField>

        <label className="flex cursor-pointer items-start gap-2.5 text-[13px] text-content-mid">
          <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-line accent-black" {...register('agree')} />
          <span>
            이용약관과 개인정보 처리방침에 동의합니다. 입력한 정보는 소분·배송에만 사용돼요.
            {errors.agree ? <span className="block text-rose-600">{errors.agree.message}</span> : null}
          </span>
        </label>

        {serverError ? (
          <p role="alert" className="rounded-lg bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-700">
            {serverError}
          </p>
        ) : null}

        <PrimaryButton type="submit" loading={isSubmitting}>
          가입하고 시작하기
        </PrimaryButton>
      </form>
    </AuthCard>
  );
}

export default function GroupBuySignupPage() {
  return (
    <GroupBuyShell className="py-20">
      <Suspense fallback={null}>
        <SignupForm />
      </Suspense>
    </GroupBuyShell>
  );
}
