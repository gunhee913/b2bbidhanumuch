'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import MallAdminLayout from '@/components/admin/MallAdminLayout';
import { ADMIN_INPUT_CLASS, AdminButton, AdminField } from '@/features/group-buy/components/admin/AdminPrimitives';
import { useAdminGifts, useUpdateGiftSettings } from '@/features/group-buy/hooks';
import { formatWon } from '@/features/group-buy/lib/slots';
import { formatDateTime } from '@/features/group-buy/lib/format';

/** 선물세트 관리 · 세트당 포장비와 최근 주문 */
export default function AdminGiftPage() {
  const { data, isLoading } = useAdminGifts();
  const save = useUpdateGiftSettings();
  const [fee, setFee] = useState('15000');

  useEffect(() => {
    if (data?.packagingFee != null) setFee(String(data.packagingFee));
  }, [data?.packagingFee]);

  const handleSave = async () => {
    const packagingFee = Number(fee);
    try {
      await save.mutateAsync({ packagingFee });
      toast.success('포장비를 저장했습니다.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '저장 실패');
    }
  };

  return (
    <MallAdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">선물세트</h1>
          <p className="mt-1 text-xs text-gray-500">칸 중량은 500g 고정입니다. 세트당 포장비만 여기서 바꿉니다.</p>
        </div>

        <div className="max-w-[480px] border border-gray-200 bg-white p-4">
          <AdminField label="세트당 포장비 (원)" hint="박스·보냉·메시지 카드 포함 · 소비자 주문서에 바로 반영됩니다.">
            <input className={`${ADMIN_INPUT_CLASS} w-40`} value={fee} onChange={(e) => setFee(e.target.value)} inputMode="numeric" />
          </AdminField>
          <div className="mt-3 flex justify-end">
            <AdminButton variant="primary" onClick={handleSave} loading={save.isPending}>
              저장
            </AdminButton>
          </div>
        </div>

        <div className="border border-gray-200 bg-white">
          <p className="border-b border-gray-100 px-4 py-2.5 text-xs font-semibold text-gray-700">최근 주문</p>
          {isLoading ? (
            <p className="p-4 text-xs text-gray-400">불러오는 중…</p>
          ) : (data?.gifts ?? []).length === 0 ? (
            <p className="p-4 text-xs text-gray-400">아직 선물세트 주문이 없습니다.</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-[11px] text-gray-500">
                <tr>
                  <th className="px-4 py-2 font-medium">번호</th>
                  <th className="px-4 py-2 font-medium">구성</th>
                  <th className="px-4 py-2 font-medium">금액</th>
                  <th className="px-4 py-2 font-medium">상태</th>
                  <th className="px-4 py-2 font-medium">주문</th>
                </tr>
              </thead>
              <tbody>
                {(data?.gifts ?? []).map((g) => (
                  <tr key={g.id} className="border-t border-gray-100">
                    <td className="px-4 py-2 font-medium text-gray-900">{g.giftNo}</td>
                    <td className="px-4 py-2 text-gray-600">
                      {g.cellCount}구 × {g.quantity}
                    </td>
                    <td className="px-4 py-2 tabular-nums">{formatWon(g.amount)}</td>
                    <td className="px-4 py-2">{g.statusLabel}</td>
                    <td className="px-4 py-2 text-gray-400">{formatDateTime(g.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </MallAdminLayout>
  );
}
