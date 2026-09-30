"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock } from "lucide-react";

export interface LoginGateCardProps {
  /** 페이지 이름 · "경매내역" 같은 문구가 자연스럽게 들어가도록 */
  pageLabel: string;
  /** dealer 로그인만 허용하는 경우 안내 문구를 커스터마이즈 */
  requireDealer?: boolean;
}

/**
 * 로그인/딜러 인증이 필요한 페이지에서 본문 대신 노출하는 게이트 카드.
 * 페이지 라우팅을 유지한 채 인증 상태만 안내한다 (redirect X).
 *
 * 로그인 버튼은 현재 경로를 `callbackUrl` 로 실어 보내 로그인 후 원래 페이지로
 * 돌아오게 한다. (예: `/history` 게이트 → 로그인 → 다시 `/history`)
 */
export function LoginGateCard({ pageLabel, requireDealer }: LoginGateCardProps) {
  const pathname = usePathname();
  const callbackUrl = pathname && pathname !== "/" ? pathname : "/main";
  const loginHref = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  const title = requireDealer
    ? `${pageLabel} 페이지는 중도매인 회원 전용입니다`
    : `${pageLabel} 페이지는 로그인 후 이용할 수 있습니다`;
  const description = requireDealer
    ? "중도매인 계정으로 로그인해야 낙찰 내역과 배송지시 정보를 확인할 수 있습니다."
    : "실시간 입찰 현황과 종료된 경매 결과를 확인하려면 로그인해 주세요.";

  return (
    <div className="mx-auto flex min-h-[420px] w-full max-w-[520px] flex-col items-center justify-center px-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-50">
        <Lock className="h-6 w-6 text-sky-600" strokeWidth={1.75} />
      </div>
      <h2 className="mt-5 text-center text-[18px] font-bold text-content">
        {title}
      </h2>
      <p className="mt-2 text-center text-[13px] leading-relaxed text-content-soft">
        {description}
      </p>
      <div className="mt-6 flex items-center gap-2">
        <Link
          href={loginHref}
          className="inline-flex h-10 items-center rounded-md bg-sky-600 px-5 text-[13px] font-semibold text-white transition-colors hover:bg-sky-700"
        >
          로그인
        </Link>
        <Link
          href="/signup"
          className="inline-flex h-10 items-center rounded-md border border-line bg-surface px-5 text-[13px] font-semibold text-content-mid transition-colors hover:border-line hover:bg-surface-muted"
        >
          회원가입
        </Link>
      </div>
    </div>
  );
}
