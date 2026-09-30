"use client";

import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { fetchNotices, type NoticeItem } from "@/features/main/api";

export function HeroSection() {
  return (
    <>
      <section
        id="hero"
        className="relative w-full overflow-hidden border-b border-line bg-gradient-to-br from-slate-50 via-white to-sky-50"
      >
        <div
          className="pointer-events-none absolute -right-24 top-1/2 h-[520px] w-[520px] -translate-y-1/2 rounded-full bg-sky-100/60 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-slate-200/50 blur-3xl"
          aria-hidden
        />

        <div className="relative h-[560px]" />

        <HeroNoticeStrip />
      </section>

      <FloatingPromotionCard />
    </>
  );
}

function HeroNoticeStrip() {
  const { data: notices = [], isLoading } = useQuery({
    queryKey: ["main", "hero-notices"],
    queryFn: () => fetchNotices(1),
    staleTime: 60_000,
  });

  return (
    <div className="relative">
      <div className="mx-auto max-w-[1360px] min-[1700px]:max-w-[1600px] px-8">
        <div className="relative grid grid-cols-2">
          <span
            className="pointer-events-none absolute left-1/2 top-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-slate-300"
            aria-hidden
          />
          <div className="pr-8">
            <NoticeRow
              label="공지사항"
              notice={notices[0]}
              isLoading={isLoading}
            />
          </div>
          <div className="pl-8">
            <NoticeRow label="보도자료" placeholder="준비 중입니다" />
          </div>
        </div>
      </div>
    </div>
  );
}

function NoticeRow({
  label,
  notice,
  isLoading,
  placeholder,
}: {
  label: string;
  notice?: NoticeItem;
  isLoading?: boolean;
  placeholder?: string;
}) {
  if (placeholder) {
    return (
      <div className="flex items-center gap-4 py-4 text-[14px]">
        <span className="w-16 shrink-0 font-semibold text-content-soft">
          {label}
        </span>
        <span className="flex-1 text-content-faint">{placeholder}</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-4 py-4 text-[14px]">
        <span className="w-16 shrink-0 font-semibold text-content-soft">
          {label}
        </span>
        <span className="flex-1 text-content-faint">불러오는 중...</span>
      </div>
    );
  }

  if (!notice) {
    return (
      <div className="flex items-center gap-4 py-4 text-[14px]">
        <span className="w-16 shrink-0 font-semibold text-content-soft">
          {label}
        </span>
        <span className="flex-1 text-content-faint">
          등록된 공지사항이 없습니다.
        </span>
      </div>
    );
  }

  const date = formatDate(notice.createdAt);

  return (
    <Link
      href={`/notice/${notice.id}`}
      className="group flex items-center gap-4 py-4 text-[14px]"
    >
      <span className="w-16 shrink-0 font-semibold text-content-soft">
        {label}
      </span>
      {notice.isPinned && (
        <span className="inline-flex shrink-0 items-center rounded bg-surface-accent px-1.5 py-0.5 text-[11px] font-semibold text-content-mid">
          중요
        </span>
      )}
      <span className="flex-1 truncate text-content transition-colors group-hover:text-sky-700">
        {notice.title}
      </span>
      <span className="shrink-0 text-content-soft">{date}</span>
    </Link>
  );
}

function formatDate(iso: string) {
  try {
    return format(parseISO(iso), "yyyy.MM.dd");
  } catch {
    return iso;
  }
}

function FloatingPromotionCard() {
  return (
    <div className="fixed right-4 top-28 z-30">
      <div className="relative w-[200px] rounded-2xl bg-surface p-5 shadow-xl shadow-slate-300/40 ring-1 ring-line-soft">
        <div className="text-center">
          <h3 className="text-[15px] font-bold leading-[1.35] text-content">
            매참인 모집
            <br />
            지금 신청하세요
          </h3>
        </div>

        <div className="mt-4 flex h-[96px] items-center justify-center">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-sky-700 shadow-lg shadow-sky-200/60">
            <BadgeCheck className="h-10 w-10 text-white" strokeWidth={2} />
          </div>
        </div>

        <div className="my-4 h-px w-full bg-surface-strong" />

        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-content-soft">
            문의전화
          </span>
          <span className="text-[13px] font-bold tracking-tight text-content">
            031-123-4567
          </span>
        </div>
      </div>
    </div>
  );
}
