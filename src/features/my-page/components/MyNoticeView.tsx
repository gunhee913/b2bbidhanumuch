"use client";

import { differenceInDays, format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { DocumentBody } from "@/components/DocumentBody";
import { useDealerNotices, useNoticeDetail } from "../hooks/useMyPageData";
import { MyPanel, MyPanelEmpty, PANEL_ACTION_CLASS } from "./MyPageParts";

const NOTICE_LIST_LIMIT = 100;
/** 「새 글」 표시 기간 · 모바일 `/notice` 와 같은 3일 */
const NEW_NOTICE_DAYS = 3;

/**
 * 공지사항 · 목록과 상세가 같은 자리에서 바뀐다(`?view=notice&notice=<id>`).
 *
 * 모바일 `/notice` `/notice/[id]` 와 같은 자료(`/api/notices`)를 PC 폭에 맞춰 낸다.
 * 상세는 새 길로 가지 않고 같은 카드 안에서 열린다 — 왼쪽 메뉴와 계정 카드가 그대로
 * 있어야 「마이페이지 안에서 읽고 있다」 는 감이 끊기지 않고, 뒤로 가기가 목록으로 온다.
 */
export function MyNoticeView({
  noticeId,
  onOpen,
}: {
  noticeId: string | null;
  onOpen: (id: string | null) => void;
}) {
  if (noticeId) {
    return <NoticeDetail id={noticeId} onBack={() => onOpen(null)} />;
  }
  return <NoticeList onOpen={onOpen} />;
}

function NoticeList({ onOpen }: { onOpen: (id: string) => void }) {
  const { data: notices = [], isLoading } = useDealerNotices(NOTICE_LIST_LIMIT);
  const now = new Date();

  return (
    <MyPanel title="공지사항" description="고정 공지가 먼저, 그다음 최신순">
      {isLoading ? (
        <div className="m-4 h-48 animate-pulse bg-surface-accent" />
      ) : notices.length === 0 ? (
        <MyPanelEmpty text="등록된 공지가 없습니다" />
      ) : (
        <ul className="divide-y divide-line-soft">
          {notices.map((notice) => {
            const createdAt = parseISO(notice.createdAt);
            const isNew = differenceInDays(now, createdAt) < NEW_NOTICE_DAYS;
            return (
              <li key={notice.id}>
                <button
                  type="button"
                  onClick={() => onOpen(notice.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-muted"
                >
                  {notice.isPinned ? (
                    <span className="shrink-0 rounded bg-inverse px-1.5 py-0.5 text-[10.5px] font-bold text-inverse-content">
                      필독
                    </span>
                  ) : null}
                  {notice.category ? (
                    <span className="shrink-0 text-[11.5px] font-semibold text-content-faint">
                      {notice.category}
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-[13.5px] text-content",
                      notice.isPinned && "font-semibold",
                    )}
                  >
                    {notice.title}
                    {isNew ? (
                      <span className="ml-1.5 align-middle text-[10.5px] font-bold text-lost">
                        N
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-[12px] tabular-nums text-content-faint">
                    {format(createdAt, "yyyy.M.d (EEE)", { locale: ko })}
                  </span>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-content-ghost"
                    aria-hidden
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </MyPanel>
  );
}

function NoticeDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { data: notice, isLoading, isError } = useNoticeDetail(id);

  return (
    <MyPanel
      title="공지사항"
      action={
        <button type="button" className={PANEL_ACTION_CLASS} onClick={onBack}>
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          목록
        </button>
      }
      bodyClassName="px-6 py-5"
    >
      {isLoading ? (
        <div className="h-48 animate-pulse bg-surface-accent" />
      ) : isError || !notice ? (
        <MyPanelEmpty text="공지사항을 찾을 수 없습니다" />
      ) : (
        <article>
          <header className="border-b border-line-soft pb-4">
            <div className="flex items-center gap-2">
              {notice.isPinned ? (
                <span className="rounded bg-inverse px-1.5 py-0.5 text-[10.5px] font-bold text-inverse-content">
                  필독
                </span>
              ) : null}
              {notice.category ? (
                <span className="text-[11.5px] font-semibold text-content-faint">
                  {notice.category}
                </span>
              ) : null}
            </div>
            <h3 className="mt-1.5 text-[18px] font-bold leading-snug text-content">
              {notice.title}
            </h3>
            <p className="mt-1.5 text-[12px] tabular-nums text-content-faint">
              {format(
                parseISO(notice.createdAt),
                "yyyy년 M월 d일 (EEE) HH:mm",
                {
                  locale: ko,
                },
              )}
            </p>
          </header>
          <DocumentBody content={notice.content} className="mt-5" />
        </article>
      )}
    </MyPanel>
  );
}
