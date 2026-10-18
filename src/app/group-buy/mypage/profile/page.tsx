'use client';

import { signOut, useSession } from 'next-auth/react';
import { Skeleton } from '@/features/group-buy/components/primitives';
import { formatDateTime } from '@/features/group-buy/lib/format';

/** 회원정보 · 세션에 실린 소비자 정보를 보여준다. 수정은 추후 */
export default function GroupBuyProfilePage() {
  const { data: session, status } = useSession();
  const consumer = session?.consumer;

  const rows = [
    { label: '이름', value: consumer?.name },
    { label: '휴대폰 번호', value: consumer?.phone },
    { label: '이메일', value: consumer?.email },
    {
      label: '기본 배송지',
      value: consumer?.address ? `(${consumer.zipcode ?? '-'}) ${consumer.address} ${consumer.addressDetail ?? ''}`.trim() : null,
    },
    { label: '가입일', value: consumer?.createdAt ? formatDateTime(consumer.createdAt) : null },
  ];

  return (
    <div>
      <h2 className="text-[22px] font-bold tracking-[-0.02em] text-content">회원정보</h2>
      <p className="mt-1 text-[13.5px] text-content-soft">주문서에서 입력한 배송지는 주문별로 따로 저장됩니다.</p>

      <section className="mt-6 rounded-sm border border-line-soft bg-surface">
        {status === 'loading' ? (
          <div className="space-y-3 p-7">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-6" />
            ))}
          </div>
        ) : (
          <dl className="divide-y divide-line-soft">
            {rows.map((r) => (
              <div key={r.label} className="grid grid-cols-[160px_minmax(0,1fr)] items-center px-7 py-4 text-[14px]">
                <dt className="text-content-soft">{r.label}</dt>
                <dd className={r.value ? 'text-content' : 'text-content-ghost'}>{r.value || '-'}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/group-buy' })}
          className="inline-flex h-10 items-center rounded-sm border border-line bg-surface px-4 text-[13.5px] font-semibold text-content-mid hover:bg-surface-muted"
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}
