'use client';

import { cn } from '@/lib/utils';

export const GB_INPUT_CLASS =
  'h-11 w-full rounded-lg border border-line bg-surface px-3.5 text-[14px] text-content outline-none transition-colors placeholder:text-content-ghost focus:border-content-soft focus:ring-2 focus:ring-ink/10 disabled:bg-surface-muted disabled:text-content-faint';

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-semibold text-content-mid">
        {label}
        {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-[12.5px] text-rose-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[12.5px] text-content-faint">{hint}</p>
      ) : null}
    </div>
  );
}

export function formatPhoneInput(value: string): string {
  const numbers = value.replace(/[^0-9]/g, '').slice(0, 11);
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
}

export function PrimaryButton({
  children,
  className,
  loading,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={rest.disabled || loading}
      className={cn(
        'inline-flex h-12 w-full items-center justify-center rounded-xl bg-ink text-[15px] font-bold text-white transition-colors hover:bg-ink-hover disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
    >
      {loading ? '처리 중…' : children}
    </button>
  );
}

/** 로그인/가입 카드 틀 */
export function AuthCard({ title, description, children, footer }: { title: string; description?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[440px]">
      <div className="rounded-2xl border border-line-soft bg-surface p-8 shadow-sm">
        <h1 className="text-[24px] font-bold tracking-[-0.02em] text-content">{title}</h1>
        {description ? <p className="mt-1.5 text-[13.5px] text-content-soft">{description}</p> : null}
        <div className="mt-7">{children}</div>
      </div>
      {footer ? <div className="mt-5 text-center text-[13.5px] text-content-soft">{footer}</div> : null}
    </div>
  );
}
