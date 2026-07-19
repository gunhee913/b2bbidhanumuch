"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Building2, User } from "lucide-react";
import {
  SignupFormSchema,
  type SignupFormValues,
} from "@/features/signup/schema";

interface Props {
  onBack: () => void;
  onSubmit: (values: SignupFormValues) => void;
}

export function InfoStep({ onBack, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(SignupFormSchema),
    mode: "onBlur",
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <User className="h-5 w-5 text-sky-700" />
          <h2 className="text-lg font-semibold text-slate-900">기본 정보</h2>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-5">
          <Field label="이름" required error={errors.name?.message}>
            <input
              type="text"
              {...register("name")}
              placeholder="홍길동"
              className="input"
            />
          </Field>
          <Field label="휴대전화" required error={errors.phone?.message}>
            <input
              type="tel"
              {...register("phone")}
              placeholder="010-1234-5678"
              className="input"
            />
          </Field>
          <Field label="비밀번호" required error={errors.password?.message}>
            <input
              type="password"
              {...register("password")}
              placeholder="8자 이상"
              className="input"
            />
          </Field>
          <Field
            label="비밀번호 확인"
            required
            error={errors.passwordConfirm?.message}
          >
            <input
              type="password"
              {...register("passwordConfirm")}
              placeholder="비밀번호를 다시 입력"
              className="input"
            />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-sky-700" />
          <h2 className="text-lg font-semibold text-slate-900">사업자 정보</h2>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-5">
          <Field
            label="상호(사업장명)"
            required
            error={errors.businessName?.message}
          >
            <input
              type="text"
              {...register("businessName")}
              placeholder="예: 한우유통상회"
              className="input"
            />
          </Field>
          <Field
            label="사업자등록번호"
            required
            error={errors.businessNo?.message}
          >
            <input
              type="text"
              {...register("businessNo")}
              placeholder="123-45-67890"
              className="input"
            />
          </Field>
          <Field
            label="대표자명"
            required
            error={errors.representative?.message}
          >
            <input
              type="text"
              {...register("representative")}
              placeholder="대표자 성명"
              className="input"
            />
          </Field>
          <Field
            label="사업장 주소"
            required
            error={errors.address?.message}
            className="col-span-2"
          >
            <input
              type="text"
              {...register("address")}
              placeholder="시/도, 시/군/구, 상세 주소"
              className="input"
            />
          </Field>
        </div>

        <p className="mt-5 rounded-md bg-sky-50 px-4 py-3 text-xs text-sky-800">
          사업자등록증 등 증빙 서류는 신청 이후 관리자 검토 단계에서 별도
          안내드립니다.
        </p>
      </section>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          ← 이전 단계
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:bg-slate-300"
        >
          가입 신청하기 <span aria-hidden>→</span>
        </button>
      </div>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgb(203 213 225);
          background-color: white;
          padding: 0.625rem 0.875rem;
          font-size: 0.875rem;
          color: rgb(15 23 42);
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        :global(.input::placeholder) {
          color: rgb(148 163 184);
        }
        :global(.input:focus) {
          outline: none;
          border-color: rgb(14 165 233);
          box-shadow: 0 0 0 3px rgb(224 242 254);
        }
      `}</style>
    </form>
  );
}

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

function Field({ label, required, error, children, className = "" }: FieldProps) {
  return (
    <div className={className}>
      <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-700">
        {label}
        {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
    </div>
  );
}
