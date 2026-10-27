'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import AdminLayout from '@/components/admin/AdminLayout';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { useCompanies } from '@/features/companies/hooks';
import {
  useApproveListing,
  useApproveListingsBulk,
  useDeleteListing,
  useListings,
  useUpdateListing,
  useUpdatePart,
} from '@/features/listings/hooks';
import {
  countByStatus,
  DEFAULT_LISTING_DATE_PRESET,
  hasPhotos,
  rangeForListingPreset,
  sortByListingNo,
  toListingView,
  type DateRange,
  type ListingView,
} from '@/features/listings/lib/listingView';
import { downloadListingsExcel, printListings } from '@/features/listings/lib/listingExport';
import { ListingFilterBar, type StatusTab } from '@/features/listings/components/admin/ListingFilterBar';
import { ListingTable } from '@/features/listings/components/admin/ListingTable';
import { ListingDetail } from '@/features/listings/components/admin/ListingDetail';
import type { EditMode } from '@/features/listings/components/admin/ListingEditForm';
import type { AttachmentUpdates } from '@/features/listings/components/admin/AttachmentEditor';

const ALL_COMPANIES = 'all';

type Confirm =
  | { kind: 'approve'; listings: ListingView[] }
  | { kind: 'revert'; listing: ListingView }
  | { kind: 'delete'; listing: ListingView };

