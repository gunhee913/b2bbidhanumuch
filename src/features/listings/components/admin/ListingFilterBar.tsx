'use client';

import { useEffect, useState } from 'react';
import { Check, Download, Printer } from 'lucide-react';
import { ADMIN_BUTTON } from '@/components/admin/buttonStyles';
import { AdminDateInput } from '@/components/admin/AdminDateInput';
import { AdminSelect } from '@/components/admin/AdminSelect';
import { AdminTabs } from '@/components/admin/AdminTabs';
import {
  LISTING_DATE_PRESETS,
  LISTING_VIEW_STATUSES,
  presetForListingRange,
  rangeForListingPreset,
  type DateRange,
  type ListingViewStatus,
} from '../../lib/listingView';

export type StatusTab = ListingViewStatus | 'all';

interface CompanyOption {
  id: string;
  name: string;
}

interface ListingFilterBarProps {
  applied: DateRange;
  appliedCompanyId: string;
  companies: CompanyOption[];
  onApply: (range: DateRange, companyId: string) => void;
  onReset: () => void;

  statusTab: StatusTab;
  statusCounts: Record<ListingViewStatus, number>;
  totalCount: number;
  onStatusTabChange: (tab: StatusTab) => void;

  selectedCount: number;
  onApproveSelected: () => void;
  onExcel: () => void;
  onPrint: () => void;
  isApproving: boolean;
}

const ALL_COMPANIES = 'all';

/** 상장일 프리셋 + 직접 입력 + 상장업체, 아래 줄에 상태 탭과 동작 버튼 */
export function ListingFilterBar({
  applied,
  appliedCompanyId,
  companies,
  onApply,
  onReset,
  statusTab,
  statusCounts,
  totalCount,
  onStatusTabChange,
  selectedCount,
  onApproveSelected,
  onExcel,
  onPrint,
  isApproving,
}: ListingFilterBarProps) {
  const [draft, setDraft] = useState<DateRange>(applied);
  const [draftCompanyId, setDraftCompanyId] = useState(appliedCompanyId);

  // 초기화처럼 바깥에서 적용값이 바뀌면 입력칸도 따라간다
  useEffect(() => setDraft(applied), [applied]);
  useEffect(() => setDraftCompanyId(appliedCompanyId), [appliedCompanyId]);

  const activePreset = presetForListingRange(applied);
  const isValid = Boolean(draft.start) && Boolean(draft.end) && draft.start <= draft.end;
  const isDirty = draft.start !== applied.start || draft.end !== applied.end || draftCompanyId !== appliedCompanyId;

  const applyPreset = (preset: (typeof LISTING_DATE_PRESETS)[number]['value']) => {
    const next = rangeForListingPreset(preset);
    setDraft(next);
    onApply(next, draftCompanyId);
  };

  const companyOptions = [{ value: ALL_COMPANIES, label: '전체' }, ...companies.map((company) => ({ value: company.id, label: company.name }))];

  const tabs: { value: StatusTab; label: string; count: number }[] = [
    { value: 'all', label: '전체', count: totalCount },
    ...LISTING_VIEW_STATUSES.map((status) => ({ value: status, label: status, count: statusCounts[status] })),
  ];

  return (
    <div className="mb-4 rounded-[2px] border border-slate-200 bg-white">
      <form
        className="flex flex-wrap items-center gap-3 px-4 py-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (isValid) onApply(draft, draftCompanyId);
        }}
      >
        <span className="text-[13px] font-medium text-slate-600">상장일</span>
        <AdminTabs label="상장일 프리셋" value={activePreset} options={LISTING_DATE_PRESETS} onChange={applyPreset} />
        <div className="flex items-center gap-1.5">
          <AdminDateInput aria-label="시작일" value={draft.start} max={draft.end} onChange={(start) => setDraft((prev) => ({ ...prev, start }))} />
          <span className="text-slate-400">~</span>
          <AdminDateInput aria-label="종료일" value={draft.end} min={draft.start} onChange={(end) => setDraft((prev) => ({ ...prev, end }))} />
        </div>

        <span className="ml-2 text-[13px] font-medium text-slate-600">상장업체</span>
        <AdminSelect
          aria-label="상장업체"
          value={draftCompanyId}
          onChange={setDraftCompanyId}
          options={companyOptions}
          className="w-[150px]"
        />

        <button type="submit" disabled={!isDirty || !isValid} className={ADMIN_BUTTON.primary}>
          조회
        </button>
        <button type="button" onClick={onReset} className={ADMIN_BUTTON.secondary}>
          초기화
        </button>
      </form>

      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5">
        <AdminTabs label="상태" value={statusTab} options={tabs} onChange={onStatusTabChange} />

        <div className="flex items-center gap-2">
          <button type="button" onClick={onExcel} disabled={totalCount === 0} className={ADMIN_BUTTON.secondary}>
            <Download className="h-3.5 w-3.5" />
            엑셀
          </button>
          <button type="button" onClick={onPrint} disabled={totalCount === 0} className={ADMIN_BUTTON.secondary}>
            <Printer className="h-3.5 w-3.5" />
            인쇄
          </button>
          <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden />
          <button type="button" onClick={onApproveSelected} disabled={selectedCount === 0 || isApproving} className={ADMIN_BUTTON.primary}>
            <Check className="h-3.5 w-3.5" />
            선택 승인{selectedCount > 0 ? ` (${selectedCount})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
