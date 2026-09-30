"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchCompanyInfo } from "@/features/main/api";
import { Wordmark } from "@/components/brand/Wordmark";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/cyber_symbol%203.gif";

const STATIC_LINKS: { label: string; href: string; strong?: boolean }[] = [
  { label: "이용약관", href: "/terms" },
  { label: "개인정보처리방침", href: "/privacy", strong: true },
];

const FALLBACK = {
  name: "농협 경제지주",
  representative: "안병우",
  address: "서울특별시 중구 새문안로 16",
  phone: "02-2080-6480",
  businessHours: "09:00 - 18:00",
  businessNumber: "000-00-00000",
  email: "support@nh-auction.co.kr",
};

interface MainFooterProps {
  /** 좌우 폭 제한 없이 화면 끝까지 · 헤더와 같은 값을 줘야 좌우 끝이 맞는다 */
  fluid?: boolean;
}

export function MainFooter({ fluid = false }: MainFooterProps) {
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
    {
      label: "매참인 신청 문의",
      href: `mailto:${email}?subject=${encodeURIComponent("[매참인 신청 문의]")}`,
    },
    {
      label: "부분육 상장 문의",
      href: `mailto:${email}?subject=${encodeURIComponent("[부분육 상장 문의]")}`,
    },
  ];

  return (
    <footer className="border-t border-line bg-surface">
      <div
        className={cn(
          "mx-auto px-8",
          !fluid && "max-w-[1360px] min-[1700px]:max-w-[1600px]",
        )}
      >
        <nav className="py-3">
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {topLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={
                    link.strong
                      ? "text-[13px] font-bold text-content transition-colors hover:text-content-mid"
                      : "text-[13px] font-medium text-content-mid transition-colors hover:text-content"
                  }
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-line py-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-10">
            <div className="flex shrink-0 items-center gap-3">
              <div className="relative h-6 w-6 shrink-0">
                <Image
                  src={LOGO_SRC}
                  alt="농협부분육경매 로고"
                  fill
                  sizes="24px"
                  className="object-contain grayscale"
                  unoptimized
                />
              </div>
              <div className="h-7 w-px bg-slate-300" aria-hidden />
              <div className="flex flex-col gap-0.5">
                <Wordmark height={15} className="text-content" />
                <span className="text-[10.5px] font-semibold leading-none text-content-soft">
                  <span>NH</span>
                  <span className="mx-1.5 text-content-ghost">·</span>
                  Online Auction
                </span>
              </div>
            </div>

            <div className="min-w-0 flex-1 text-[12px] leading-[1.9] text-content-soft">
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
                      <span className="ml-1.5 text-content-faint">({hours})</span>
                    </>
                  }
                />
                <FooterDivider />
                <InfoItem
                  label="이메일"
                  value={
                    <a
                      href={`mailto:${email}`}
                      className="transition-colors hover:text-content"
                    >
                      {email}
                    </a>
                  }
                />
              </div>

              <p className="mt-4 text-[11.5px] text-content-faint">
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
      <span className="text-content-faint">{label} : </span>
      <span className={valueClassName ? `text-content-mid ${valueClassName}` : "text-content-mid"}>
        {value}
      </span>
    </span>
  );
}

function FooterDivider() {
  return (
    <span className="hidden text-content-ghost md:inline" aria-hidden>
      |
    </span>
  );
}
