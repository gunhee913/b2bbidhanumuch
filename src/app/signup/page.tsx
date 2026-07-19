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
import type { SignupFormValues } from "@/features/signup/schema";

export default function SignupPage() {
  const [step, setStep] = useState<SignupStep>("agreement");
  const [applicantName, setApplicantName] = useState<string | undefined>();

  const handleSubmit = (values: SignupFormValues) => {
    setApplicantName(values.name);
    setStep("complete");
  };

  return (
    <>
      <MainHeader />
      <main className="min-h-[calc(100vh-80px)] bg-slate-50 py-12">
        <div className="mx-auto max-w-[1240px] px-8">
          <header className="mb-10 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-sky-700">
              Matching Party Application
            </p>
            <h1 className="text-3xl font-bold text-slate-900">
              매매참여인(매참인) 회원가입
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              전자 약정에 동의하고 사업자 정보를 등록하시면, 관리자 검토 후
              경매 참여 계정이 활성화됩니다.
            </p>
          </header>

          <div className="mb-10">
            <SignupStepper current={step} />
          </div>

          <div className="mx-auto max-w-3xl">
            {step === "agreement" && (
              <AgreementStep onNext={() => setStep("info")} />
            )}
            {step === "info" && (
              <InfoStep
                onBack={() => setStep("agreement")}
                onSubmit={handleSubmit}
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