export default function AuctionsListPage() {
  const [range, setRange] = useState<DateRange>(() => rangeForListingPreset(DEFAULT_LISTING_DATE_PRESET));
  const [companyId, setCompanyId] = useState(ALL_COMPANIES);
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  // 펼친 행 안에서 수정 중인 상장 · 행을 접거나 조회 조건을 바꾸면 풀린다
  const [editTarget, setEditTarget] = useState<{ id: string; mode: EditMode } | null>(null);

  const { data: listingsData, isLoading } = useListings({
    companyId: companyId !== ALL_COMPANIES ? companyId : undefined,
    listingDateFrom: range.start,
    listingDateTo: range.end,
    includeParts: true,
  });
  const { data: companiesData } = useCompanies();

  const approveOne = useApproveListing();
  const approveBulk = useApproveListingsBulk();
  const deleteListing = useDeleteListing();
  const updateListing = useUpdateListing();
  const updatePart = useUpdatePart();

  const listings = useMemo(() => (listingsData ?? []).map(toListingView).sort(sortByListingNo), [listingsData]);
  const statusCounts = useMemo(() => countByStatus(listings), [listings]);
  const visible = useMemo(
    () => (statusTab === 'all' ? listings : listings.filter((listing) => listing.status === statusTab)),
    [listings, statusTab],
  );
  const companies = useMemo(() => (companiesData ?? []).map((c) => ({ id: c.id, name: c.name })), [companiesData]);

  // 조회 결과에 없는 선택은 버린다 (기간을 바꿨거나 승인돼서 대기가 아니게 된 것)
  const selectable = useMemo(() => new Set(listings.filter((l) => l.status === '대기').map((l) => l.id)), [listings]);
  const effectiveSelected = useMemo(
    () => new Set([...selectedIds].filter((id) => selectable.has(id))),
    [selectedIds, selectable],
  );

  const isBusy = approveOne.isPending || approveBulk.isPending || deleteListing.isPending || updateListing.isPending || updatePart.isPending;

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
    setEditTarget(null);
  };

  const applyFilter = (nextRange: DateRange, nextCompanyId: string) => {
    setRange(nextRange);
    setCompanyId(nextCompanyId);
    setSelectedIds(new Set());
    setExpandedId(null);
    setEditTarget(null);
  };

  const resetFilter = () => {
    applyFilter(rangeForListingPreset(DEFAULT_LISTING_DATE_PRESET), ALL_COMPANIES);
    setStatusTab('all');
  };

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleSelectAllPending = () => {
    const pendingVisible = visible.filter((l) => l.status === '대기').map((l) => l.id);
    const allSelected = pendingVisible.every((id) => effectiveSelected.has(id));
    setSelectedIds(allSelected ? new Set() : new Set(pendingVisible));
  };

  // ---- 승인 ----

  const requestApprove = (targets: ListingView[]) => {
    const missingPhotos = targets.filter((l) => !hasPhotos(l));
    if (targets.length === 1 && missingPhotos.length === 0) {
      void runApprove(targets);
      return;
    }
    setConfirm({ kind: 'approve', listings: targets });
  };

  const runApprove = async (targets: ListingView[]) => {
    try {
      if (targets.length === 1) {
        setApprovingId(targets[0].id);
        await approveOne.mutateAsync({ id: targets[0].id });
        toast.success(`${targets[0].listingNo} 승인 완료`);
      } else {
        const result = await approveBulk.mutateAsync(targets.map((l) => l.id));
        if (result.skipped > 0) toast.warning(`${result.approved}건 승인, ${result.skipped}건은 대기 상태가 아니어서 건너뛰었습니다.`);
        else toast.success(`${result.approved}건 승인 완료`);
      }
      setSelectedIds(new Set());
    } catch (error) {
      console.error('승인 실패:', error);
      toast.error('승인에 실패했습니다.');
    } finally {
      setApprovingId(null);
      setConfirm(null);
    }
  };

  const runRevert = async (listing: ListingView) => {
    try {
      await updateListing.mutateAsync({ id: listing.id, input: { status: 'pending' } });
      toast.success(`${listing.listingNo} 승인을 취소해 대기로 돌렸습니다.`);
    } catch (error) {
      console.error('승인 취소 실패:', error);
      toast.error('승인 취소에 실패했습니다.');
    } finally {
      setConfirm(null);
    }
  };

  const runDelete = async (listing: ListingView) => {
    try {
      await deleteListing.mutateAsync(listing.id);
      toast.success(`${listing.listingNo} 상장을 삭제했습니다.`);
      if (expandedId === listing.id) setExpandedId(null);
    } catch (error) {
      console.error('삭제 실패:', error);
      toast.error('삭제에 실패했습니다.');
    } finally {
      setConfirm(null);
    }
  };

  const saveAttachments = async (listing: ListingView, { partImages, ...listingUpdates }: AttachmentUpdates) => {
    // null 은 「삭제」 · API 가 undefined 만 건너뛴다
    await updateListing.mutateAsync({ id: listing.id, input: listingUpdates });
    await Promise.all(
      Object.entries(partImages).map(([partId, images]) => updatePart.mutateAsync({ listingId: listing.id, partId, input: { images } })),
    );
    toast.success(`${listing.listingNo} 사진·증명서를 저장했습니다.`);
  };

  const handlePrint = () => {
    if (!printListings(visible, range)) toast.error('팝업이 차단되어 인쇄 창을 열 수 없습니다.');
  };

  const confirmProps = (() => {
    if (!confirm) return null;
    switch (confirm.kind) {
      case 'approve': {
        const missing = confirm.listings.filter((l) => !hasPhotos(l)).length;
        return {
          title: confirm.listings.length === 1 ? `${confirm.listings[0].listingNo} 승인` : `상장 ${confirm.listings.length}건 승인`,
          description: (
            <>
              {missing > 0 && (
                <span className="mb-1 block font-medium text-rose-600">사진이 없는 상장 {missing}건이 포함되어 있습니다.</span>
              )}
              승인하면 중도매인에게 상장 목록으로 공개됩니다. 계속할까요?
            </>
          ),
          confirmLabel: '승인',
          destructive: false,
          isPending: approveOne.isPending || approveBulk.isPending,
          onConfirm: () => void runApprove(confirm.listings),
        };
      }
      case 'revert':
        return {
          title: `${confirm.listing.listingNo} 승인 취소`,
          description: '대기 상태로 되돌립니다. 중도매인 상장 목록에서 내려가며, 다시 승인할 수 있습니다.',
          confirmLabel: '승인 취소',
          destructive: false,
          isPending: updateListing.isPending,
          onConfirm: () => void runRevert(confirm.listing),
        };
      case 'delete':
        return {
          title: `${confirm.listing.listingNo} 삭제`,
          description: '상장과 부위 정보가 모두 삭제되며 되돌릴 수 없습니다.',
          confirmLabel: '삭제',
          destructive: true,
          isPending: deleteListing.isPending,
          onConfirm: () => void runDelete(confirm.listing),
        };
    }
  })();

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-[-0.01em] text-slate-900">부분육 상장 조회</h1>
      </div>

      <ListingFilterBar
        applied={range}
        appliedCompanyId={companyId}
        companies={companies}
        onApply={applyFilter}
        onReset={resetFilter}
        statusTab={statusTab}
        statusCounts={statusCounts}
        totalCount={listings.length}
        onStatusTabChange={(tab) => {
          setStatusTab(tab);
          setExpandedId(null);
          setEditTarget(null);
        }}
        selectedCount={effectiveSelected.size}
        onApproveSelected={() => requestApprove(listings.filter((l) => effectiveSelected.has(l.id)))}
        onExcel={() => downloadListingsExcel(visible)}
        onPrint={handlePrint}
        isApproving={approveBulk.isPending}
      />

      <ListingTable
        listings={visible}
        isLoading={isLoading}
        expandedId={expandedId}
        onToggleExpand={toggleExpand}
        selectedIds={effectiveSelected}
        onToggleSelect={toggleSelect}
        onToggleSelectAllPending={toggleSelectAllPending}
        onApproveOne={(listing) => requestApprove([listing])}
        approvingId={approvingId}
        renderDetail={(listing) => (
          <ListingDetail
            listing={listing}
            editMode={editTarget?.id === listing.id ? editTarget.mode : null}
            onStartEdit={(mode) => setEditTarget({ id: listing.id, mode })}
            onCancelEdit={() => setEditTarget(null)}
            onSaved={() => setEditTarget(null)}
            onSaveAttachments={(updates) => saveAttachments(listing, updates)}
            onRevertApproval={() => setConfirm({ kind: 'revert', listing })}
            onDelete={() => setConfirm({ kind: 'delete', listing })}
            isBusy={isBusy}
          />
        )}
      />

      {confirmProps && (
        <ConfirmDialog
          open
          title={confirmProps.title}
          description={confirmProps.description}
          confirmLabel={confirmProps.confirmLabel}
          destructive={confirmProps.destructive}
          isPending={confirmProps.isPending}
          onConfirm={confirmProps.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </AdminLayout>
  );
}
