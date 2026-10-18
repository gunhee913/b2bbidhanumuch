'use client';

import Link from 'next/link';
import { GroupBuyShell } from '@/features/group-buy/components/GroupBuyShell';
import { FlowGuide } from '@/features/group-buy/components/FlowGuide';

const FAQ: { q: string; a: string }[] = [
  {
    q: '왜 소매가보다 저렴한가요?',
    a: '공판장에 상장된 부위를 통째로 확보해 여러 분이 나누기 때문입니다. 중간 유통 단계를 줄이고, 부위 하나를 구좌로 나누어 각자 필요한 만큼만 부담합니다.',
  },
  {
    q: '구좌 번호는 무슨 뜻인가요?',
    a: '등심·안심·채끝처럼 긴 부위는 위치에 따라 결이 조금씩 다릅니다. 등심은 상단·중상단·중하단·하단, 안심·채끝·부채는 좌우 각각 상단·하단으로 나누어 소분해 포장합니다. 위치 차이가 크지 않은 부위는 수량만 고릅니다.',
  },
  {
    q: '다른 위치가 안 팔리면 제 주문은 어떻게 되나요?',
    a: '여러 위치 중 한 곳만 주문돼도 모집 마감 후 그대로 진행됩니다. 남은 위치는 저희 식육식당(매장)에서 판매하므로 주문하신 분이 기다리거나 취소되는 일은 없어요.',
  },
  {
    q: '모집은 찼는데 물량 확보가 안 될 수도 있나요?',
    a: '드물게 공판장 사정으로 물량을 확보하지 못하는 경우가 있습니다. 이때도 전액 자동 환불되며, 참여 내역에서 바로 확인하실 수 있습니다.',
  },
  {
    q: '취소는 언제까지 되나요?',
    a: '모집 마감 전에는 참여 내역에서 언제든 취소할 수 있고 즉시 환불됩니다. 모집이 마감된 뒤에는 소분 작업이 시작되어 취소가 어렵습니다.',
  },
  {
    q: '선물세트는 어떻게 만들나요?',
    a: '선물세트에서 2구 · 3구 · 4구 · 6구를 고른 뒤, 칸마다 벌크구매 부위를 담습니다. 칸은 500g씩 포장되고, 구좌에서 쓰고 남은 양은 집 또는 매장으로 받으실 수 있어요. 세트는 한 주소로 일괄 보내거나 세트마다 다른 분에게 보낼 수 있습니다.',
  },
  {
    q: '매장에서 받으려면 어떻게 하나요?',
    a: '매장이용에서 매장과 방문 시간을 고른 뒤, 그 시간에 맞춰 벌크나 1kg를 주문할 수 있어요. 벌크구매·1kg 구매 주문서에서 "매장에서 받기"를 골라도 같은 예약이 됩니다. 예약은 주문일 3일 뒤부터 2주 안에서 고를 수 있고, 픽업 전날까지 내 주문에서 시간을 바꿀 수 있어요.',
  },
  {
    q: '언제 받아볼 수 있나요?',
    a: '보통 모집 마감 후 2~3일 안에 냉장 택배로 받아보실 수 있습니다. 소분·포장이 끝나면 배송 단계로 바뀌고 참여 내역에 표시됩니다.',
  },
];

export default function GroupBuyGuidePage() {
  return (
    <GroupBuyShell>
      <div className="max-w-[680px]">
        <h1 className="text-[30px] font-bold tracking-[-0.03em] text-content">이용안내</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-content-soft">
          부분육 공동구매는 공판장에 올라온 한우 한 마리의 부위를 여럿이 나누어 사는 방식입니다. 이력번호가 있는 실제 개체를 보고
          고르고, 모집이 끝나면 소분해서 집으로 보내드립니다.
        </p>
      </div>

      <div className="mt-12">
        <FlowGuide />
      </div>

      <section className="mt-16 max-w-[800px]">
        <h2 className="text-[20px] font-bold tracking-[-0.02em] text-content">자주 묻는 질문</h2>
        <dl className="mt-6 divide-y divide-line-soft border-y border-line-soft">
          {FAQ.map((item) => (
            <div key={item.q} className="py-5">
              <dt className="text-[15px] font-bold text-content">{item.q}</dt>
              <dd className="mt-2 text-[14px] leading-relaxed text-content-mid">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-12">
        <Link href="/group-buy" className="inline-flex h-11 items-center rounded-lg bg-ink px-5 text-[14.5px] font-bold text-white hover:bg-ink-hover">
          모집 중인 부위 보기
        </Link>
      </div>
    </GroupBuyShell>
  );
}
