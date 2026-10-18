'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Car, ChevronLeft, Clock, ExternalLink, MapPin, Phone, Store as StoreIcon, TrainFront } from 'lucide-react';
import { toast } from 'sonner';
import { SmartImage } from '@/components/ui/smart-image';
import { GroupBuyShell } from '@/features/group-buy/components/GroupBuyShell';
import { EmptyState, Skeleton } from '@/features/group-buy/components/primitives';
import { kakaoDirectionsUrl, StoreMap } from '@/features/group-buy/components/stores/StoreMap';
import { useStore } from '@/features/group-buy/hooks';
import { useKgCart } from '@/features/group-buy/lib/cartStore';
import { PICKUP_LEAD_DAYS, PICKUP_WINDOW_DAYS, storeHoursLabel, weekdayLabel } from '@/features/group-buy/lib/stores';

const FALLBACK_IMAGE = 'https://picsum.photos/seed/hanwoo-store/1200/600';

/** 매장 상세 · 사진 · 위치 · 영업시간 · 오시는 길 · "이 매장에서 받기" */
export default function GroupBuyStoreDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data: store, isLoading } = useStore(slug);
  const setPreferredStore = useKgCart((s) => s.setPreferredStore);
  const router = useRouter();

  const choose = () => {
    if (!store) return;
    setPreferredStore(store.id);
    toast.success(`${store.name}을(를) 받을 매장으로 기억해 둘게요. 주문서에서 시간만 고르면 돼요.`);
    router.push('/group-buy/products');
  };

  return (
    <GroupBuyShell>
      <Link href="/group-buy/stores" className="inline-flex items-center gap-1 text-[13px] font-medium text-content-faint hover:text-content-mid">
        <ChevronLeft className="h-4 w-4" />
        매장안내
      </Link>

      {isLoading ? (
        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <Skeleton className="h-[360px] rounded-sm" />
          <Skeleton className="h-[360px] rounded-sm" />
        </div>
      ) : !store ? (
        <div className="mt-8">
          <EmptyState title="매장을 찾을 수 없어요" action={<Link href="/group-buy/stores" className="text-[14px] font-semibold underline">매장안내로</Link>} />
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-[30px] font-bold leading-[1.2] tracking-[-0.03em] text-content">{store.name}</h1>
              <p className="mt-1 flex items-center gap-1 text-[13.5px] text-content-soft">
                <MapPin className="h-3.5 w-3.5" />
                {store.address} {store.addressDetail}
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <a
                href={kakaoDirectionsUrl(store)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center gap-1.5 rounded-sm border border-line bg-surface px-4 text-[14px] font-semibold text-content hover:bg-surface-accent"
              >
                카카오맵 길찾기
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <button type="button" onClick={choose} className="inline-flex h-11 items-center gap-1.5 rounded-sm bg-ink px-5 text-[14px] font-bold text-white hover:bg-ink-hover">
                <StoreIcon className="h-4 w-4" />
                이 매장에서 받기
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
            <div className="space-y-6">
              <div className="relative aspect-[2/1] overflow-hidden rounded-sm bg-surface-accent">
                <SmartImage src={store.imageUrl ?? FALLBACK_IMAGE} alt={store.name} fill fallbackSrc={FALLBACK_IMAGE} className="object-cover" />
              </div>
              {store.description ? <p className="whitespace-pre-line text-[14.5px] leading-relaxed text-content-mid">{store.description}</p> : null}
              <StoreMap stores={[store]} selectedId={store.id} zoomLevel={4} className="h-[320px]" />
            </div>

            <aside className="space-y-4 lg:sticky lg:top-24">
              <section className="rounded-sm border border-line bg-surface p-5">
                <h2 className="text-[15px] font-bold text-content">매장 정보</h2>
                <dl className="mt-3 space-y-2.5 text-[13.5px]">
                  <InfoRow icon={Clock} label="영업시간" value={storeHoursLabel(store)} />
                  {store.phone ? <InfoRow icon={Phone} label="전화" value={store.phone} /> : null}
                  {store.directions ? <InfoRow icon={TrainFront} label="오시는 길" value={store.directions} /> : null}
                  {store.parking ? <InfoRow icon={Car} label="주차" value={store.parking} /> : null}
                </dl>
              </section>

              <section className="rounded-sm border border-line bg-surface p-5">
                <h2 className="text-[15px] font-bold text-content">매장 수령 안내</h2>
                <ul className="mt-3 space-y-1.5 text-[13px] leading-relaxed text-content-soft">
                  <li>· 주문일 {PICKUP_LEAD_DAYS}일 뒤부터 {PICKUP_WINDOW_DAYS}일 안에서 방문 시간을 예약합니다.</li>
                  <li>· 예약은 {store.slotMinutes}분 단위, 한 시간대에 {store.slotCapacity}팀까지 받습니다.</li>
                  {store.closedWeekdays.length > 0 ? <li>· {store.closedWeekdays.map(weekdayLabel).join('·')}요일은 휴무라 예약할 수 없습니다.</li> : null}
                  <li>· 픽업 전날까지 내 주문에서 시간을 바꿀 수 있어요.</li>
                  <li>· 매장에서 드실 때 상차림비는 별도 결제됩니다.</li>
                </ul>
              </section>
            </aside>
          </div>
        </>
      )}
    </GroupBuyShell>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="flex w-20 shrink-0 items-center gap-1.5 text-content-faint">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </dt>
      <dd className="min-w-0 leading-snug text-content">{value}</dd>
    </div>
  );
}
