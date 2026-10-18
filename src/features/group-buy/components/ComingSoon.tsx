'use client';

import Link from 'next/link';
import { GroupBuyShell } from './GroupBuyShell';

/** 메뉴는 열렸지만 아직 화면이 없는 섹션의 임시 페이지 */
export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <GroupBuyShell>
      <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
        <h1 className="text-[28px] font-bold tracking-[-0.03em] text-content">{title}</h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-content-soft">{description}</p>
        <Link href="/group-buy" className="mt-8 inline-flex h-11 items-center rounded-lg bg-ink px-5 text-[15px] font-bold text-white transition-colors hover:bg-ink-hover">
          홈으로
        </Link>
      </div>
    </GroupBuyShell>
  );
}
