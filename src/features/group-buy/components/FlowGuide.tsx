'use client';

import { PackageCheck, Scissors, Users } from 'lucide-react';

const STEPS = [
  {
    icon: Users,
    step: '01',
    title: '구좌를 고르고 참여',
    body: '마음에 드는 소의 부위에서 원하는 위치·수량만큼 구좌를 고릅니다. 모집 마감 전에는 언제든 취소할 수 있어요.',
  },
  {
    icon: Scissors,
    step: '02',
    title: '모집 완료 후 소분 가공',
    body: '모집이 마감되면 공판장에서 물량을 확보하고, 구좌 위치대로 정확히 나누어 진공 포장합니다.',
  },
  {
    icon: PackageCheck,
    step: '03',
    title: '집으로 배송 또는 매장에서 바로',
    body: '가공이 끝나면 냉장 택배로 개별 발송하거나, 식육식당으로 보내 자리에서 바로 구워 드실 수 있어요.',
  },
];

/** 3단계 안내 · 경매·응찰·낙찰 같은 말은 쓰지 않는다 */
export function FlowGuide() {
  return (
    <section aria-labelledby="flow-guide-title">
      <h2 id="flow-guide-title" className="text-[22px] font-bold tracking-[-0.03em] text-content">
        이렇게 진행돼요
      </h2>
      <p className="mt-1 text-[13.5px] text-content-soft">큰 덩어리를 여럿이 나누기 때문에 도매가에 가깝게 살 수 있습니다.</p>
      <ol className="mt-5 grid grid-cols-3 gap-4">
        {STEPS.map(({ icon: Icon, step, title, body }) => (
          <li key={title} className="rounded-xl border border-line-soft bg-surface p-6">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-accent text-content">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="text-[13px] font-bold tabular-nums text-content-ghost">{step}</span>
            </div>
            <h3 className="mt-5 text-[16px] font-bold tracking-[-0.01em] text-content">{title}</h3>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-content-soft">{body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
