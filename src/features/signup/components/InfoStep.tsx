"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Building2, User, ShoppingCart, MessageSquare } from "lucide-react";
import {
  BUSINESS_TYPE_OPTIONS,
  DISTRIBUTION_CHANNEL_OPTIONS,
  GRADE_OPTIONS,
  MONTHLY_VOLUME_OPTIONS,
  PART_OPTIONS,
  SignupFormSchema,
  SLAUGHTER_HOUSE_OPTIONS,
  type SignupFormValues,
} from "@/features/signup/schema";

interface Props {
  onBack: () => void;
  onSubmit: (values: SignupFormValues) => void;
  isSubmitting?: boolean;
  serverError?: string | null;
}

export function InfoStep({ onBack, onSubmit, isSubmitting, serverError }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(SignupFormSchema),
    mode: "onBlur",
    defaultValues: {
      preferredSlaughterHouses: [],
      preferredParts: [],
      preferredGrades: [],
      distributionChannels: [],
    },
  });

  const preferredSlaughterHouses = watch("preferredSlaughterHouses") ?? [];
  const preferredParts = watch("preferredParts") ?? [];
  const preferredGrades = watch("preferredGrades") ?? [];
  const distributionChannels = watch("distributionChannels") ?? [];
  const businessType = watch("businessType");

  const toggleValue = (
    field:
      | "preferredSlaughterHouses"
      | "preferredParts"
      | "preferredGrades"
      | "distributionChannels",
    value: string,
  ) => {
    const current = (watch(field) ?? []) as string[];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setValue(field, next, { shouldValidate: true });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* 개인 정보 */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <User className="h-5 w-5 text-sky-700" />
          <h2 className="text-lg font-semibold text-slate-900">개인 정보</h2>
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
          <Field label="휴대번호" required error={errors.phone?.message}>
            <input
              type="tel"
              {...register("phone")}
              placeholder="010-1234-5678"
              className="input"
            />
          </Field>
          <Field label="이메일" error={errors.email?.message}>
            <input
              type="email"
              {...register("email")}
              placeholder="example@company.com"
              className="input"
            />
          </Field>
          <div />
          <Field
            label="로그인 비밀번호"
            required
            error={errors.password?.message}
          >
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
          <Field
            label="경매 비밀번호"
            required
            error={errors.auctionPassword?.message}
            help="입찰 시 사용하는 별도의 비밀번호입니다."
          >
            <input
              type="password"
              {...register("auctionPassword")}
              placeholder="4~20자"
              className="input"
            />
          </Field>
        </div>
      </section>

      {/* 사업자 정보 */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-sky-700" />
          <h2 className="text-lg font-semibold text-slate-900">사업자 정보</h2>
        </div>

        <div className="mb-5">
          <label className="mb-2 block text-xs font-semibold text-slate-700">
            사업 형태 <span className="text-rose-500">*</span>
          </label>
          <div className="flex gap-2">
            {BUSINESS_TYPE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm transition ${
                  businessType === opt.value
                    ? "border-sky-500 bg-sky-50 text-sky-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  value={opt.value}
                  {...register("businessType")}
                  className="hidden"
                />
                <span
                  className={`inline-block h-3 w-3 rounded-full border-2 ${
                    businessType === opt.value
                      ? "border-sky-600 bg-sky-600 ring-2 ring-white"
                      : "border-slate-300 bg-white"
                  }`}
                />
                {opt.label}
              </label>
            ))}
          </div>
          {errors.businessType && (
            <p className="mt-1 text-xs text-rose-500">
              {errors.businessType.message}
            </p>
          )}
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

      {/* 거래 희망 사항 */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-sky-700" />
          <h2 className="text-lg font-semibold text-slate-900">
            거래 희망 사항
          </h2>
          <span className="text-xs text-slate-400">· 선택 사항</span>
        </div>

        <div className="space-y-5">
          <ChipGroup
            label="거래 희망 공판장"
            options={SLAUGHTER_HOUSE_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
            selected={preferredSlaughterHouses}
            onToggle={(v) => toggleValue("preferredSlaughterHouses", v)}
          />

          <ChipGroup
            label="주요 필요 부위"
            options={PART_OPTIONS.map((p) => ({ value: p, label: p }))}
            selected={preferredParts}
            onToggle={(v) => toggleValue("preferredParts", v)}
          />

          <ChipGroup
            label="관심 등급대"
            options={GRADE_OPTIONS.map((g) => ({ value: g, label: g }))}
            selected={preferredGrades}
            onToggle={(v) => toggleValue("preferredGrades", v)}
          />

          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-700">
              예상 월 거래량
            </label>
            <select {...register("expectedMonthlyVolume")} className="input">
              <option value="">선택해 주세요</option>
              {MONTHLY_VOLUME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <ChipGroup
            label="유통 채널"
            options={DISTRIBUTION_CHANNEL_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
            selected={distributionChannels}
            onToggle={(v) => toggleValue("distributionChannels", v)}
          />
        </div>
      </section>

      {/* 문의 사항 */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-sky-700" />
          <h2 className="text-lg font-semibold text-slate-900">문의 사항</h2>
          <span className="text-xs text-slate-400">· 선택 사항</span>
        </div>
        <textarea
          {...register("inquiry")}
          placeholder="관리자에게 전달하실 사항이 있다면 자유롭게 남겨 주세요."
          rows={4}
          className="input min-h-[100px] resize-y"
        />
        {errors.inquiry && (
          <p className="mt-1 text-xs text-rose-500">{errors.inquiry.message}</p>
        )}
      </section>

      {/* 서버 에러 · 액션 */}
      {serverError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {serverError}
        </div>
      )}

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
          {isSubmitting ? "제출 중..." : "매참인 신청 제출"}
          <span aria-hidden>→</span>
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
          transition:
            border-color 0.15s,
            box-shadow 0.15s;
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
  help?: string;
  children: React.ReactNode;
  className?: string;
}

function Field({
  label,
  required,
  error,
  help,
  children,
  className = "",
}: FieldProps) {
  return (
    <div className={className}>
      <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-700">
        {label}
        {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
      {help && !error && (
        <p className="mt-1 text-[11.5px] text-slate-500">{help}</p>
      )}
      {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
    </div>
  );
}

interface ChipGroupProps {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}

function ChipGroup({ label, options, selected, onToggle }: ChipGroupProps) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold text-slate-700">
        {label}
        {selected.length > 0 && (
          <span className="ml-2 text-[11px] font-normal text-slate-500">
            · {selected.length}개 선택
          </span>
        )}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onToggle(opt.value)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                active
                  ? "border-sky-500 bg-sky-50 text-sky-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
