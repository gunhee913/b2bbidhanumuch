"use client";

import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { fetchCompanyInfo } from "@/features/main/api";

const LOGO_SRC = "/cyber_symbol%203.gif";

const STATIC_LINKS: { label: string; href: string; strong?: boolean }[] = [
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
  const email = info?.email && info.email.trim() ? info.email : FALLBACK.email;

  const topLinks: { label: string; href: string; strong?: boolean }[] = [
    ...STATIC_LINKS,
    { label: "제휴 문의", href: `mailto:${email}` },
  ];

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-[1240px] px-8">
        <nav className="py-3">
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {topLinks.map((link) => (
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

        <div className="border-t border-slate-200 py-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-10">
            <div className="flex shrink-0 items-center gap-3">
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
                <span className="text-[16px] font-extrabold leading-none tracking-tight text-slate-800">
                  부분육 온라인경매
                </span>
                <span className="text-[10.5px] font-semibold leading-none text-slate-500">
                  <span>NH</span>
                  <span className="mx-1.5 text-slate-300">·</span>
                  Online Auction
                </span>
              </div>
            </div>

            <div className="min-w-0 flex-1 text-[12px] leading-[1.9] text-slate-500">
              <div className="flex flex-wrap items-center gap-x-2">
                <InfoItem label="상호" value={name} />
                <FooterDivider />
                <InfoItem label="대표이사" value={representative} />
                <FooterDivider />
                <InfoItem
                  label="사업자등록번호"
                  value={businessNumber}
                  valueClassName="tabular-nums"
                />
              </div>
              <div>
                <InfoItem label="사업장소재지" value={address} />
              </div>
              <div className="flex flex-wrap items-center gap-x-2">
                <InfoItem
                  label="고객센터"
                  value={
                    <>
                      <span className="tabular-nums">{phone}</span>
                      <span className="ml-1.5 text-slate-400">({hours})</span>
                    </>
                  }
                />
                <FooterDivider />
                <InfoItem
                  label="이메일"
                  value={
                    <a
                      href={`mailto:${email}`}
                      className="transition-colors hover:text-slate-800"
                    >
                      {email}
                    </a>
                  }
                />
              </div>

              <p className="mt-4 text-[11.5px] text-slate-400">
                Copyright &copy; 2024-{new Date().getFullYear()} 부분육
                온라인경매. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function InfoItem({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <span className="whitespace-nowrap">
      <span className="text-slate-400">{label} : </span>
      <span className={valueClassName ? `text-slate-700 ${valueClassName}` : "text-slate-700"}>
        {value}
      </span>
    </span>
  );
}

function FooterDivider() {
  return (
    <span className="hidden text-slate-300 md:inline" aria-hidden>
      |
    </span>
  );
}
