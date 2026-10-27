'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Download, FileSpreadsheet, Loader2, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';
import AdminLayout from '@/components/admin/AdminLayout';
import { ADMIN_BUTTON } from '@/components/admin/buttonStyles';
import { AdminDateInput } from '@/components/admin/AdminDateInput';
import { AdminSelect } from '@/components/admin/AdminSelect';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { cn } from '@/lib/utils';
import { useCompanies } from '@/features/companies/hooks';
import { useCreateListing } from '@/features/listings/hooks';
import { usePartGroupImageLookup } from '@/features/part-group-images/hooks/usePartGroupImages';
import { resolveFormPartCover } from '@/features/listings/lib/listingPhotos';
import { isPdfCertificate, partListingNo } from '@/features/listings/lib/listingView';
import {
  countErrors,
  createCattleDraft,
  isCattleDraftDirty,
  MAX_CATTLE_PER_SUBMIT,
  previewAuctionNo,
  toCreateListingInput,
  validateCattleDraft,
  type CattleDraft,
  type DraftErrors,
  type PartDraft,
} from '@/features/listings/lib/listingDraft';
import { downloadListingTemplate, parseListingWorkbook, type ImportResult } from '@/features/listings/lib/listingTemplate';
import { CattleCard } from '@/features/listings/components/admin/new/CattleCard';
import { ImageLightbox, type LightboxItem } from '@/features/listings/components/admin/ImageLightbox';
import { PartPhotoDialog } from '@/features/listings/components/PartPhotoDialog';

/** 개체 id → 틀린 칸 · 비어 있으면 전부 통과 */
type ErrorMap = Record<number, DraftErrors>;

interface LightboxState {
  title: string;
  items: LightboxItem[];
  index: number;
}

/** 메인 사진 + 사진 증명서를 뷰어 순서대로 · PDF 는 뷰어에 못 띄우므로 뺀다 */
const lightboxItemsOf = (cattle: CattleDraft): LightboxItem[] => [
  ...cattle.images.map((src, index) => ({ src, label: index === 0 ? '사진 1 (메인)' : `사진 ${index + 1}`, kind: 'listing' as const })),
  ...(cattle.slaughterCert && !isPdfCertificate(cattle.slaughterCert) ? [{ src: cattle.slaughterCert.fileData, label: '도축검사증명서', kind: 'cert' as const }] : []),
  ...(cattle.gradeCert && !isPdfCertificate(cattle.gradeCert) ? [{ src: cattle.gradeCert.fileData, label: '등급판정확인서', kind: 'cert' as const }] : []),
];

const todayIso = () => format(new Date(), 'yyyy-MM-dd');

