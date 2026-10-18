'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import MallAdminLayout from '@/components/admin/MallAdminLayout';
import { useGroupBuySettings, useUpdateGroupBuySettings } from '@/features/group-buy/hooks';
import { ADMIN_INPUT_CLASS, AdminButton, AdminField } from '@/features/group-buy/components/admin/AdminPrimitives';

/**
 * 공동구매 설정 · 플랫폼 응찰 계정(중도매인)과 기본 모집 마감 오프셋.
 */
export default function GroupBuySettingsPage() {
  const { data, isLoading } = useGroupBuySettings();
  const update = useUpdateGroupBuySettings();
  const [dealerId, setDealerId] = useState<string>('');
  const [offset, setOffset] = useState<string>('30');

  useEffect(() => {
    if (!data) return;
    setDealerId(data.platformDealerId ?? '');
    setOffset(String(data.deadlineOffsetMin));
  }, [data]);

  const handleSave = async () => {
    const offsetMin = Number(offset);
    if (!Number.isInteger(offsetMin) || offsetMin < 0 || offsetMin > 1440) {
      toast.error('마감 오프셋은 0~1440 분 사이여야 합니다.');
      return;
    }
    try {
      await update.mutateAsync({ platformDealerId: dealerId || null, deadlineOffsetMin: offsetMin });
      toast.success('설정을 저장했습니다.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '저장 실패');
    }
  };

  return (
    <MallAdminLayout>
      <div className="max-w-[640px] space-y-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">공동구매 설정</h1>
          <p className="mt-1 text-xs text-gray-500">플랫폼이 경매에 참여할 때 쓰는 계정과 모집 마감 기본값입니다.</p>
        </div>

        <div className="space-y-4 border border-gray-200 bg-white p-4">
          {isLoading ? (
            <p className="py-6 text-center text-xs text-gray-400">불러오는 중…</p>
          ) : (
            <>
              <AdminField
                label="플랫폼 응찰 계정 (중도매인)"
                hint="모집이 완료된 상품은 이 계정 이름으로 경매에 자동 응찰됩니다. 도축장 제한이 없는 계정을 권장합니다."
              >
                <select value={dealerId} onChange={(e) => setDealerId(e.target.value)} className={ADMIN_INPUT_CLASS}>
                  <option value="">선택 안 함 (자동 응찰 중지)</option>
                  {(data?.dealers ?? []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.dealerNo})
                    </option>
                  ))}
                </select>
              </AdminField>
              {data?.platformDealerName ? <p className="text-[11px] text-gray-500">현재: {data.platformDealerName}</p> : null}

              <AdminField label="기본 모집 마감 오프셋 (분)" hint="초안의 모집 마감 = 해당 상장일 1회차 경매 예정 시각 − 이 값. 초안마다 개별 수정할 수 있습니다.">
                <input type="number" min={0} max={1440} value={offset} onChange={(e) => setOffset(e.target.value)} className={`${ADMIN_INPUT_CLASS} w-32`} />
              </AdminField>

              <div className="flex justify-end border-t border-gray-200 pt-4">
                <AdminButton size="md" variant="primary" onClick={handleSave} loading={update.isPending}>
                  저장
                </AdminButton>
              </div>
            </>
          )}
        </div>

        <div className="border border-gray-200 bg-gray-50 p-4 text-[11.5px] leading-relaxed text-gray-600">
          <p className="font-semibold text-gray-800">흐름 요약</p>
          <ol className="mt-1.5 list-decimal space-y-0.5 pl-4">
            <li>상장 승인 → 부위마다 초안 생성(부위별 기본값 적용)</li>
            <li>관리자가 분할 수·단가 확인 후 공개 → 소비자 모집</li>
            <li>구좌가 모두 차면 모집완료 → 회차 시작 시 플랫폼 계정이 자동 응찰</li>
            <li>낙찰 → 소분 가공 → 배송 → 완료 (관리자 수동 전이)</li>
            <li>유찰·모집 미달 → 결제분 자동 환불</li>
          </ol>
        </div>
      </div>
    </MallAdminLayout>
  );
}
