'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { GB_BRAND_NAME, GB_CONTAINER_CLASS } from '../constants/ui';
import { GroupBuyHeader } from './GroupBuyHeader';

/**
 * 소비자 페이지 공통 틀 · 헤더 + 본문 + 푸터 · PC 1440px · 라이트 고정.
 * `fluid` 면 본문 컨테이너를 씌우지 않는다 — 홈처럼 꽉 찬 배너를 직접 그리는 페이지용.
 */
export function GroupBuyShell({ children, className, fluid = false }: { children: React.ReactNode; className?: string; fluid?: boolean }) {
  useForceLightTheme();
  return (
    <div className="flex min-h-screen min-w-[1024px] flex-col bg-surface text-content">
      <GroupBuyHeader />
      <main className={cn('flex-1 pb-24', fluid ? '' : cn(GB_CONTAINER_CLASS, 'pt-10'), className)}>{children}</main>
      <GroupBuyFooter />
    </div>
  );
}

/** 관리자 화면과 같은 방식 · 들어올 때 라이트, 나갈 때 원래 테마로 */
function useForceLightTheme() {
  const { theme, setTheme } = useTheme();
  const previousRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (previousRef.current === undefined && theme) previousRef.current = theme;
    setTheme('light');
    return () => {
      if (previousRef.current && previousRef.current !== 'light') setTheme(previousRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

function GroupBuyFooter() {
  return (
    <footer className="border-t border-line-soft bg-surface">
      <div className={cn(GB_CONTAINER_CLASS, 'flex items-start justify-between py-10 text-[12.5px] text-content-faint')}>
        <div className="space-y-1.5">
          <p className="text-[13px] font-bold text-content-mid">{GB_BRAND_NAME} 부분육 공동구매</p>
          <p>농협경제지주 축산기획부 · 한우 부분육을 구좌 단위로 나누어 판매합니다.</p>
          <p>모집이 마감되면 소분 가공 후 냉장 배송하거나 식육식당에서 받아 드실 수 있습니다. 물량을 확보하지 못하면 전액 자동 환불됩니다.</p>
        </div>
        <nav className="flex gap-5">
          <Link href="/group-buy/guide" className="hover:text-content">이용안내</Link>
          <Link href="/terms" className="hover:text-content">이용약관</Link>
          <Link href="/privacy" className="hover:text-content">개인정보처리방침</Link>
        </nav>
      </div>
    </footer>
  );
}
