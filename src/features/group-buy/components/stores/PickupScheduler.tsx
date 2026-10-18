'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MapPin, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStores, useStoreSlots } from '../../hooks';
import { buildPickupDates, PICKUP_LEAD_DAYS, storeHoursLabel, type PickupDate } from '../../lib/stores';
import type { ConsumerStore, PickupInput } from '../../types';
import { Skeleton } from '../primitives';

export interface PickupSelection extends PickupInput {
  store: ConsumerStore;
}

interface PickupSchedulerProps {
  value: PickupSelection | null;
  onChange: (next: PickupSelection | null) => void;
  /** 매장 안내에서 넘어온 선호 매장 · 처음 열 때 고른다 */
  preferredStoreId?: string | null;
  /** 변경 화면에서 현재 잡혀 있는 시간 · 잔여 0 이어도 고를 수 있게 */
  currentPickupAt?: string | null;
  /** 변경 화면에서는 매장을 못 바꾸게 */
  lockStore?: boolean;
  disabled?: boolean;
  className?: string;
}

const CHIP = 'inline-flex h-9 shrink-0 items-center justify-center rounded-sm border px-3 text-[13px] font-semibold tabular-nums transition-colors';
const CHIP_ACTIVE = 'border-ink bg-ink text-white';
const CHIP_IDLE = 'border-line bg-surface text-content hover:bg-surface-accent';
const CHIP_OFF = 'cursor-not-allowed border-line-soft bg-surface-accent/50 text-content-ghost line-through';

/**
 * 매장 → 날짜 → 시간 순서로 고른다.
 * 날짜는 주문일 + 3일부터 2주, 시간은 매장 영업시간을 슬롯 단위로 자른 것 · 잔여는 서버에서 센다.
 */
export function PickupScheduler({ value, onChange, preferredStoreId = null, currentPickupAt = null, lockStore = false, disabled = false, className }: PickupSchedulerProps) {
  const { data: stores, isLoading } = useStores();
  const [storeId, setStoreId] = useState<string | null>(value?.storeId ?? preferredStoreId);
  const [date, setDate] = useState<string | null>(value?.pickupAt ? value.pickupAt.slice(0, 10) : null);

  const store = useMemo(() => stores?.find((s) => s.id === storeId) ?? null, [stores, storeId]);
  const dates = useMemo(() => (store ? buildPickupDates(store) : []), [store]);

  // 선호 매장이 목록에 없으면(비활성 등) 첫 매장으로
  useEffect(() => {
    if (!stores || stores.length === 0) return;
    if (storeId && stores.some((s) => s.id === storeId)) return;
    setStoreId(stores[0].id);
  }, [stores, storeId]);

  // 매장이 정해지면 첫 영업일을 기본 날짜로
  useEffect(() => {
    if (dates.length === 0) return;
    if (date && dates.some((d) => d.date === date && !d.closed)) return;
    setDate(dates.find((d) => !d.closed)?.date ?? null);
  }, [dates, date]);

  const { data: slots, isLoading: slotsLoading } = useStoreSlots(store?.id ?? null, date);

  const pickStore = (next: ConsumerStore) => {
    if (lockStore || next.id === storeId) return;
    setStoreId(next.id);
    setDate(null);
    onChange(null);
  };

  const pickDate = (d: PickupDate) => {
    if (d.closed || d.date === date) return;
    setDate(d.date);
    onChange(null);
  };

  const pickSlot = (at: string) => {
    if (!store) return;
    onChange({ storeId: store.id, pickupAt: at, store });
  };

  if (isLoading) return <Skeleton className={cn('h-[260px] rounded-sm', className)} />;
  if (!stores || stores.length === 0) {
    return <p className={cn('rounded-sm bg-surface-accent px-4 py-3 text-[13px] text-content-soft', className)}>지금은 매장 수령이 가능한 매장이 없어요. 택배로 받아주세요.</p>;
  }

  return (
    <div className={cn('space-y-5', className)}>
      <div>
        <div className="flex items-baseline justify-between">
          <p className="text-[13px] font-semibold text-content-mid">받을 매장</p>
          <Link href="/group-buy/stores" className="text-[12.5px] font-medium text-content-faint hover:text-content-mid">
            매장 안내 · 지도
          </Link>
        </div>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {stores.map((s) => {
            const active = s.id === storeId;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={disabled || (lockStore && !active)}
                  onClick={() => pickStore(s)}
                  aria-pressed={active}
                  className={cn(
                    'flex w-full flex-col items-start rounded-sm border px-3.5 py-3 text-left transition-colors',
                    active ? 'border-ink bg-surface-accent/60' : 'border-line bg-surface hover:bg-surface-accent/40',
                    (disabled || (lockStore && !active)) && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <span className="text-[13.5px] font-bold text-content">{s.name}</span>
                  <span className="mt-0.5 flex items-center gap-1 text-[12px] text-content-soft">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{s.address}</span>
                  </span>
                  <span className="mt-0.5 text-[12px] tabular-nums text-content-faint">{storeHoursLabel(s)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {store ? (
        <>
          <div>
            <p className="text-[13px] font-semibold text-content-mid">
              픽업 날짜 <span className="font-normal text-content-faint">· 주문일 {PICKUP_LEAD_DAYS}일 뒤부터</span>
            </p>
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]">
              {dates.map((d) => (
                <button
                  key={d.date}
                  type="button"
                  disabled={disabled || d.closed}
                  onClick={() => pickDate(d)}
                  aria-pressed={d.date === date}
                  title={d.closed ? '휴무일' : undefined}
                  className={cn(CHIP, d.closed ? CHIP_OFF : d.date === date ? CHIP_ACTIVE : CHIP_IDLE)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[13px] font-semibold text-content-mid">
              픽업 시간 <span className="font-normal text-content-faint">· {store.slotMinutes}분 단위</span>
            </p>
            {slotsLoading || !slots ? (
              <Skeleton className="mt-2 h-[84px] rounded-sm" />
            ) : slots.length === 0 ? (
              <p className="mt-2 text-[13px] text-content-soft">이 날은 예약할 수 없어요.</p>
            ) : (
              <div className="mt-2 grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                {slots.map((slot) => {
                  const active = value?.pickupAt === slot.at && value?.storeId === store.id;
                  const isCurrent = currentPickupAt === slot.at;
                  const full = slot.remaining <= 0 && !isCurrent;
                  return (
                    <button
                      key={slot.at}
                      type="button"
                      disabled={disabled || full}
                      onClick={() => pickSlot(slot.at)}
                      aria-pressed={active}
                      title={full ? '마감' : `${slot.remaining}자리 남음`}
                      className={cn(CHIP, 'w-full', full ? CHIP_OFF : active ? CHIP_ACTIVE : CHIP_IDLE)}
                    >
                      {slot.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-sm bg-surface-accent px-3.5 py-2.5 text-[12.5px] text-content-soft">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {store.address} {store.addressDetail}
            </span>
            {store.phone ? (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                {store.phone}
              </span>
            ) : null}
            {store.directions ? <span className="basis-full text-content-faint">{store.directions}</span> : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
