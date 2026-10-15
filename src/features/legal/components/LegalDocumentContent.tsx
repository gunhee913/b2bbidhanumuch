"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  CANVAS_BG_CLASS,
  PAGE_GUTTER_CLASS,
  SURFACE_SHELL_CLASS,
} from "@/features/live-auction/constants/surface";
import { MainHeader } from "@/features/main/components/MainHeader";
import { DocumentBody } from "@/components/DocumentBody";
import { SiteFooter } from "@/components/SiteFooter";
import {
  LEGAL_DOCUMENT_KEYS,
  LEGAL_DOCUMENTS,
  legalDocumentHref,
  type LegalDocumentKey,
} from "../constants/documents";

interface SiteContent {
  id: string;
  title: string;
  content: string;
  updatedAt: string | null;
}

/**
 * 약관 · 개인정보처리방침 PC 판 (`/legal/<doc>`).
 *
 * 읽는 글이라 폭을 860px 로 좁힌다. 1360 을 다 쓰면 한 줄이 백 자를 넘어 눈이 줄을
 * 잃는다. 머리는 다른 PC 화면과 같은 `MainHeader fluid` 라 로그인 전(`/main` 바닥
 * 링크)에도, 로그인 뒤(마이페이지 바닥 링크)에도 같은 자리에 선다.
 *
 * 글은 모바일 `/terms` `/privacy` 와 같은 `/api/site-contents/<doc>`.
 */
export function LegalDocumentContent({ doc }: { doc: LegalDocumentKey }) {
  const { data, isLoading, isError } = useQuery<SiteContent>({
    /* 모바일 약관 화면과 같은 열쇠 */
    queryKey: ["site-content", doc],
    queryFn: async () => {
      const res = await fetch(`/api/site-contents/${doc}`);
      if (!res.ok) throw new Error("문서를 불러오지 못했습니다.");
      return res.json();
    },
    staleTime: 60 * 60_000,
  });
  const title = LEGAL_DOCUMENTS[doc].title;

  return (
    <Shell>
      <nav
        aria-label="문서 고르기"
        className="flex items-center gap-1 text-[13px]"
      >
        {LEGAL_DOCUMENT_KEYS.map((key) => {
          const active = key === doc;
          return (
            <Link
              key={key}
              href={legalDocumentHref(key)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 font-semibold transition-colors",
                active
                  ? "bg-surface-accent text-content"
                  : "text-content-mid hover:bg-surface-muted hover:text-content",
              )}
            >
              {LEGAL_DOCUMENTS[key].title}
            </Link>
          );
        })}
      </nav>

      <article className={cn("px-8 py-7", SURFACE_SHELL_CLASS)}>
        <header className="border-b border-line-soft pb-4">
          <h1 className="text-[20px] font-bold text-content">{title}</h1>
          {data?.updatedAt ? (
            <p className="mt-1.5 text-[12px] tabular-nums text-content-faint">
              최종 수정 {format(parseISO(data.updatedAt), "yyyy년 M월 d일")}
            </p>
          ) : null}
        </header>

        {isLoading ? (
          <div className="mt-5 h-64 animate-pulse bg-surface-accent" />
        ) : isError || !data?.content ? (
          <p className="py-16 text-center text-[13px] text-content-faint">
            등록된 {title}이 없습니다
          </p>
        ) : (
          <DocumentBody content={data.content} className="mt-5" />
        )}
      </article>

      <SiteFooter />
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className={cn("min-h-screen", CANVAS_BG_CLASS)}>
      <MainHeader fluid />
      <main
        className={cn(
          "mx-auto flex max-w-[860px] flex-col gap-3",
          PAGE_GUTTER_CLASS,
        )}
      >
        {children}
      </main>
    </div>
  );
}
