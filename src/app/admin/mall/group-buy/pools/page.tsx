'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import MallAdminLayout from '@/components/admin/MallAdminLayout';
import { getPartGroupOrder } from '@/features/live-auction/lib/partGrouping';
import { useAdminPools, useMatchPools, useSavePool } from '@/features/group-buy/hooks';
import type { AdminPool, UpsertPoolInput } from '@/features/group-buy/types';
import { POOL_PART_ORDER, gradeKeyLabel } from '@/features/group-buy/lib/pools';
import { ADMIN_INPUT_CLASS, AdminButton, AdminField, AdminStat, formatNumberInput } from '@/features/group-buy/components/admin/AdminPrimitives';

const GRADE_KEYS = ['1++9', '1++8', '1++7', '1++', '1+', '1', '2'] as const;

interface FormState {
  id?: string;
  partGroup: string;
  gradeKey: string;
  pricePerKg: string;
  bidPriceCap: string;
  referenceRetailPricePerKg: string;
  targetKg: string;
  minKg: string;
  maxKg: string;
  reservationTtlDays: string;
  status: 'open' | 'paused';
}

const EMPTY_FORM: FormState = {
  partGroup: '윗등심',
  gradeKey: '1++9',
  pricePerKg: '',
  bidPriceCap: '',
  referenceRetailPricePerKg: '',
  targetKg: '15',
  minKg: '1',
  maxKg: '10',
  reservationTtlDays: '14',
  status: 'open',
};

function toForm(p: AdminPool): FormState {
  return {
    id: p.id,
    partGroup: p.partGroup,
    gradeKey: p.gradeKey,
    pricePerKg: String(p.pricePerKg),
    bidPriceCap: p.bidPriceCap?.toString() ?? '',
    referenceRetailPricePerKg: p.referenceRetailPricePerKg?.toString() ?? '',
    targetKg: String(p.targetKg),
    minKg: String(p.minKg),
    maxKg: String(p.maxKg),
    reservationTtlDays: String(p.reservationTtlDays),
    status: p.status,
  };
}

function toInput(f: FormState): UpsertPoolInput | string {
  const price = formatNumberInput(f.pricePerKg);
  const target = formatNumberInput(f.targetKg);
  const minKg = formatNumberInput(f.minKg);
  const maxKg = formatNumberInput(f.maxKg);
  const ttl = formatNumberInput(f.reservationTtlDays);
  if (!price) return 'kg당 단가를 입력해주세요.';
  if (!target) return '한 덩어리 목표 중량을 입력해주세요.';
  if (!minKg || !maxKg || maxKg < minKg) return 'kg 범위를 확인해주세요.';
  if (!ttl) return '예약 유효기간을 입력해주세요.';
  return {
    id: f.id,
    partGroup: f.partGroup,
    gradeKey: f.gradeKey,
    pricePerKg: price,
    bidPriceCap: formatNumberInput(f.bidPriceCap),
    referenceRetailPricePerKg: formatNumberInput(f.referenceRetailPricePerKg),
    targetKg: target,
    minKg,
    maxKg,
    reservationTtlDays: ttl,
    status: f.status,
  };
}

/**
 * kg 수요 풀 관리 · 부위×등급별 kg당 단가·목표 중량·응찰 상한을 정하고, 모인 양과 기다리는 부위를 본다.
 * 매칭은 상장 승인·예약 시점에 자동으로 돌지만, 여기서 수동으로도 돌릴 수 있다.
 */
