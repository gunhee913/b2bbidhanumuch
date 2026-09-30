"use client";

import Image from "next/image";
import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { cn } from "@/lib/utils";

/** 농협 심볼 · 브랜드 워드마크와 공판장 카드 앞에 같이 쓴다 */
export const NH_LOGO_SRC = "/cyber_symbol%203.gif";

/** 로고 + 워드마크 · 진입 화면 상단 브랜드 표기 */
export function EntryBrand({ className }: { className?: string }) {
  return (
    <Link href="/main" className={cn("flex items-center gap-2.5", className)}>
      <span className="relative h-[18px] w-[18px] shrink-0">
        <Image
          src={NH_LOGO_SRC}
          alt=""
          fill
          sizes="18px"
          className="object-contain"
          priority
          unoptimized
        />
      </span>
      <Wordmark height={13} className="text-slate-900" />
    </Link>
  );
}