export default function NewAuctionPage() {
  const { data: companiesData } = useCompanies();
  const companies = useMemo(() => (companiesData ?? []).map((c) => ({ id: c.id, name: c.name, companyNo: c.companyNo })), [companiesData]);
  const companyOptions = useMemo(() => companies.map((c) => ({ value: c.id, label: c.name })), [companies]);
  const createListing = useCreateListing();
  const groupImage = usePartGroupImageLookup();

  const [listingDate, setListingDate] = useState(todayIso);
  const [companyId, setCompanyId] = useState('');
  const [isDateClosed, setIsDateClosed] = useState(false);
  const [startSeq, setStartSeq] = useState(1);
  const [cattleList, setCattleList] = useState<CattleDraft[]>(() => [createCattleDraft(1, '1')]);
  const [errors, setErrors] = useState<ErrorMap>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoTarget, setPhotoTarget] = useState<{ cattleId: number; partId: number } | null>(null);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const [pendingImport, setPendingImport] = useState<ImportResult | null>(null);
  /** 새 개체 id · 지운 뒤 다시 추가해도 겹치지 않게 늘기만 한다 */
  const nextIdRef = useRef(2);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const selectedCompany = companies.find((c) => c.id === companyId);
  const auctionNoOf = (cattle: CattleDraft) => previewAuctionNo(listingDate, selectedCompany?.companyNo, cattle.seqNo);

  // ---- 상장일 마감 여부 ----
  useEffect(() => {
    if (!listingDate) {
      setIsDateClosed(false);
      return;
    }
    let cancelled = false;
    fetch(`/api/auctions/check-closed?date=${listingDate}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => !cancelled && setIsDateClosed(Boolean(data?.isClosed)))
      .catch((error) => {
        console.error('마감 여부 확인 실패:', error);
        if (!cancelled) setIsDateClosed(false);
      });
    return () => {
      cancelled = true;
    };
  }, [listingDate]);

  // ---- 다음 순번 ----
  const fetchNextSeq = useCallback(async () => {
    if (!companyId || !listingDate) {
      setStartSeq(1);
      return;
    }
    try {
      const response = await fetch(`/api/listings/next-seq?companyId=${companyId}&listingDate=${listingDate}`);
      if (!response.ok) return;
      const data = await response.json();
      // nextSeq 에서 업체번호 접두를 뺀 순번만 (203 → 3)
      setStartSeq(data.nextSeq - parseInt(`${data.companyNoPrefix}00`, 10));
    } catch (error) {
      console.error('다음 순번 조회 실패:', error);
    }
  }, [companyId, listingDate]);

  useEffect(() => {
    void fetchNextSeq();
  }, [fetchNextSeq]);

  // 순번은 늘 「시작 순번 + 자리」 · 개체를 지우거나 등록해 자리가 바뀌면 따라간다
  useEffect(() => {
    setCattleList((prev) => prev.map((cattle, index) => ({ ...cattle, seqNo: String(startSeq + index) })));
  }, [startSeq]);

  // 틀렸다고 표시한 개체는 고칠 때마다 다시 검사해 바로 풀어 준다
  useEffect(() => {
    setErrors((prev) => {
      const ids = Object.keys(prev).map(Number);
      if (ids.length === 0) return prev;
      return Object.fromEntries(
        cattleList
          .filter((cattle) => ids.includes(cattle.id))
          .map((cattle) => [cattle.id, validateCattleDraft(cattle)] as const)
          .filter(([, draftErrors]) => countErrors(draftErrors) > 0),
      );
    });
  }, [cattleList]);

  // ---- 개체 목록 ----
  const patchCattle = (id: number, patch: Partial<CattleDraft>) =>
    setCattleList((prev) => prev.map((cattle) => (cattle.id === id ? { ...cattle, ...patch } : cattle)));

  const patchPart = (cattleId: number, partId: number, patch: Partial<PartDraft>) =>
    setCattleList((prev) =>
      prev.map((cattle) =>
        cattle.id === cattleId ? { ...cattle, parts: cattle.parts.map((part) => (part.id === partId ? { ...part, ...patch } : part)) } : cattle,
      ),
    );

  const addCattle = () => {
    if (cattleList.length >= MAX_CATTLE_PER_SUBMIT) {
      toast.warning(`한 번에 ${MAX_CATTLE_PER_SUBMIT}두까지 등록할 수 있습니다.`);
      return;
    }
    const id = nextIdRef.current++;
    setCattleList((prev) => [...prev, createCattleDraft(id, String(startSeq + prev.length))]);
  };

  const removeCattle = (id: number) => {
    setCattleList((prev) => prev.filter((cattle) => cattle.id !== id).map((cattle, index) => ({ ...cattle, seqNo: String(startSeq + index) })));
    if (photoTarget?.cattleId === id) setPhotoTarget(null);
  };

  const replaceCattleList = (drafts: CattleDraft[]) => {
    const renumbered = drafts.map((draft, index) => ({ ...draft, id: nextIdRef.current + index, seqNo: String(startSeq + index) }));
    nextIdRef.current += drafts.length;
    setCattleList(renumbered);
    setErrors({});
    setPhotoTarget(null);
  };

  // ---- 엑셀 ----
  const handleExcelFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      setPendingImport(await parseListingWorkbook(file));
    } catch (error) {
      console.error('엑셀 읽기 실패:', error);
      toast.error(error instanceof Error ? error.message : '엑셀 파일을 읽는 중 오류가 났습니다.');
    }
  };

  const applyImport = () => {
    if (!pendingImport) return;
    replaceCattleList(pendingImport.drafts);
    toast.success(`${pendingImport.drafts.length}두를 불러왔습니다.`);
    setPendingImport(null);
  };

  // ---- 등록 ----
  const handleSubmit = async () => {
    if (!companyId) {
      toast.error('상장업체를 선택해 주세요.');
      return;
    }
    if (isDateClosed) {
      toast.error('마감된 날짜에는 등록할 수 없습니다.');
      return;
    }

    const nextErrors: ErrorMap = Object.fromEntries(
      cattleList.map((cattle) => [cattle.id, validateCattleDraft(cattle)] as const).filter(([, draftErrors]) => countErrors(draftErrors) > 0),
    );
    const invalid = cattleList.filter((cattle) => nextErrors[cattle.id]);
    if (invalid.length > 0) {
      setErrors(nextErrors);
      setCattleList((prev) => prev.map((cattle) => (nextErrors[cattle.id] ? { ...cattle, isExpanded: true } : cattle)));
      toast.error('미입력 항목이 있어 등록하지 않았습니다.', {
        description: invalid.map((cattle) => `${cattleList.indexOf(cattle) + 1}번 개체 ${countErrors(nextErrors[cattle.id])}곳`).join(' · '),
      });
      document.getElementById(`cattle-${invalid[0].id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    setIsSubmitting(true);
    const failedIds: number[] = [];
    // 한 두씩 등록 · 중간에 실패해도 나머지는 계속 가고, 끝나면 실패한 개체만 남긴다
    for (const cattle of cattleList) {
      try {
        await createListing.mutateAsync(toCreateListingInput(cattle, listingDate, companyId));
      } catch (error) {
        console.error('상장 등록 실패:', error);
        failedIds.push(cattle.id);
      }
    }

    const succeeded = cattleList.length - failedIds.length;
    if (failedIds.length === 0) {
      toast.success(`${succeeded}두 상장 등록을 완료했습니다.`);
      replaceCattleList([createCattleDraft(0, '1')]);
    } else {
      setCattleList((prev) => prev.filter((cattle) => failedIds.includes(cattle.id)));
      toast.error(`${succeeded}두 등록, ${failedIds.length}두 실패`, {
        description: '실패한 개체만 남겼습니다. 내용을 확인한 뒤 다시 등록해 주세요.',
        duration: 8000,
      });
    }
    await fetchNextSeq();
    setIsSubmitting(false);
  };

  // ---- 사진 ----
  const openLightbox = (cattle: CattleDraft, src: string) => {
    const items = lightboxItemsOf(cattle);
    const title = `${cattleList.indexOf(cattle) + 1}번 개체 · 접수번호 ${auctionNoOf(cattle)}`;
    setLightbox({ title, items, index: Math.max(0, items.findIndex((item) => item.src === src)) });
  };

  const photoCattle = photoTarget ? cattleList.find((c) => c.id === photoTarget.cattleId) ?? null : null;
  const photoPart = photoCattle && photoTarget ? photoCattle.parts.find((p) => p.id === photoTarget.partId) ?? null : null;
  // ←/→ 는 상장에 포함된 부위 사이에서만 돈다
  const photoSiblings = photoCattle ? photoCattle.parts.filter((p) => p.isIncluded) : [];
  const photoAt = photoPart ? photoSiblings.findIndex((p) => p.id === photoPart.id) : -1;
  const photoPrev = photoAt > 0 ? photoSiblings[photoAt - 1] : null;
  const photoNext = photoAt >= 0 && photoAt < photoSiblings.length - 1 ? photoSiblings[photoAt + 1] : null;

  const dirtyCount = cattleList.filter(isCattleDraftDirty).length;
  const canSubmit = !isSubmitting && !isDateClosed;

  return (
    <AdminLayout>
      <div className="mb-6 flex items-end justify-between">
        <h1 className="text-[22px] font-bold tracking-[-0.01em] text-slate-900">부분육 상장 등록</h1>
        <span className="text-[13px] tabular-nums text-slate-500">
          <span className="font-semibold text-slate-900">{cattleList.length}두</span> / 최대 {MAX_CATTLE_PER_SUBMIT}두
        </span>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-slate-500">상장일자</span>
            <AdminDateInput aria-label="상장일자" value={listingDate} onChange={setListingDate} className={cn(isDateClosed && 'border-rose-500 text-rose-600')} />
            {isDateClosed && <span className="text-[12px] font-medium text-rose-600">마감된 날짜입니다</span>}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-slate-500">상장업체</span>
            <AdminSelect aria-label="상장업체" value={companyId} onChange={setCompanyId} options={companyOptions} placeholder="업체 선택" className="w-[170px]" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={downloadListingTemplate} className={ADMIN_BUTTON.secondary}>
            <Download className="h-3.5 w-3.5" />
            템플릿 다운로드
          </button>
          <input ref={excelInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(event) => void handleExcelFile(event)} />
          <button type="button" onClick={() => excelInputRef.current?.click()} disabled={isSubmitting} className={ADMIN_BUTTON.secondary}>
            <FileSpreadsheet className="h-3.5 w-3.5" />
            엑셀 업로드
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            title={isDateClosed ? '마감된 날짜에는 등록할 수 없습니다' : undefined}
            className={cn(ADMIN_BUTTON.primary, 'min-w-[132px]')}
          >
            {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {isSubmitting ? '등록 중…' : isDateClosed ? '마감됨' : `${cattleList.length}두 일괄 등록`}
          </button>
        </div>
      </div>

      {cattleList.map((cattle, index) => (
        <CattleCard
          key={cattle.id}
          index={index}
          cattle={cattle}
          auctionNo={auctionNoOf(cattle)}
          companyId={companyId || null}
          errors={errors[cattle.id]}
          canRemove={cattleList.length > 1}
          disabled={isSubmitting}
          onPatch={(patch) => patchCattle(cattle.id, patch)}
          onPatchPart={(partId, patch) => patchPart(cattle.id, partId, patch)}
          onToggleExpand={() => patchCattle(cattle.id, { isExpanded: !cattle.isExpanded })}
          onRemove={() => removeCattle(cattle.id)}
          onOpenPartPhotos={(partId) => setPhotoTarget({ cattleId: cattle.id, partId })}
          onView={(src) => openLightbox(cattle, src)}
        />
      ))}

      {cattleList.length < MAX_CATTLE_PER_SUBMIT && (
        <button
          type="button"
          onClick={addCattle}
          disabled={isSubmitting}
          className="mb-4 flex h-11 w-full items-center justify-center gap-2 rounded-[2px] border border-dashed border-slate-300 text-[13px] font-medium text-slate-500 transition-colors hover:border-slate-900 hover:text-slate-900 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          개체 추가
        </button>
      )}

      {photoCattle && photoPart && (
        <PartPhotoDialog
          open
          partName={photoPart.name}
          listingPartNo={partListingNo(auctionNoOf(photoCattle), photoPart.id)}
          images={photoPart.images}
          fallback={resolveFormPartCover({ partImages: [], listingImages: photoCattle.images, companyId: companyId || null, partName: photoPart.name, lookup: groupImage })}
          onChange={(images) => patchPart(photoCattle.id, photoPart.id, { images })}
          onView={(src) => {
            const items = photoPart.images.map((s, i) => ({ src: s, label: `${photoPart.name} ${i + 1}/${photoPart.images.length}`, kind: 'part' as const }));
            setLightbox({ title: `${photoPart.name} · ${partListingNo(auctionNoOf(photoCattle), photoPart.id)}`, items, index: Math.max(0, items.findIndex((item) => item.src === src)) });
          }}
          onPrev={photoPrev ? () => setPhotoTarget({ cattleId: photoCattle.id, partId: photoPrev.id }) : undefined}
          onNext={photoNext ? () => setPhotoTarget({ cattleId: photoCattle.id, partId: photoNext.id }) : undefined}
          onClose={() => setPhotoTarget(null)}
        />
      )}

      {lightbox && (
        <ImageLightbox
          title={lightbox.title}
          items={lightbox.items}
          index={lightbox.index}
          onIndexChange={(index) => setLightbox((prev) => (prev ? { ...prev, index } : prev))}
          onClose={() => setLightbox(null)}
        />
      )}

      {pendingImport && (
        <ConfirmDialog
          open
          title={`엑셀에서 ${pendingImport.drafts.length}두 불러오기`}
          description={
            <>
              {dirtyCount > 0 ? (
                <span className="mb-1 block font-medium text-rose-600">지금 입력 중인 {dirtyCount}두의 내용이 모두 대체됩니다.</span>
              ) : (
                <span className="mb-1 block">현재 비어 있는 개체는 불러온 내용으로 대체됩니다.</span>
              )}
              {pendingImport.warnings.length > 0 && (
                <ul className="mt-2 max-h-40 list-disc space-y-0.5 overflow-y-auto pl-4 text-[12px] text-slate-600">
                  {pendingImport.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              )}
            </>
          }
          confirmLabel="불러오기"
          destructive={dirtyCount > 0}
          onConfirm={applyImport}
          onCancel={() => setPendingImport(null)}
        />
      )}
    </AdminLayout>
  );
}
