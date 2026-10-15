"use client";

import { cn } from "@/lib/utils";

const HTML_TAG_PATTERN = /<[a-z][\s\S]*>/i;

/**
 * 관리자가 적은 긴 글(공지 본문 · 약관) · HTML 이면 그대로, 아니면 줄바꿈을 살려 보여 준다.
 *
 * 관리자 편집기가 시기에 따라 HTML 과 평문을 섞어 저장했다. 모바일 `/notice/[id]` 와
 * 같은 판별(태그가 하나라도 있으면 HTML)을 써서 두 화면이 같은 글을 같은 모양으로 낸다.
 */
export function DocumentBody({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const baseClass = cn(
    "text-[13.5px] leading-[1.75] text-content-mid [&_a]:underline [&_b]:text-content [&_h1]:text-[17px] [&_h1]:font-bold [&_h1]:text-content [&_h2]:text-[15px] [&_h2]:font-bold [&_h2]:text-content [&_h3]:text-[14px] [&_h3]:font-bold [&_h3]:text-content [&_li]:ml-5 [&_li]:list-disc [&_p]:my-2 [&_strong]:text-content",
    className,
  );

  if (HTML_TAG_PATTERN.test(content)) {
    return (
      <div
        className={baseClass}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return <div className={cn(baseClass, "whitespace-pre-wrap")}>{content}</div>;
}
