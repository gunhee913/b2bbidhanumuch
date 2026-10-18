'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import MallAdminLayout from '@/components/admin/MallAdminLayout';
import { useAdminStores, useSaveAdminStore } from '@/features/group-buy/hooks';
import { shortTime, storeHoursLabel, weekdayLabel } from '@/features/group-buy/lib/stores';
import type { ConsumerStore, UpsertStoreInput } from '@/features/group-buy/types';
import { ADMIN_INPUT_CLASS, AdminButton, AdminField } from '@/features/group-buy/components/admin/AdminPrimitives';

interface FormState {
  id?: string;
  slug: string;
  name: string;
  zipcode: string;
  address: string;
  addressDetail: string;
  phone: string;
  lat: string;
  lng: string;
  openTime: string;
  closeTime: string;
  closedWeekdays: number[];
  slotMinutes: string;
  slotCapacity: string;
  description: string;
  directions: string;
  parking: string;
  imageUrl: string;
  isActive: boolean;
  sortOrder: string;
}

const EMPTY_FORM: FormState = {
  slug: '',
  name: '',
  zipcode: '',
  address: '',
  addressDetail: '',
  phone: '',
  lat: '37.5665',
  lng: '126.9780',
  openTime: '11:00',
  closeTime: '21:00',
  closedWeekdays: [],
  slotMinutes: '30',
  slotCapacity: '6',
  description: '',
  directions: '',
  parking: '',
  imageUrl: '',
  isActive: true,
  sortOrder: '0',
};

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

function toForm(store: ConsumerStore): FormState {
  return {
    id: store.id,
    slug: store.slug,
    name: store.name,
    zipcode: store.zipcode ?? '',
    address: store.address,
    addressDetail: store.addressDetail ?? '',
    phone: store.phone ?? '',
    lat: String(store.lat),
    lng: String(store.lng),
    openTime: shortTime(store.openTime),
    closeTime: shortTime(store.closeTime),
    closedWeekdays: store.closedWeekdays,
    slotMinutes: String(store.slotMinutes),
    slotCapacity: String(store.slotCapacity),
    description: store.description ?? '',
    directions: store.directions ?? '',
    parking: store.parking ?? '',
    imageUrl: store.imageUrl ?? '',
    isActive: store.isActive,
    sortOrder: String(store.sortOrder),
  };
}

function toInput(f: FormState): UpsertStoreInput | string {
  const lat = parseFloat(f.lat);
  const lng = parseFloat(f.lng);
  if (!f.slug.trim() || !f.name.trim() || !f.address.trim()) return 'slug · 이름 · 주소는 필수입니다.';
  if (Number.isNaN(lat) || Number.isNaN(lng)) return '위도·경도를 숫자로 입력하세요.';
  return {
    id: f.id,
    slug: f.slug.trim(),
    name: f.name.trim(),
    zipcode: f.zipcode.trim(),
    address: f.address.trim(),
    addressDetail: f.addressDetail.trim(),
    phone: f.phone.trim(),
    lat,
    lng,
    openTime: f.openTime,
    closeTime: f.closeTime,
    closedWeekdays: f.closedWeekdays,
    slotMinutes: parseInt(f.slotMinutes, 10) || 30,
    slotCapacity: parseInt(f.slotCapacity, 10) || 6,
    description: f.description.trim(),
    directions: f.directions.trim(),
    parking: f.parking.trim(),
    imageUrl: f.imageUrl.trim() || null,
    isActive: f.isActive,
    sortOrder: parseInt(f.sortOrder, 10) || 0,
  };
}

