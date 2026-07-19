"use client";

import Link from "next/link";
import { Building2, ShieldCheck, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface QuickLink {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  cta: string;
  accent: string;
}

const LINKS: QuickLink[] = [
  {
    icon: Users,
    title: "중도매인",
    description:
      "부위별 입찰과 낙찰, 잔고 관리, 거래처 배정을 한 곳에서 처리하세요.",
    href: "/login",
    cta: "중도매인 로그인",
    accent: "from-sky-500 to-sky-600",
  },
  {
    icon: Building2,
    title: "상장업체",
    description:
      "개체별 20부위 상장 등록부터 실시간 경매 모니터링, 정산까지 관리합니다.",
    href: "/company/login",
    cta: "상장업체 로그인",
    accent: "from-emerald-500 to-emerald-600",
  },
  {
    icon: ShieldCheck,
    title: "관리자",
    description:
      "회원·경매·정산·배송·콘텐츠 전반의 운영 대시보드에 접근합니다.",
    href: "/admin/login",
    cta: "관리자 로그인",
    accent: "from-slate-700 to-slate-800",
  },
];

export function QuickLinksSection() {
  return (
    <section className="bg-slate-50 py-14">
      <div className="mx-auto max-w-[1240px] px-8">
        <div className="mb-8 text-center">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-sky-700">
            Quick Access
          </p>
          <h2 className="text-2xl font-bold text-slate-900">
            역할별 바로가기
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            해당 계정으로 로그인하여 서비스를 이용하세요.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div
                  className={`h-1.5 w-full bg-gradient-to-r ${link.accent}`}
                />
                <div className="flex flex-1 flex-col p-7">
                  <div
                    className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${link.accent} text-white shadow-sm`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {link.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                    {link.description}
                  </p>
                  <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-slate-800 group-hover:text-sky-700">
                    {link.cta} <span aria-hidden>→</span>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
