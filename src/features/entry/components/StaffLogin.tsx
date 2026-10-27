"use client";

import { Suspense } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { NH_LOGO_SRC } from "./EntryBrand";
import { LoginForm, type LoginProvider } from "./LoginForm";

interface StaffLoginProps {
  /** 제목 위 머리말 · 「관리자 로그인」 처럼 누구의 로그인인지 */
  eyebrow: string;
  provider: LoginProvider;
  rememberKey: string;
  defaultCallbackUrl: string;
  /** 계정이 없을 때 누구에게 묻는지 */
  contactNote?: string;
}

/**
 * 관리자·상장업체 로그인 화면 · 중도매인 로그인과 같은 폼과 제목 구성을 쓴다.
 * 비밀번호 찾기·둘러보기는 두지 않는다 · 계정은 상위 관리자가 발급한다.
 */
export function StaffLogin(props: StaffLoginProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <StaffLoginPanel {...props} />
    </Suspense>
  );
}

function StaffLoginPanel({ eyebrow, provider, rememberKey, defaultCallbackUrl, contactNote }: StaffLoginProps) {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || defaultCallbackUrl;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-[480px] rounded-[2px] border border-slate-200 bg-white px-10 py-11">
        <p className="text-[14px] font-medium leading-[1.25] text-slate-500">{eyebrow}</p>
        <h1 className="mt-2 flex items-center gap-2.5">
          <span className="relative h-6 w-6 shrink-0" aria-hidden>
            <Image src={NH_LOGO_SRC} alt="" fill sizes="24px" className="object-contain" priority unoptimized />
          </span>
          <span className="text-[24px] font-bold leading-[1.25] tracking-[-0.02em] text-slate-900">부분육 온라인경매</span>
        </h1>

        <div className="mt-8">
          <LoginForm
            callbackUrl={callbackUrl}
            initialError={searchParams.get("error")}
            provider={provider}
            rememberKey={rememberKey}
          />
        </div>

        {contactNote ? <p className="mt-6 text-[13px] leading-[1.5] text-slate-500">{contactNote}</p> : null}
      </div>
    </main>
  );
}
