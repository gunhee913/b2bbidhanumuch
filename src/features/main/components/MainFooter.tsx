"use client";

import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { fetchCompanyInfo } from "@/features/main/api";

const LOGO_SRC = "/cyber_symbol%203.gif";

const SITEMAP_LINKS: { label: string; href: string; strong?: boolean }[] = [
  { label: "회사소개", href: "/about" },
  { label: "공지사항", href: "/notice" },
  { label: "자주 묻는 질문", href: "/faq" },
  { label: "이용약관", href: "/terms" },
  { label: "개인정보처리방침", href: "/privacy", strong: true },
];

const FALLBACK = {
  name: "농협 경제지주",
  representative: "안병우",
  address: "서울특별시 중구 새문안로 16",
  phone: "1544-0000",
  businessHours: "평일 09:00 ~ 18:00 (주말·공휴일 휴무)",
  businessNumber: "000-00-00000",
  email: "support@nh-auction.co.kr",
  partnership: "partnership@nh-auction.co.kr",
};

export function MainFooter() {
  const { data: info } = useQuery({
    queryKey: ["main", "company-info"],
    queryFn: fetchCompanyInfo,
    staleTime: 5 * 60_000,
  });

  const name = info?.name ?? FALLBACK.name;
  const address = info?.address ?? FALLBACK.address;
  const phone = info?.phone ?? FALLBACK.phone;
  const hours = info?.businessHours ?? FALLBACK.businessHours;
  const businessNumber = info?.businessNumber ?? FALLBACK.businessNumber;
  const representative = info?.representative ?? FALLBACK.representative;

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-[1240px] px-8 py-14">
        <div className="grid grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-[4fr_2fr_3fr]">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="relative h-8 w-8 shrink-0">
                <Image
                  src={LOGO_SRC}
                  alt="부분육 온라인경매 로고"
                  fill
                  sizes="32px"
                  className="object-contain grayscale"
                  unoptimized
                />
              </div>
              <div className="h-7 w-px bg-slate-300" aria-hidden />
              <div className="flex flex-col gap-0.5">
                <span className="text-[17px] font-extrabold leading-none tracking-tight text-slate-700">
                  부분육 온라인경매
                </span>
                <span className="text-[11px] font-semibold leading-none text-slate-500">
                  <span>NH</span>
                  <span className="mx-1.5 text-slate-300">·</span>
                  Online Auction
                </span>
              </div>
            </div>

            <div className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-slate-500">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>(주){name}</span>
                <VerticalDivider />
                <span>대표이사 {representative}</span>
              </div>
              <div>{address}</div>
              <div className="tabular-nums">
                사업자등록번호 {businessNumber}
              </div>
            </div>

            <p className="mt-4 text-[12px] text-slate-400">
              Copyright 2024-{new Date().getFullYear()} 부분육 온라인경매. All
              rights reserved.
            </p>
          </div>

          <nav>
            <ul className="space-y-3">
              {SITEMAP_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={
                      link.strong
                        ? "text-[13px] font-bold text-slate-900 transition-colors hover:text-slate-700"
                        : "text-[13px] font-medium text-slate-600 transition-colors hover:text-slate-900"
                    }
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <dl className="space-y-3">
            <SupportRow label="전화상담">
              <span className="tabular-nums text-slate-900">{phone}</span>
              <span className="ml-2 text-slate-500">({hours})</span>
            </SupportRow>
            <SupportRow label="이메일 상담">
              <span className="text-slate-900">{FALLBACK.email}</span>
            </SupportRow>
            <SupportRow label="제휴 문의">
              <span className="text-slate-900">{FALLBACK.partnership}</span>
            </SupportRow>
          </dl>
        </div>
      </div>
    </footer>
  );
}

function SupportRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 text-[13px]">
      <dt className="w-24 shrink-0 font-medium text-slate-500">{label}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  );
}

function VerticalDivider() {
  return <span className="h-3 w-px bg-slate-300" aria-hidden />;
}
