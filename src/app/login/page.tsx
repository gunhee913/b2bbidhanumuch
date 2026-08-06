'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Check, Eye, EyeOff, Loader2 } from 'lucide-react';
import { MainHeader } from '@/features/main/components/MainHeader';
import { MainFooter } from '@/features/main/components/MainFooter';
import { cn } from '@/lib/utils';

const REMEMBER_KEY = 'auction:login:remember-phone';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const error = searchParams.get('error');

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(
    error ? '로그인에 실패했습니다.' : '',
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setPhone(saved);
      setRemember(true);
    }
  }, []);

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const result = await signIn('dealer-login', {
        phone,
        password,
        redirect: false,
      });

      if (result?.error) {
        setErrorMessage(result.error);
      } else if (result?.ok) {
        if (typeof window !== 'undefined') {
          if (remember) window.localStorage.setItem(REMEMBER_KEY, phone);
          else window.localStorage.removeItem(REMEMBER_KEY);
        }
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setErrorMessage('로그인 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit = phone.length >= 12 && password.length > 0 && !isLoading;

  return (
    <div className="flex min-h-screen flex-col">
      <MainHeader />
      <main className="flex flex-1 items-center bg-white py-10">
        <div className="mx-auto flex w-full max-w-[420px] flex-col items-stretch px-6">
          <div>
            <div className="mb-8 text-center">
              <h1 className="text-[26px] font-bold tracking-tight text-slate-900">
                로그인
              </h1>
              <p className="mt-2 text-[13.5px] leading-relaxed text-slate-500">
                <span className="font-semibold text-sky-600">
                  부분육 온라인경매
                </span>
                에 오신 것을 환영합니다.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[12.5px] leading-relaxed text-red-700">
                <span className="mt-[3px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <Field id="phone" label="휴대번호">
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                  placeholder="010-0000-0000"
                  maxLength={13}
                  autoComplete="tel"
                  className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-[14.5px] tabular-nums text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  required
                />
              </Field>

              <Field id="password" label="비밀번호">
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호를 입력해주세요"
                    autoComplete="current-password"
                    className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 pr-11 text-[14.5px] text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-2 inline-flex w-9 items-center justify-center text-slate-400 transition-colors hover:text-slate-700"
                    aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </Field>

              <div className="flex items-center justify-between pt-1">
                <RememberCheckbox checked={remember} onChange={setRemember} />
                <button
                  type="button"
                  disabled
                  className="text-[12px] text-slate-400 hover:text-slate-500 disabled:cursor-not-allowed"
                  title="준비 중입니다"
                >
                  비밀번호 찾기
                </button>
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 text-[15px] font-semibold text-white shadow-sm shadow-sky-600/20 transition-colors hover:bg-sky-700 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    로그인 중...
                  </>
                ) : (
                  '로그인'
                )}
              </button>
            </form>
          </div>

          <Link
            href="/signup"
            className="group mt-4 flex items-center gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white pl-0 pr-4 transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <span className="h-full w-1 self-stretch bg-sky-500" aria-hidden />
            <div className="flex-1 py-3.5">
              <p className="text-[13px] font-semibold text-slate-900">
                부분육 경매에 직접 참여해보세요
              </p>
              <p className="mt-0.5 text-[12px] text-slate-500">
                매참인 신청 안내
              </p>
            </div>
            <ArrowRight
              className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-700"
              strokeWidth={2.25}
            />
          </Link>
        </div>
      </main>
      <MainFooter />
    </div>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[12.5px] font-semibold text-slate-700"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function RememberCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 text-[12.5px] text-slate-600 hover:text-slate-900"
    >
      <span
        className={cn(
          'inline-flex h-4 w-4 items-center justify-center rounded border transition-colors',
          checked
            ? 'border-sky-600 bg-sky-600 text-white'
            : 'border-slate-300 bg-white text-transparent',
        )}
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
      휴대번호 저장
    </button>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
