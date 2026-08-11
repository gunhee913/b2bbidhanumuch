"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, X } from "lucide-react";
import Link from "next/link";
import { MainHeader } from "@/features/main/components/MainHeader";
import { MainFooter } from "@/features/main/components/MainFooter";
import {
  AGREEMENT_ITEMS,
  BUSINESS_TYPE_OPTIONS,
  DISTRIBUTION_CHANNEL_OPTIONS,
  GRADE_OPTIONS,
  MONTHLY_VOLUME_OPTIONS,
  PART_OPTIONS,
  SignupFormSchema,
  SLAUGHTER_HOUSE_OPTIONS,
  type AgreementId,
  type SignupFormValues,
} from "@/features/signup/schema";
import { useSubmitDealerApplication } from "@/features/dealer-applications/hooks";

const AGREEMENT_CONTENT_MAP: Partial<
  Record<AgreementId, { contentId: string; title: string }>
> = {
  service: { contentId: "terms", title: "서비스 이용약관" },
  privacy: { contentId: "privacy", title: "개인정보 수집·이용" },
};

export default function SignupPage() {
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [openTermsId, setOpenTermsId] = useState<string | null>(null);
  const [openTermsTitle, setOpenTermsTitle] = useState<string>("");
  const [agreements, setAgreements] = useState<Record<AgreementId, boolean>>({
    service: false,
    privacy: false,
    marketing: false,
  });

  const { mutateAsync, isPending } = useSubmitDealerApplication();

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

  const requiredAgreementIds = AGREEMENT_ITEMS.filter((i) => i.required).map(
    (i) => i.id,
  );
  const allRequiredAgreed = requiredAgreementIds.every((id) => agreements[id]);
  const allAgreed = AGREEMENT_ITEMS.every((i) => agreements[i.id]);

  const toggleAgreement = (id: AgreementId) => {
    setAgreements((prev) => ({ ...prev, [id]: !prev[id] }));
  };
  const toggleAllAgreements = () => {
    const next = !allAgreed;
    setAgreements({
      service: next,
      privacy: next,
      marketing: next,
    });
  };

  const onSubmit = async (values: SignupFormValues) => {
    setServerError(null);
    if (!allRequiredAgreed) {
      setServerError("필수 약관에 모두 동의해 주세요.");
      return;
    }
    try {
      await mutateAsync({
        applicantName: values.name,
        phone: values.phone,
        email: values.email || undefined,
        password: values.password,
        auctionPassword: values.auctionPassword,
        businessName: values.businessName,
        businessNo: values.businessNo,
        representativeName: values.representative,
        address: values.address,
        businessType: values.businessType,
        preferredSlaughterHouses: values.preferredSlaughterHouses,
        preferredParts: values.preferredParts,
        preferredGrades: values.preferredGrades,
        expectedMonthlyVolume: values.expectedMonthlyVolume || undefined,
        distributionChannels: values.distributionChannels,
        inquiry: values.inquiry || undefined,
        agreedService: agreements.service,
        agreedPrivacy: agreements.privacy,
        agreedMarketing: agreements.marketing,
      });
      setSubmitted(values.name);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "신청 접수 중 오류가 발생했습니다.",
      );
    }
  };

  if (submitted) {
    return (
      <>
        <MainHeader />
        <main className="flex min-h-[calc(100vh-80px)] items-center bg-white py-16">
          <div className="mx-auto w-full max-w-[560px] px-6 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h1 className="text-[26px] font-bold text-slate-900">
              매참인 신청이 접수되었습니다
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              {submitted}님, 신청이 정상 접수되었습니다.
              <br />
              담당자가 확인 후 등록하신 휴대번호로 별도 안내드리겠습니다.
            </p>

            <div className="mx-auto mt-8 rounded-lg border border-slate-200 bg-slate-50 p-5 text-left">
              <div className="mb-2 text-[12.5px] font-semibold text-slate-700">
                다음 절차 안내
              </div>
              <ul className="space-y-1.5 text-[12.5px] leading-relaxed text-slate-600">
                <li>1. 관리자가 신청 내역과 사업자 정보를 확인합니다.</li>
                <li>
                  2. 필요 시 등록하신 휴대번호로 담당자가 직접 연락드립니다.
                </li>
                <li>
                  3. 승인 안내에 따라 로그인하시면 부분육 경매에 참여하실 수
                  있습니다.
                </li>
              </ul>
            </div>

            <div className="mt-8 flex items-center justify-center gap-3">
              <Link
                href="/main"
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                홈으로
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
              >
                로그인 페이지
              </Link>
            </div>
          </div>
        </main>
        <MainFooter />
      </>
    );
  }

  return (
    <>
      <MainHeader />
      <main className="min-h-[calc(100vh-80px)] bg-white py-12">
        <div className="mx-auto w-full max-w-[560px] px-6">
          {/* 헤더 */}
          <header className="mb-10">
            <h1 className="text-[26px] font-bold text-slate-900">
              매참인 신청
            </h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-slate-500">
              신청 내용을 확인 후 담당자가 등록하신 휴대번호로 연락드립니다.
            </p>
          </header>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
            {/* 개인 정보 */}
            <Section title="개인 정보">
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
                  className="input tabular-nums"
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
            </Section>

            {/* 사업자 정보 */}
            <Section title="사업자 정보">
              <Field
                label="사업 형태"
                required
                error={errors.businessType?.message}
              >
                <div className="flex gap-2">
                  {BUSINESS_TYPE_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition ${
                        businessType === opt.value
                          ? "border-sky-500 bg-sky-50 font-semibold text-sky-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        value={opt.value}
                        {...register("businessType")}
                        className="hidden"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </Field>
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
                  className="input tabular-nums"
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
            </Section>

            {/* 거래 희망 사항 */}
            <Section
              title="거래 희망 사항"
              subtitle="선택 사항 · 관리자가 매칭에 참고합니다."
            >
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
              <Field label="예상 월 거래량">
                <select
                  {...register("expectedMonthlyVolume")}
                  className="input"
                >
                  <option value="">선택해 주세요</option>
                  {MONTHLY_VOLUME_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>
              <ChipGroup
                label="유통 채널"
                options={DISTRIBUTION_CHANNEL_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                }))}
                selected={distributionChannels}
                onToggle={(v) => toggleValue("distributionChannels", v)}
              />
            </Section>

            {/* 문의 사항 */}
            <Section
              title="문의 사항"
              subtitle="선택 사항 · 담당자에게 전달됩니다."
            >
              <textarea
                {...register("inquiry")}
                placeholder="관리자에게 전달하실 사항이 있다면 자유롭게 남겨 주세요."
                rows={4}
                className="input min-h-[100px] resize-y"
              />
              {errors.inquiry && (
                <p className="mt-1 text-xs text-rose-500">
                  {errors.inquiry.message}
                </p>
              )}
            </Section>

            {/* 약관 동의 */}
            <Section title="약관 동의">
              <div className="rounded-lg border border-slate-200 bg-white">
                <label className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-4 py-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-2 focus:ring-sky-200"
                    checked={allAgreed}
                    onChange={toggleAllAgreements}
                  />
                  <span className="text-sm font-semibold text-slate-900">
                    모든 약관에 동의합니다
                  </span>
                </label>
                <ul className="divide-y divide-slate-100">
                  {AGREEMENT_ITEMS.map((item) => {
                    const linked = AGREEMENT_CONTENT_MAP[item.id];
                    return (
                      <li key={item.id}>
                        <div className="flex items-center gap-3 px-4 py-2.5">
                          <label className="flex flex-1 cursor-pointer items-center gap-3">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-2 focus:ring-sky-200"
                              checked={agreements[item.id]}
                              onChange={() => toggleAgreement(item.id)}
                            />
                            <span className="text-[13px] text-slate-700">
                              {item.label}
                            </span>
                          </label>
                          {linked && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenTermsId(linked.contentId);
                                setOpenTermsTitle(linked.title);
                              }}
                              className="text-[11.5px] text-slate-500 underline underline-offset-2 hover:text-sky-600"
                            >
                              약관보기
                            </button>
                          )}
                          <span
                            className={`shrink-0 text-[11px] font-semibold ${
                              item.required
                                ? "text-rose-600"
                                : "text-slate-400"
                            }`}
                          >
                            {item.required ? "필수" : "선택"}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

            </Section>

            {/* 에러 · 제출 */}
            {serverError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending || !allRequiredAgreed}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 text-[15px] font-semibold text-white shadow-sm shadow-sky-600/20 transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  제출 중...
                </>
              ) : (
                "매참인 신청하기"
              )}
            </button>

            {!allRequiredAgreed && (
              <p className="-mt-6 text-center text-[11.5px] text-slate-500">
                필수 약관에 모두 동의해 주세요.
              </p>
            )}
          </form>
        </div>
      </main>
      <MainFooter />

      {openTermsId && (
        <TermsModal
          contentId={openTermsId}
          title={openTermsTitle}
          onClose={() => setOpenTermsId(null)}
        />
      )}

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgb(226 232 240);
          background-color: white;
          padding: 0.625rem 0.875rem;
          font-size: 0.875rem;
          color: rgb(15 23 42);
          transition:
            border-color 0.15s,
            box-shadow 0.15s;
        }
        .input::placeholder {
          color: rgb(148 163 184);
        }
        .input:focus {
          outline: none;
          border-color: rgb(14 165 233);
          box-shadow: 0 0 0 3px rgb(224 242 254);
        }
      `}</style>
    </>
  );
}

// ============================================
// Layout blocks
// ============================================
function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <header className="mb-4 border-b border-slate-100 pb-2">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-slate-500">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-[11.5px] text-slate-400">{subtitle}</p>
        )}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  error,
  help,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1 text-[12.5px] font-semibold text-slate-700">
        {label}
        {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
      {help && !error && (
        <p className="mt-1 text-[11px] text-slate-500">{help}</p>
      )}
      {error && <p className="mt-1 text-[11.5px] text-rose-500">{error}</p>}
    </div>
  );
}

function TermsModal({
  contentId,
  title,
  onClose,
}: {
  contentId: string;
  title: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery<{ title: string; content: string }>({
    queryKey: ["site-content", contentId],
    queryFn: async () => {
      const res = await fetch(`/api/site-contents/${contentId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[80vh] w-full max-w-[560px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 불러오는 중
            </div>
          ) : !data?.content ? (
            <div className="py-16 text-center text-sm text-slate-400">
              등록된 약관이 없습니다.
            </div>
          ) : (
            <div className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-slate-700">
              {data.content}
            </div>
          )}
        </div>
        <div className="border-t border-slate-200 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="ml-auto block rounded-md border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

function ChipGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-[12.5px] font-semibold text-slate-700">
        {label}
        {selected.length > 0 && (
          <span className="text-[11px] font-normal text-sky-600">
            · {selected.length}개 선택
          </span>
        )}
      </label>
      <div className="flex flex-wrap gap-1.5">
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
