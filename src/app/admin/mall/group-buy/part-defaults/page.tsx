'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import MallAdminLayout from '@/components/admin/MallAdminLayout';
import { getPartGroupOrder } from '@/features/live-auction/lib/partGrouping';
import { usePartDefaults, useSavePartDefault } from '@/features/group-buy/hooks';
import type { GroupBuyPartDefault } from '@/features/group-buy/types';
import { ADMIN_INPUT_CLASS, AdminButton, formatNumberInput } from '@/features/group-buy/components/admin/AdminPrimitives';

interface RowState {
  slotCount: string;
  pricePerKg: string;
  referenceRetailPricePerKg: string;
  bidPriceCap: string;
  positional: boolean;
}

const EMPTY_ROW: RowState = { slotCount: '', pricePerKg: '', referenceRetailPricePerKg: '', bidPriceCap: '', positional: false };

function toRow(d: GroupBuyPartDefault | undefined): RowState {
  if (!d) return EMPTY_ROW;
  return {
    slotCount: d.slotCount?.toString() ?? '',
    pricePerKg: d.pricePerKg?.toString() ?? '',
    referenceRetailPricePerKg: d.referenceRetailPricePerKg?.toString() ?? '',
    bidPriceCap: d.bidPriceCap?.toString() ?? '',
    positional: d.positional,
  };
}

/**
 * 부위별 기본 설정 · 상장 승인으로 초안이 만들어질 때 자동으로 채워지는 값.
 * 여기 값이 있으면 관리자는 초안을 열어 「공개」만 누르면 된다.
 */
export default function PartDefaultsPage() {
  const { data: defaults, isLoading } = usePartDefaults();
  const save = useSavePartDefault();
  const groups = useMemo(() => getPartGroupOrder(), []);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [savingGroup, setSavingGroup] = useState<string | null>(null);

  useEffect(() => {
    if (!defaults) return;
    const map = new Map(defaults.map((d) => [d.partGroup, d]));
    setRows(Object.fromEntries(groups.map((g) => [g, toRow(map.get(g))])));
  }, [defaults, groups]);

  const setRow = (group: string, patch: Partial<RowState>) => setRows((prev) => ({ ...prev, [group]: { ...(prev[group] ?? EMPTY_ROW), ...patch } }));

  const handleSave = async (group: string) => {
    const r = rows[group] ?? EMPTY_ROW;
    setSavingGroup(group);
    try {
      await save.mutateAsync({
        partGroup: group,
        slotCount: formatNumberInput(r.slotCount),
        pricePerKg: formatNumberInput(r.pricePerKg),
        referenceRetailPricePerKg: formatNumberInput(r.referenceRetailPricePerKg),
        bidPriceCap: formatNumberInput(r.bidPriceCap),
        positional: r.positional,
      });
      toast.success(`${group} 기본값을 저장했습니다.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setSavingGroup(null);
    }
  };

  const configured = (defaults ?? []).filter((d) => d.slotCount && d.pricePerKg).length;

  return (
    <MallAdminLayout>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">부위별 기본 설정</h1>
            <p className="mt-1 text-xs text-gray-500">
              상장이 승인되어 초안이 만들어질 때 자동으로 채워지는 값입니다. 분할 수와 단가가 있으면 초안을 열어 바로 공개할 수 있습니다.
              이미 만들어진 초안에는 소급되지 않습니다.
            </p>
          </div>
          <span className="text-xs tabular-nums text-gray-500">
            설정 완료 <span className="font-semibold text-gray-900">{configured}</span> / {groups.length}
          </span>
        </div>

        <div className="overflow-x-auto border border-gray-200 bg-white">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-[11px] text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">부위</th>
                <th className="px-3 py-2 text-left font-medium">분할 수</th>
                <th className="px-3 py-2 text-left font-medium">kg당 판매 단가</th>
                <th className="px-3 py-2 text-left font-medium">참고 소매가 (원/kg)</th>
                <th className="px-3 py-2 text-left font-medium">응찰 상한 (원/kg)</th>
                <th className="px-3 py-2 text-center font-medium">위치 선택</th>
                <th className="px-3 py-2 text-right font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-gray-400">
                    불러오는 중…
                  </td>
                </tr>
              ) : (
                groups.map((group) => {
                  const r = rows[group] ?? EMPTY_ROW;
                  const ready = !!formatNumberInput(r.slotCount) && !!formatNumberInput(r.pricePerKg);
                  return (
                    <tr key={group} className="hover:bg-gray-50">
                      <td className="px-3 py-1.5">
                        <span className="font-semibold text-gray-900">{group}</span>
                        {ready ? <span className="ml-1.5 text-[10.5px] text-emerald-600">자동 공개 가능</span> : null}
                      </td>
                      <td className="px-3 py-1.5">
                        <input type="number" min={1} max={100} value={r.slotCount} onChange={(e) => setRow(group, { slotCount: e.target.value })} className={`${ADMIN_INPUT_CLASS} w-20`} />
                      </td>
                      <td className="px-3 py-1.5">
                        <input type="number" min={0} step={100} value={r.pricePerKg} onChange={(e) => setRow(group, { pricePerKg: e.target.value })} className={`${ADMIN_INPUT_CLASS} w-28`} />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="number"
                          min={0}
                          step={100}
                          value={r.referenceRetailPricePerKg}
                          onChange={(e) => setRow(group, { referenceRetailPricePerKg: e.target.value })}
                          className={`${ADMIN_INPUT_CLASS} w-28`}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input type="number" min={0} step={100} value={r.bidPriceCap} onChange={(e) => setRow(group, { bidPriceCap: e.target.value })} className={`${ADMIN_INPUT_CLASS} w-28`} />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <input type="checkbox" checked={r.positional} onChange={(e) => setRow(group, { positional: e.target.checked })} className="h-3.5 w-3.5 accent-black" />
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <AdminButton variant="primary" onClick={() => handleSave(group)} loading={savingGroup === group}>
                          저장
                        </AdminButton>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MallAdminLayout>
  );
}
