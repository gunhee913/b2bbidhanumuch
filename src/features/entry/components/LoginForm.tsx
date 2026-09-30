"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const REMEMBER_KEY = "auction:login:remember-phone";
const PHONE_MIN_LENGTH = 12; // 010-000-0000

type FieldName = "phone" | "password";

/**
 * 중도매인 로그인 폼 · 휴대번호 + 비밀번호.
 * - 오류는 상단 배너가 아니라 해당 입력 아래 인라인으로 · 인증 실패는 비밀번호 필드에 귀속, 비우고 포커스
 * - CTA 는 항상 진하게 · 미입력 상태로 누르면 비어 있는 첫 필드로 포커스 + 힌트
 * - 비밀번호 필드에서 Caps Lock 감지 힌트
 * 껍데기(제목·보조 링크)는 부모가 그린다.
 */
export function LoginForm({
  callbackUrl,
  initialError,
}: {
  callbackUrl: string;
  /** `?error=` 로 들어온 경우 첫 렌더에 띄울 메시지 */
  initialError?: string | null;
}) {
  const router = useRouter();
  const phoneRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>(
    initialError ? { password: "로그인에 실패했습니다. 다시 시도해 주세요." } : {},
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setPhone(saved);
      setRemember(true);
      passwordRef.current?.focus();
      return;
    }
    phoneRef.current?.focus();
  }, []);

  const clearError = (field: FieldName) =>
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  const validate = (): FieldName | null => {
    const next: Partial<Record<FieldName, string>> = {};
    if (phone.length < PHONE_MIN_LENGTH) next.phone = "휴대번호를 입력해 주세요.";
    if (password.length === 0) next.password = "비밀번호를 입력해 주세요.";
    setErrors(next);
    if (next.phone) return "phone";
    if (next.password) return "password";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const firstInvalid = validate();
    if (firstInvalid) {
      (firstInvalid === "phone" ? phoneRef : passwordRef).current?.focus();
      return;
    }

    setIsLoading(true);
    try {
      const result = await signIn("dealer-login", { phone, password, redirect: false });
      if (result?.error) {
        setErrors({ password: result.error });
        setPassword("");
        passwordRef.current?.focus();
        return;
      }
      if (result?.ok) {
        if (typeof window !== "undefined") {
          if (remember) window.localStorage.setItem(REMEMBER_KEY, phone);
          else window.localStorage.removeItem(REMEMBER_KEY);
        }
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setErrors({ password: "로그인 처리 중 오류가 발생했습니다." });
    } finally {
      setIsLoading(false);
    }
  };

  const syncCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) =>
    setCapsLockOn(e.getModifierState("CapsLock"));

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <Field id="phone" label="휴대번호" error={errors.phone}>
        <input
          ref={phoneRef}
          id="phone"
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(e) => {
            setPhone(formatPhoneNumber(e.target.value));
            clearError("phone");
          }}
          placeholder="010-0000-0000"
          maxLength={13}
          autoComplete="tel"
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={errors.phone ? "phone-error" : undefined}
          className={cn(INPUT_CLASS, errors.phone && INPUT_ERROR_CLASS)}
        />
      </Field>

      <Field
        id="password"
        label="비밀번호"
        error={errors.password}
        hint={capsLockOn && !errors.password ? "Caps Lock 이 켜져 있습니다." : undefined}
      >
        <div className="relative">
          <input
            ref={passwordRef}
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearError("password");
            }}
            onKeyDown={syncCapsLock}
            onKeyUp={syncCapsLock}
            onBlur={() => setCapsLockOn(false)}
            placeholder="비밀번호 입력"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
            className={cn(INPUT_CLASS, "pr-12", errors.password && INPUT_ERROR_CLASS)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-2 inline-flex w-10 items-center justify-center text-slate-400 transition-colors hover:text-slate-700"
            aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
          </button>
        </div>
      </Field>

      <RememberCheckbox checked={remember} onChange={setRemember} />

      <button
        type="submit"
        aria-busy={isLoading}
        className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-[2px] bg-slate-900 text-[15px] font-semibold text-white transition-colors hover:bg-slate-800 active:bg-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            로그인 중
          </>
        ) : (
          "로그인"
        )}
      </button>
    </form>
  );
}

const INPUT_CLASS =
  "h-[52px] w-full rounded-[2px] border border-slate-200 bg-white px-4 text-[15px] tabular-nums text-slate-900 outline-none transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10";
const INPUT_ERROR_CLASS = "border-rose-500 hover:border-rose-500 focus:border-rose-500 focus:ring-rose-500/10";

function formatPhoneNumber(value: string): string {
  const numbers = value.replace(/[^0-9]/g, "");
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
}

/** 라벨 위 · 입력 · 아래에 오류(rose) 또는 힌트(slate) 한 줄 · 둘 다 없으면 높이 차지 안 함 */
function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[13px] font-semibold text-slate-700">
        {label}
      </label>
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 flex items-start gap-1 text-[12.5px] leading-snug text-rose-600"
        >
          <AlertCircle className="mt-[1px] h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[12.5px] leading-snug text-slate-500">{hint}</p>
      ) : null}
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
      className="inline-flex items-center gap-2 text-[13px] text-slate-600 hover:text-slate-900"
    >
      <span
        className={cn(
          "inline-flex h-[18px] w-[18px] items-center justify-center rounded-[2px] border transition-colors",
          checked
            ? "border-slate-900 bg-slate-900 text-white"
            : "border-slate-300 bg-white text-transparent",
        )}
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
      휴대번호 저장
    </button>
  );
}
