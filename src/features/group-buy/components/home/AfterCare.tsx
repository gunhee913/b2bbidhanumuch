'use client';

import Link from 'next/link';
import { ChevronRight, MessageCircleQuestionMark, RefreshCcw, Truck, Undo2 } from 'lucide-react';

const ITEMS = [
  { icon: RefreshCcw, title: '물량 미확보 시 전액 환불', body: '공판장에서 물량을 확보하지 못하면 신청 없이 자동으로 환불돼요.' },
  { icon: Undo2, title: '마감 전 자유로운 취소', body: '참여 내역에서 바로 취소할 수 있고 즉시 환불됩니다.' },
  { icon: Truck, title: '택배 또는 매장 수령', body: '구좌 위치대로 나눠 진공 포장해 발송하거나, 식육식당에서 바로 구워 드세요.' },
];

/** 참여 후 보장 · 헤이딜러 "애프터케어" 블록 */
export function AfterCare() {
  return (
    <section className="grid grid-cols-[minmax(0,1fr)_380px] overflow-hidden rounded-2xl bg-ink text-white" aria-label="참여 후 보장">
      <div className="px-10 py-10">
        <p className="text-[13px] font-semibold text-white/55">참여한 뒤에도</p>
        <h2 className="mt-1.5 text-[26px] font-bold tracking-[-0.03em]">끝까지 농협미트센터가 책임져요</h2>
        <ul className="mt-8 grid grid-cols-3 gap-6">
          {ITEMS.map(({ icon: Icon, title, body }) => (
            <li key={title}>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <p className="mt-4 text-[15px] font-bold">{title}</p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/65">{body}</p>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col justify-between border-l border-white/10 bg-white/[0.04] px-9 py-10">
        <div>
          <MessageCircleQuestionMark className="h-7 w-7 text-gold-400" />
          <p className="mt-4 text-[18px] font-bold tracking-[-0.02em]">궁금한 점이 있나요?</p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-white/65">
            구좌 위치, 배송 일정, 환불 기준처럼 자주 묻는 질문을 모아뒀어요.
          </p>
        </div>
        <Link href="/group-buy/guide" className="mt-8 inline-flex h-11 items-center justify-center gap-1 rounded-lg bg-white text-[14px] font-bold text-ink transition-colors hover:bg-white/90">
          이용안내 · 자주 묻는 질문
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
