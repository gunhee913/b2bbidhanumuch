'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { GroupBuyShell } from '@/features/group-buy/components/GroupBuyShell';
import { GB_MYPAGE_ITEMS, GB_MYPAGE_PATH } from '@/features/group-buy/constants/ui';

/** 마이페이지 공통 틀 · 왼쪽 메뉴 + 오른쪽 내용. 로그인은 미들웨어가 보장한다 */
export default function GroupBuyMyPageLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const name = session?.user?.name ?? '회원';

  return (
    <GroupBuyShell>
      <div className="grid grid-cols-[200px_minmax(0,1fr)] gap-12">
        <aside>
          <Link href={GB_MYPAGE_PATH} className="block">
            <h1 className="text-[24px] font-bold tracking-[-0.02em] text-content">마이페이지</h1>
            <p className="mt-1 text-[13px] text-content-soft">{name}님</p>
          </Link>
          <nav aria-label="마이페이지 메뉴" className="mt-8">
            <ul className="space-y-1">
              {GB_MYPAGE_ITEMS.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex h-10 items-center rounded-sm px-3 text-[15px] transition-colors',
                        active ? 'bg-surface-accent font-bold text-content' : 'text-content-mid hover:bg-surface-muted hover:text-content',
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </GroupBuyShell>
  );
}
