'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { GroupBuyShell } from '@/features/group-buy/components/GroupBuyShell';
import { AuthCard, FormField, GB_INPUT_CLASS, PrimaryButton, formatPhoneInput } from '@/features/group-buy/components/FormField';

const DEFAULT_CALLBACK = '/group-buy';

function safeCallback(raw: string | null): string {
  if (!raw || !raw.startsWith('/group-buy')) return DEFAULT_CALLBACK;
  return raw;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallback(searchParams.get('callbackUrl'));

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signIn('consumer-login', { phone, password, redirect: false });
      if (result?.error) {
        setError('휴대폰 번호 또는 비밀번호를 확인해주세요.');
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError('로그인 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const signupHref = `/group-buy/signup${callbackUrl !== DEFAULT_CALLBACK ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`;

  return (
    <AuthCard
      title="로그인"
      description="참여하려면 로그인이 필요해요."
      footer={
        <>
          처음이신가요?{' '}
          <Link href={signupHref} className="font-semibold text-content underline-offset-4 hover:underline">
            30초 만에 가입하기
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormField label="휴대폰 번호" htmlFor="phone" required>
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
            placeholder="010-0000-0000"
            maxLength={13}
            className={GB_INPUT_CLASS}
            required
          />
        </FormField>
        <FormField label="비밀번호" htmlFor="password" required>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            className={GB_INPUT_CLASS}
            required
          />
        </FormField>
        {error ? (
          <p role="alert" className="rounded-lg bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-700">
            {error}
          </p>
        ) : null}
        <PrimaryButton type="submit" loading={loading}>
          로그인
        </PrimaryButton>
      </form>
    </AuthCard>
  );
}

export default function GroupBuyLoginPage() {
  return (
    <GroupBuyShell className="py-20">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </GroupBuyShell>
  );
}
