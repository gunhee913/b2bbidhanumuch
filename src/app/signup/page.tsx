"use client";

import { useState } from "react";
import { MainHeader } from "@/features/main/components/MainHeader";
import { MainFooter } from "@/features/main/components/MainFooter";
import {
  SignupStepper,
  type SignupStep,
} from "@/features/signup/components/SignupStepper";
import { AgreementStep } from "@/features/signup/components/AgreementStep";
import { InfoStep } from "@/features/signup/components/InfoStep";
import { CompleteStep } from "@/features/signup/components/CompleteStep";
import type { AgreementId, SignupFormValues } from "@/features/signup/schema";
import { useSubmitDealerApplication } from "@/features/dealer-applications/hooks";

export default function SignupPage() {
  const [step, setStep] = useState<SignupStep>("agreement");
  const [applicantName, setApplicantName] = useState<string | undefined>();
  const [agreements, setAgreements] = useState<Record<AgreementId, boolean>>({
    service: false,
    privacy: false,
    trade: false,
    marketing: false,
  });
  const [serverError, setServerError] = useState<string | null>(null);

  const { mutateAsync, isPending } = useSubmitDealerApplication();

  const handleAgreementNext = (values: Record<AgreementId, boolean>) => {
    setAgreements(values);
    setStep("info");
  };

  const handleSubmit = async (values: SignupFormValues) => {
    setServerError(null);
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
        agreedTrade: agreements.trade,
        agreedMarketing: agreements.marketing,
      });
      setApplicantName(values.name);
      setStep("complete");
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "신청 접수 중 오류가 발생했습니다.",
      );
    }
  };

  return (
    <>
      <MainHeader />
      <main className="min-h-[calc(100vh-80px)] bg-slate-50 py-12">
        <div className="mx-auto max-w-[1240px] px-8">
          <header className="mb-10 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-sky-700">
              Dealer Application
            </p>
            <h1 className="text-3xl font-bold text-slate-900">매참인 신청</h1>
            <p className="mt-2 text-sm text-slate-500">
              전자 약정에 동의하고 사업자 정보 및 거래 희망 사항을 남겨 주시면,
              담당자가 확인 후 안내드립니다.
            </p>
          </header>

          <div className="mb-10">
            <SignupStepper current={step} />
          </div>

          <div className="mx-auto max-w-3xl">
            {step === "agreement" && (
              <AgreementStep onNext={handleAgreementNext} />
            )}
            {step === "info" && (
              <InfoStep
                onBack={() => setStep("agreement")}
                onSubmit={handleSubmit}
                isSubmitting={isPending}
                serverError={serverError}
              />
            )}
            {step === "complete" && (
              <CompleteStep applicantName={applicantName} />
            )}
          </div>
        </div>
      </main>
      <MainFooter />
    </>
  );
}
