"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  LEGAL_DOCUMENT_KEYS,
  LEGAL_DOCUMENTS,
  legalDocumentHref,
} from "@/features/legal/constants/documents";

interface CompanyInfo {
  name: string;
  representative: string;
  phone: string;
  fax: string;
  businessNumber: string;
  ecommerceNumber: string;
  address: string;
}

const FALLBACK_INFO: CompanyInfo = {
  name: "농협 중부미트센터",
  representative: "",
  phone: "",
  fax: "",
  businessNumber: "",
  ecommerceNumber: "",
  address: "",
};

/**
 * PC 바닥글 · 약관 링크 + 사업자 정보(`/api/company-info` · 모바일 `/profile` 바닥과 같은 자료).
 *
 * 펼침 없이 한 줄로 늘어놓는다. 가로가 넉넉해 접을 까닭이 없고, 법이 적으라는
 * 것(상호·대표·사업자번호·통신판매번호·주소·전화)은 보이게 두는 편이 맞다.
 */
export function SiteFooter() {
  const { data } = useQuery<CompanyInfo>({
    queryKey: ["company-info"],
    queryFn: async () => {
      const res = await fetch("/api/company-info");
      if (!res.ok) return FALLBACK_INFO;
      return res.json();
    },
    staleTime: 60 * 60_000,
  });
  const info = data ?? FALLBACK_INFO;
  const year = new Date().getFullYear();

  const rows = [
    ["상호", info.name],
    ["대표", info.representative],
    ["사업자등록번호", info.businessNumber],
    ["통신판매번호", info.ecommerceNumber],
    ["주소", info.address],
    ["전화", info.phone],
    ["팩스", info.fax],
  ].filter(([, value]) => value);

  return (
    <footer className="border-t border-line-soft px-1 pb-10 pt-5 text-[11.5px] text-content-faint">
      <nav aria-label="약관" className="flex items-center gap-4">
        {LEGAL_DOCUMENT_KEYS.map((key) => (
          <Link
            key={key}
            href={legalDocumentHref(key)}
            className="font-semibold text-content-mid transition-colors hover:text-content"
          >
            {LEGAL_DOCUMENTS[key].title}
          </Link>
        ))}
      </nav>
      <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-1.5">
            <dt className="text-content-ghost">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-content-ghost">
        © {year} (주)농협경제지주. All rights reserved.
      </p>
    </footer>
  );
}
