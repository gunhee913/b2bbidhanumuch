'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { ChevronDown, LogOut, Package, ShoppingCart, UserRound } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { GB_BRAND_NAME, GB_CONTAINER_CLASS, GB_LOGO_SRC, GB_MYPAGE_PATH, GB_NAV_ITEMS } from '../constants/ui';
import { useCartCount, useHydrateKgCart } from '../lib/cartStore';

/**
 * 소비자용 헤더 · 경매장 `MainHeader` 와 분리.
 * 경매·중도매인 용어가 한 자도 보이지 않아야 한다.
 */
export function GroupBuyHeader() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isConsumer = session?.user?.userType === 'consumer_user';

  return (
    <header className="sticky top-0 z-40 border-b border-line-soft bg-surface">
      <div className={cn(GB_CONTAINER_CLASS, 'flex h-[84px] items-center justify-between gap-8')}>
        <div className="flex items-center gap-8 xl:gap-14">
          <Link href="/group-buy" className="flex shrink-0 items-center gap-2">
            <span className="relative h-6 w-6 shrink-0">
              <Image src={GB_LOGO_SRC} alt="" fill sizes="24px" className="object-contain" priority unoptimized />
            </span>
            <span className="whitespace-nowrap text-[24px] font-bold leading-none tracking-[-0.03em] text-content">{GB_BRAND_NAME}</span>
          </Link>

          {/* 헤이딜러 상단 메뉴 · 16px 굵게 · 평소엔 흐리게, 올리면 진해진다 */}
          <nav aria-label="주요 메뉴">
            <ul className="flex items-center gap-8 xl:gap-14">
              {GB_NAV_ITEMS.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'inline-flex h-[84px] items-center whitespace-nowrap text-[18px] font-bold tracking-[-0.01em] transition-colors duration-200',
                        active ? 'text-content' : 'text-content/50 hover:text-content',
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <CartButton active={pathname === '/group-buy/cart'} />
          {status === 'loading' ? (
            <div className="h-9 w-24 animate-pulse rounded-md bg-surface-accent" aria-hidden />
          ) : isConsumer ? (
            <AccountMenu name={session?.user?.name ?? '회원'} />
          ) : (
            <>
              <Link
                href={`/group-buy/login?callbackUrl=${encodeURIComponent(pathname)}`}
                className="inline-flex h-11 items-center rounded-lg px-4 text-[16px] font-bold text-content/60 transition-colors duration-200 hover:bg-surface-accent hover:text-content"
              >
                로그인
              </Link>
              <Link
                href="/group-buy/signup"
                className="inline-flex h-11 items-center rounded-lg bg-ink px-5 text-[16px] font-bold text-white transition-colors duration-200 hover:bg-ink-hover"
              >
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/** 상단 장바구니 아이콘 · 담긴 부위 수를 배지로 보여준다 */
function CartButton({ active }: { active: boolean }) {
  useHydrateKgCart();
  const count = useCartCount();
  return (
    <Link
      href="/group-buy/cart"
      aria-label={count > 0 ? `장바구니 · ${count}개 부위` : '장바구니'}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative mr-2 inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors duration-200 hover:bg-surface-accent',
        active ? 'text-content' : 'text-content/60 hover:text-content',
      )}
    >
      <ShoppingCart className="h-[22px] w-[22px]" strokeWidth={2.2} />
      {count > 0 ? (
        <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-meat-600 px-1 text-[11px] font-bold leading-none text-white">
          {count > 9 ? '9+' : count}
        </span>
      ) : null}
    </Link>
  );
}

function AccountMenu({ name }: { name: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-11 items-center gap-1.5 rounded-lg px-4 text-[16px] font-bold text-content transition-colors duration-200 hover:bg-surface-accent data-[state=open]:bg-surface-accent"
        >
          {name}
          <span className="text-[12px] font-medium text-content-faint">님</span>
          <ChevronDown className="h-3.5 w-3.5 text-content-faint" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[200px] overflow-hidden rounded-xl border-0 bg-surface p-0 shadow-xl ring-1 ring-line">
        <ul className="py-1 text-[14px]">
          <li>
            <Link href={GB_MYPAGE_PATH} className="flex items-center gap-2 px-4 py-2.5 text-content-mid hover:bg-surface-muted">
              <UserRound className="h-4 w-4" />
              마이페이지
            </Link>
          </li>
          <li>
            <Link href={`${GB_MYPAGE_PATH}/orders`} className="flex items-center gap-2 px-4 py-2.5 text-content-mid hover:bg-surface-muted">
              <Package className="h-4 w-4" />
              주문내역
            </Link>
          </li>
          <li>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/group-buy' })}
              className="flex w-full items-center gap-2 border-t border-line-soft px-4 py-2.5 text-left text-content-mid hover:bg-surface-muted"
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </button>
          </li>
        </ul>
      </PopoverContent>
    </Popover>
  );
}