export default function AdminPoolsPage() {
  const { data: pools, isLoading } = useAdminPools();
  const save = useSavePool();
  const match = useMatchPools();
  const [form, setForm] = useState<FormState | null>(null);
  // 소비자 풀 부위(윗등심·아랫등심 …) 먼저, 그 뒤 경매 대분류 중 아직 없는 것(등심 제외)
  const groups = useMemo(
    () => [...POOL_PART_ORDER, ...getPartGroupOrder().filter((g) => g !== '등심' && !(POOL_PART_ORDER as readonly string[]).includes(g))],
    [],
  );

  const totals = useMemo(() => {
    const list = pools ?? [];
    return {
      openKg: list.reduce((s, p) => s + p.openKg, 0),
      openCount: list.reduce((s, p) => s + p.openCount, 0),
      waiting: list.reduce((s, p) => s + p.waitingDraftCount, 0),
      allocated: list.reduce((s, p) => s + p.allocatedCount, 0),
    };
  }, [pools]);

  const handleSave = async () => {
    if (!form) return;
    const input = toInput(form);
    if (typeof input === 'string') {
      toast.error(input);
      return;
    }
    try {
      await save.mutateAsync(input);
      toast.success(`${input.partGroup} ${gradeKeyLabel(input.gradeKey)} 풀을 저장했습니다.`);
      setForm(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '저장 실패');
    }
  };

  const handleMatch = async () => {
    try {
      const r = await match.mutateAsync();
      toast.success(`매칭 ${r.matched}건 · 만료 예약 ${r.expired}건 정리`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '매칭 실패');
    }
  };

  const set = (patch: Partial<FormState>) => setForm((f) => (f ? { ...f, ...patch } : f));

  return (
    <MallAdminLayout>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">kg 수요 풀</h1>
            <p className="mt-1 text-xs text-gray-500">
              부위×등급별 kg당 단가는 여기서 정합니다. 소비자는 그 가격으로 kg만 골라 결제하고, 한 덩어리 목표 중량이 차면
              승인된 부위에 묶여 모집완료(full) 로 들어가 기존 자동 응찰·정산을 그대로 탑니다. 확보하지 못하면 전액 환불됩니다.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <AdminButton onClick={handleMatch} loading={match.isPending}>
              지금 매칭 실행
            </AdminButton>
            <AdminButton variant="primary" onClick={() => setForm(EMPTY_FORM)}>
              풀 추가
            </AdminButton>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <AdminStat label="모이는 중" value={`${totals.openKg.toLocaleString()}kg`} sub={`${totals.openCount}건 예약`} />
          <AdminStat label="기다리는 부위(draft)" value={totals.waiting} sub="풀 조건에 맞고 마감 전" />
          <AdminStat label="확정된 예약" value={totals.allocated} sub="주문으로 전환됨" />
          <AdminStat label="풀" value={pools?.length ?? 0} sub={`열림 ${(pools ?? []).filter((p) => p.status === 'open').length}`} />
        </div>

        {form ? (
          <div className="border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">{form.id ? '풀 수정' : '새 풀'}</h2>
              <span className="text-[11px] text-gray-400">단가를 바꾸면 이후 참여부터 적용 · 이미 결제된 참여는 그대로</span>
            </div>
            <div className="mt-3 grid grid-cols-6 gap-3">
              <AdminField label="부위">
                <select value={form.partGroup} onChange={(e) => set({ partGroup: e.target.value })} className={ADMIN_INPUT_CLASS} disabled={!!form.id}>
                  {groups.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </AdminField>
              <AdminField label="등급키">
                <select value={form.gradeKey} onChange={(e) => set({ gradeKey: e.target.value })} className={ADMIN_INPUT_CLASS} disabled={!!form.id}>
                  {GRADE_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {gradeKeyLabel(k)}
                    </option>
                  ))}
                </select>
              </AdminField>
              <AdminField label="kg당 단가 (원)" hint="소비자 노출 가격">
                <input type="number" step={1000} value={form.pricePerKg} onChange={(e) => set({ pricePerKg: e.target.value })} placeholder="125000" className={ADMIN_INPUT_CLASS} />
              </AdminField>
              <AdminField label="응찰 상한 (원/kg 지육)" hint="없으면 부위 기본값">
                <input type="number" step={1000} value={form.bidPriceCap} onChange={(e) => set({ bidPriceCap: e.target.value })} className={ADMIN_INPUT_CLASS} />
              </AdminField>
              <AdminField label="참고 소매가 (원/kg)">
                <input type="number" step={1000} value={form.referenceRetailPricePerKg} onChange={(e) => set({ referenceRetailPricePerKg: e.target.value })} className={ADMIN_INPUT_CLASS} />
              </AdminField>
              <AdminField label="목표 중량 (kg)" hint="한 덩어리 · 이만큼 모이면 경매">
                <input type="number" step={0.5} value={form.targetKg} onChange={(e) => set({ targetKg: e.target.value })} className={ADMIN_INPUT_CLASS} />
              </AdminField>
              <AdminField label="최소 kg">
                <input type="number" min={1} value={form.minKg} onChange={(e) => set({ minKg: e.target.value })} className={ADMIN_INPUT_CLASS} />
              </AdminField>
              <AdminField label="최대 kg">
                <input type="number" min={1} value={form.maxKg} onChange={(e) => set({ maxKg: e.target.value })} className={ADMIN_INPUT_CLASS} />
              </AdminField>
              <AdminField label="예약 유효 (일)">
                <input type="number" min={1} max={90} value={form.reservationTtlDays} onChange={(e) => set({ reservationTtlDays: e.target.value })} className={ADMIN_INPUT_CLASS} />
              </AdminField>
              <AdminField label="상태">
                <select value={form.status} onChange={(e) => set({ status: e.target.value as FormState['status'] })} className={ADMIN_INPUT_CLASS}>
                  <option value="open">열림</option>
                  <option value="paused">일시중지</option>
                </select>
              </AdminField>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <AdminButton onClick={() => setForm(null)}>취소</AdminButton>
              <AdminButton variant="primary" onClick={handleSave} loading={save.isPending}>
                저장
              </AdminButton>
            </div>
          </div>
        ) : null}

        <div className="overflow-x-auto border border-gray-200 bg-white">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-[11px] text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">부위 · 등급</th>
                <th className="px-3 py-2 text-right font-medium">kg당 단가</th>
                <th className="px-3 py-2 text-right font-medium">참고 소매가</th>
                <th className="px-3 py-2 text-right font-medium">응찰 상한</th>
                <th className="px-3 py-2 text-right font-medium">목표 중량</th>
                <th className="px-3 py-2 text-left font-medium">모인 양</th>
                <th className="px-3 py-2 text-right font-medium">기다리는 부위</th>
                <th className="px-3 py-2 text-right font-medium">확정</th>
                <th className="px-3 py-2 text-center font-medium">상태</th>
                <th className="px-3 py-2 text-right font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-3 py-10 text-center text-gray-400">
                    불러오는 중…
                  </td>
                </tr>
              ) : (pools ?? []).length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-10 text-center text-gray-400">
                    풀이 없습니다. 「풀 추가」로 만들어주세요.
                  </td>
                </tr>
              ) : (
                (pools ?? []).map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <span className="font-semibold text-gray-900">{p.partGroup}</span>
                      <span className="ml-1.5 text-gray-600">{p.gradeLabel}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums text-gray-900">{p.pricePerKg.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-500">{p.referenceRetailPricePerKg?.toLocaleString() ?? '-'}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-700">{p.bidPriceCap?.toLocaleString() ?? '-'}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-700">{p.targetKg}kg</td>
                    <td className="px-3 py-2">
                      <div className="w-32">
                        <div className="flex items-center justify-between text-[11px] tabular-nums">
                          <span className={p.openKg >= p.targetKg ? 'font-semibold text-emerald-700' : 'text-gray-900'}>
                            {p.openKg}/{p.targetKg}kg
                          </span>
                          <span className="text-gray-400">{p.openCount}명</span>
                        </div>
                        <div className="mt-0.5 h-1 w-full bg-gray-100">
                          <div className={p.openKg >= p.targetKg ? 'h-full bg-emerald-500' : 'h-full bg-gray-900'} style={{ width: `${Math.min(100, p.targetKg ? Math.round((p.openKg / p.targetKg) * 100) : 0)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {p.waitingDraftCount > 0 ? <span className="font-semibold text-amber-700">{p.waitingDraftCount}</span> : <span className="text-gray-400">0</span>}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-700">{p.allocatedCount}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${p.status === 'open' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-gray-100 text-gray-600 ring-gray-200'}`}>
                        {p.status === 'open' ? '열림' : '일시중지'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <AdminButton onClick={() => setForm(toForm(p))}>수정</AdminButton>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MallAdminLayout>
  );
}
