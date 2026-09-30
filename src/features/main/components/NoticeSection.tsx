"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ChevronRight } from "lucide-react";
import { fetchNotices, type NoticeItem } from "@/features/main/api";

function formatDate(iso: string) {
  try {
    return format(parseISO(iso), "yyyy.MM.dd");
  } catch {
    return iso;
  }
}

export function NoticeSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["main", "notices"],
    queryFn: () => fetchNotices(7),
    staleTime: 60_000,
  });

  const notices: NoticeItem[] = data ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="mb-8 flex items-end justify-between gap-4">
        <h2 className="text-2xl font-bold text-content">공지사항</h2>
        <Link
          href="/notice"
          className="group inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-content-mid transition-colors hover:border-line hover:bg-surface-muted hover:text-content"
        >
          전체 보기
          <ChevronRight
            className="h-3.5 w-3.5 text-content-faint transition-all group-hover:translate-x-0.5 group-hover:text-content-mid"
            aria-hidden
          />
        </Link>
      </div>

      <div className="border-b border-line" aria-hidden />

      <div className="flex-1">
        {isLoading ? (
          <div className="flex h-full min-h-[320px] items-center justify-center text-sm text-content-faint">
            불러오는 중...
          </div>
        ) : notices.length === 0 ? (
          <div className="flex h-full min-h-[320px] items-center justify-center text-sm text-content-faint">
            등록된 공지사항이 없습니다.
          </div>
        ) : (
          <ul>
            {notices.map((notice) => (
              <li
                key={notice.id}
                className="border-b border-slate-50 transition-colors hover:bg-slate-50/70"
              >
                <Link
                  href={`/notice/${notice.id}`}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium text-content">
                      {notice.title}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs text-content-faint tabular-nums">
                    {formatDate(notice.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