/** 매장 관리 · 왼쪽 목록에서 고르면 오른쪽 폼에서 고치고 저장한다 */
export default function AdminStoresPage() {
  const { data: stores, isLoading } = useAdminStores();
  const save = useSaveAdminStore();
  const [selectedId, setSelectedId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    if (!stores) return;
    if (selectedId === 'new') return;
    const store = stores.find((s) => s.id === selectedId) ?? stores[0];
    if (!store) return;
    if (store.id !== selectedId) setSelectedId(store.id);
    setForm(toForm(store));
  }, [stores, selectedId]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const toggleWeekday = (d: number) =>
    set('closedWeekdays', form.closedWeekdays.includes(d) ? form.closedWeekdays.filter((w) => w !== d) : [...form.closedWeekdays, d].sort());

  const startNew = () => {
    setSelectedId('new');
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    const input = toInput(form);
    if (typeof input === 'string') {
      toast.error(input);
      return;
    }
    try {
      const saved = await save.mutateAsync(input);
      toast.success(`${saved.name} 저장 완료`);
      setSelectedId(saved.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '저장 실패');
    }
  };

  return (
    <MallAdminLayout>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">매장 관리</h1>
            <p className="mt-1 text-xs text-gray-500">매장 수령이 가능한 직영 매장입니다. 영업시간·휴무·예약 단위·시간당 정원이 소비자 예약 화면에 바로 반영됩니다.</p>
          </div>
          <AdminButton variant="primary" size="md" onClick={startNew}>
            새 매장
          </AdminButton>
        </div>

        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="border border-gray-200 bg-white">
            {isLoading ? (
              <p className="p-4 text-xs text-gray-400">불러오는 중…</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {(stores ?? []).map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(s.id)}
                      className={cn('flex w-full flex-col items-start px-4 py-3 text-left hover:bg-gray-50', selectedId === s.id && 'bg-gray-100')}
                    >
                      <span className="flex items-center gap-2 text-[13px] font-semibold text-gray-900">
                        {s.name}
                        {!s.isActive ? <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10.5px] font-medium text-gray-600">비활성</span> : null}
                      </span>
                      <span className="mt-0.5 text-[11.5px] text-gray-500">{s.address}</span>
                      <span className="text-[11px] text-gray-400">{storeHoursLabel(s)} · {s.slotMinutes}분 · {s.slotCapacity}팀</span>
                    </button>
                  </li>
                ))}
                {selectedId === 'new' ? <li className="bg-gray-100 px-4 py-3 text-[13px] font-semibold text-gray-900">새 매장</li> : null}
              </ul>
            )}
          </div>

          <div className="border border-gray-200 bg-white p-5">
            <div className="grid gap-3 md:grid-cols-2">
              <AdminField label="이름">
                <input className={ADMIN_INPUT_CLASS} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="강남 역삼점" />
              </AdminField>
              <AdminField label="slug" hint="주소창에 쓰입니다 · 영문 소문자·숫자·하이픈">
                <input className={ADMIN_INPUT_CLASS} value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="gangnam" disabled={!!form.id} />
              </AdminField>
              <AdminField label="주소" className="md:col-span-2">
                <input className={ADMIN_INPUT_CLASS} value={form.address} onChange={(e) => set('address', e.target.value)} />
              </AdminField>
              <AdminField label="상세 주소">
                <input className={ADMIN_INPUT_CLASS} value={form.addressDetail} onChange={(e) => set('addressDetail', e.target.value)} />
              </AdminField>
              <AdminField label="우편번호">
                <input className={ADMIN_INPUT_CLASS} value={form.zipcode} onChange={(e) => set('zipcode', e.target.value)} />
              </AdminField>
              <AdminField label="전화">
                <input className={ADMIN_INPUT_CLASS} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              </AdminField>
              <AdminField label="사진 URL">
                <input className={ADMIN_INPUT_CLASS} value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://" />
              </AdminField>
              <AdminField label="위도 (lat)">
                <input className={ADMIN_INPUT_CLASS} value={form.lat} onChange={(e) => set('lat', e.target.value)} inputMode="decimal" />
              </AdminField>
              <AdminField label="경도 (lng)">
                <input className={ADMIN_INPUT_CLASS} value={form.lng} onChange={(e) => set('lng', e.target.value)} inputMode="decimal" />
              </AdminField>
              <AdminField label="오픈">
                <input type="time" className={ADMIN_INPUT_CLASS} value={form.openTime} onChange={(e) => set('openTime', e.target.value)} step={600} />
              </AdminField>
              <AdminField label="마감">
                <input type="time" className={ADMIN_INPUT_CLASS} value={form.closeTime} onChange={(e) => set('closeTime', e.target.value)} step={600} />
              </AdminField>
              <AdminField label="예약 단위(분)">
                <input className={ADMIN_INPUT_CLASS} value={form.slotMinutes} onChange={(e) => set('slotMinutes', e.target.value)} inputMode="numeric" />
              </AdminField>
              <AdminField label="시간대당 정원(팀)">
                <input className={ADMIN_INPUT_CLASS} value={form.slotCapacity} onChange={(e) => set('slotCapacity', e.target.value)} inputMode="numeric" />
              </AdminField>
              <AdminField label="휴무 요일" className="md:col-span-2">
                <div className="flex gap-1.5">
                  {WEEKDAYS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleWeekday(d)}
                      className={cn(
                        'h-8 w-9 rounded border text-xs font-medium',
                        form.closedWeekdays.includes(d) ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
                      )}
                    >
                      {weekdayLabel(d)}
                    </button>
                  ))}
                </div>
              </AdminField>
              <AdminField label="오시는 길" className="md:col-span-2">
                <input className={ADMIN_INPUT_CLASS} value={form.directions} onChange={(e) => set('directions', e.target.value)} placeholder="2호선 역삼역 3번 출구 도보 4분" />
              </AdminField>
              <AdminField label="주차" className="md:col-span-2">
                <input className={ADMIN_INPUT_CLASS} value={form.parking} onChange={(e) => set('parking', e.target.value)} />
              </AdminField>
              <AdminField label="소개" className="md:col-span-2">
                <textarea
                  className={cn(ADMIN_INPUT_CLASS, 'h-24 resize-none py-1.5')}
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                />
              </AdminField>
              <AdminField label="정렬 순서">
                <input className={ADMIN_INPUT_CLASS} value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} inputMode="numeric" />
              </AdminField>
              <label className="flex items-center gap-2 self-end pb-2 text-xs text-gray-700">
                <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
                소비자에게 노출 · 예약 받기
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2 border-t border-gray-100 pt-4">
              <AdminButton variant="primary" size="md" onClick={handleSave} loading={save.isPending}>
                저장
              </AdminButton>
            </div>
          </div>
        </div>
      </div>
    </MallAdminLayout>
  );
}
