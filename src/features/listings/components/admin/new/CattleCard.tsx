'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ADMIN_BUTTON, ADMIN_INPUT, ADMIN_NUMBER_INPUT } from '@/components/admin/buttonStyles';
import { AdminDateInput } from '@/components/admin/AdminDateInput';
import { AdminSelect } from '@/components/admin/AdminSelect';
import { cn } from '@/lib/utils';
import { SLAUGHTER_HOUSE_OPTIONS } from '@/constants/slaughterHouses';
import { usePartGroupImageLookup } from '@/features/part-group-images/hooks/usePartGroupImages';
import { MAX_LISTING_PHOTOS, resolveFormPartCover } from '../../../lib/listingPhotos';
import { partListingNo, splitPartsIntoColumns } from '../../../lib/listingView';
import {
  BREED_OPTIONS,
  countErrors,
  formatTraceNo,
  GENDER_OPTIONS,
  GRADE_OPTIONS,
  isPremiumGrade,
  MARBLING_OPTIONS,
  onlyDigits,
  TRACE_NO_PREFIX,
  withCommas,
  type CattleDraft,
  type DraftErrors,
  type PartDraft,
} from '../../../lib/listingDraft';
import { CERT_KINDS, CertificateField, PhotoStrip, uploadPhotosInto } from '../AttachmentFields';
import {
  PARTS_BLOCK,
  PARTS_BODY_ROW,
  PARTS_CELL,
  PARTS_CELL_INPUT,
  PARTS_CELL_INPUT_WRAP,
  PARTS_GRID,
  PARTS_HEAD_CELL,
  PARTS_HEAD_ROW,
  PartPhotoCell,
} from '../PartsTable';

interface CattleCardProps {
  index: number;
  cattle: CattleDraft;
  /** 접수번호 미리보기 · 업체를 고르기 전엔 '-' */
  auctionNo: string;
  companyId: string | null;
  errors: DraftErrors | undefined;
  canRemove: boolean;
  disabled: boolean;
  onPatch: (patch: Partial<CattleDraft>) => void;
  onPatchPart: (partId: number, patch: Partial<PartDraft>) => void;
  onToggleExpand: () => void;
  onRemove: () => void;
  onOpenPartPhotos: (partId: number) => void;
  onView: (src: string) => void;
}

/** 글자 그대로 들고 있는 개체 칸 · 입력칸 하나가 칸 하나를 바꾼다 */
type TextField = {
  [K in keyof CattleDraft]: CattleDraft[K] extends string ? K : never;
}[keyof CattleDraft];

/** 틀린 칸 · 테두리와 바탕을 붉게, 사유는 `title` 로 */
const ERROR_INPUT = 'border-rose-500 bg-rose-50/40 hover:border-rose-500 focus:border-rose-500 data-[state=open]:border-rose-500';
const inputClass = (hasError: boolean, base: string = ADMIN_NUMBER_INPUT) => cn(base, 'w-full', hasError && ERROR_INPUT);
const GRID_CELL = cn(PARTS_CELL, 'px-2');

function Field({ label, error, className, children }: { label: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn('flex min-w-0 flex-col gap-1', className)} title={error}>
      <span className={cn('truncate text-[12px] font-medium', error ? 'text-rose-600' : 'text-slate-500')}>{label}</span>
      {children}
    </label>
  );
}

/**
 * 개체 한 두 · 접히는 카드.
 * 머리줄에 요약(성별·등급·이력번호·접수번호·부위 수·미입력 수), 펼치면 개체 정보 격자 → 부위 7×3 → 첨부.
 * 조회 화면의 수정 폼(`ListingEditForm`)과 같은 격자·입력칸을 써서 등록과 수정이 한 모양이다.
 */
export function CattleCard({
  index,
  cattle,
  auctionNo,
  companyId,
  errors,
  canRemove,
  disabled,
  onPatch,
  onPatchPart,
  onToggleExpand,
  onRemove,
  onOpenPartPhotos,
  onView,
}: CattleCardProps) {
  const [pendingPhotos, setPendingPhotos] = useState(0);
  const groupImage = usePartGroupImageLookup();
  const partColumns = useMemo(() => splitPartsIntoColumns(cattle.parts), [cattle.parts]);

  const errorCount = countErrors(errors);
  const errorOf = (path: string) => errors?.[path];
  const includedCount = cattle.parts.filter((part) => part.isIncluded).length;
  const isPremium = isPremiumGrade(cattle.grade);
  // 업체를 고르기 전엔 접수번호가 없어 상장번호도 못 만든다
  const hasAuctionNo = auctionNo !== '-';

  const setValue = (key: TextField) => (value: string) => onPatch({ [key]: value } as Partial<CattleDraft>);
  const setText = (key: TextField) => (event: React.ChangeEvent<HTMLInputElement>) => setValue(key)(event.target.value);

  const handlePhotoFiles = (files: File[]) =>
    uploadPhotosInto(files, cattle.images, MAX_LISTING_PHOTOS, setPendingPhotos, (urls) =>
      onPatch({ images: [...cattle.images, ...urls].slice(0, MAX_LISTING_PHOTOS) }),
    );

  const coverOf = (part: PartDraft) =>
    resolveFormPartCover({ partImages: part.images, listingImages: cattle.images, companyId, partName: part.name, lookup: groupImage });

  const summary = [
    cattle.breed || '축종',
    cattle.gender || '성별',
    `${cattle.grade || '등급'}${cattle.marbling ? `(${cattle.marbling})` : ''}`,
    cattle.traceNo ? `${TRACE_NO_PREFIX}${cattle.traceNo}` : '이력번호',
  ].join(' · ');

  return (
    <section id={`cattle-${cattle.id}`} className={cn('mb-3 rounded-[2px] border bg-white', errorCount > 0 ? 'border-rose-300' : 'border-slate-200')}>
      <header
        className={cn('flex h-11 cursor-pointer select-none items-center justify-between gap-4 px-4', cattle.isExpanded && 'border-b border-slate-200')}
        onClick={onToggleExpand}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[2px] bg-slate-900 text-[12px] font-semibold text-white">{index + 1}</span>
          <span className="truncate text-[13px] font-semibold text-slate-900">{summary}</span>
          <span className="shrink-0 text-[12px] tabular-nums text-slate-500">
            접수번호 <span className="font-medium text-slate-700">{auctionNo}</span>
          </span>
          <span className="shrink-0 text-[12px] tabular-nums text-slate-500">
            부위 <span className="font-medium text-slate-700">{includedCount}</span>/{cattle.parts.length}
          </span>
          {errorCount > 0 && (
            <span className="shrink-0 rounded-[2px] bg-rose-50 px-1.5 py-0.5 text-[11px] font-medium text-rose-600">
              {errorOf('parts') ?? `미입력 ${errorCount}곳`}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2" onClick={(event) => event.stopPropagation()}>
          {canRemove && (
            <button type="button" onClick={onRemove} disabled={disabled} className={cn(ADMIN_BUTTON.small, 'hover:border-rose-600 hover:text-rose-600')}>
              <Trash2 className="h-3 w-3" />
              삭제
            </button>
          )}
          <button type="button" onClick={onToggleExpand} title={cattle.isExpanded ? '접기' : '펼치기'} className="flex h-6 w-6 items-center justify-center text-slate-400 hover:text-slate-900">
            {cattle.isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {cattle.isExpanded && (
        <div className="space-y-4 px-4 py-4">
          {/* 개체 정보 · 조회 표와 같은 순서(개월령 → 근내지방 → 육색 → 지방색 → 조직감 → 성숙도 → 등지방 → 등심면적) */}
          <div className="grid grid-cols-12 gap-x-3 gap-y-3">
            <Field label="축종" error={errorOf('breed')}>
              <AdminSelect aria-label="축종" value={cattle.breed} onChange={setValue('breed')} options={BREED_OPTIONS} disabled={disabled} className={inputClass(!!errorOf('breed'), '')} />
            </Field>
            <Field label="성별" error={errorOf('gender')}>
              <AdminSelect aria-label="성별" value={cattle.gender} onChange={setValue('gender')} options={GENDER_OPTIONS} placeholder="선택" disabled={disabled} className={inputClass(!!errorOf('gender'), '')} />
            </Field>
            <Field label="등급" error={errorOf('grade')}>
              <AdminSelect
                aria-label="등급"
                value={cattle.grade}
                onChange={(grade) => onPatch({ grade, marbling: isPremiumGrade(grade) ? cattle.marbling : '' })}
                options={GRADE_OPTIONS}
                placeholder="선택"
                disabled={disabled}
                className={inputClass(!!errorOf('grade'), '')}
              />
            </Field>
            <Field label="1++ 세부">
              <AdminSelect aria-label="1++ 세부" value={cattle.marbling} onChange={setValue('marbling')} options={MARBLING_OPTIONS} placeholder="-" disabled={disabled || !isPremium} className="w-full" />
            </Field>
            <Field label="개월령" error={errorOf('monthAge')}>
              <input type="number" value={cattle.monthAge} onChange={setText('monthAge')} disabled={disabled} className={inputClass(!!errorOf('monthAge'))} />
            </Field>
            <Field label="근내지방" error={errorOf('fatMarbling')}>
              <input type="number" value={cattle.fatMarbling} onChange={setText('fatMarbling')} disabled={disabled} className={inputClass(!!errorOf('fatMarbling'))} />
            </Field>
            <Field label="육색" error={errorOf('meatColor')}>
              <input type="number" value={cattle.meatColor} onChange={setText('meatColor')} disabled={disabled} className={inputClass(!!errorOf('meatColor'))} />
            </Field>
            <Field label="지방색" error={errorOf('fatColor')}>
              <input type="number" value={cattle.fatColor} onChange={setText('fatColor')} disabled={disabled} className={inputClass(!!errorOf('fatColor'))} />
            </Field>
            <Field label="조직감" error={errorOf('texture')}>
              <input type="number" value={cattle.texture} onChange={setText('texture')} disabled={disabled} className={inputClass(!!errorOf('texture'))} />
            </Field>
            <Field label="성숙도" error={errorOf('maturity')}>
              <input type="number" value={cattle.maturity} onChange={setText('maturity')} disabled={disabled} className={inputClass(!!errorOf('maturity'))} />
            </Field>
            <Field label="등지방" error={errorOf('backFat')}>
              <input type="number" step="0.1" value={cattle.backFat} onChange={setText('backFat')} disabled={disabled} className={inputClass(!!errorOf('backFat'))} />
            </Field>
            <Field label="등심면적" error={errorOf('eyeMuscle')}>
              <input type="number" step="0.1" value={cattle.eyeMuscle} onChange={setText('eyeMuscle')} disabled={disabled} className={inputClass(!!errorOf('eyeMuscle'))} />
            </Field>

            <Field label="이력번호" error={errorOf('traceNo')} className="col-span-3">
              <div className="flex items-center">
                <span className={cn(ADMIN_INPUT, 'flex w-12 shrink-0 items-center rounded-r-none border-r-0 bg-slate-50 text-slate-500')}>{TRACE_NO_PREFIX}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={cattle.traceNo}
                  onChange={(event) => onPatch({ traceNo: formatTraceNo(event.target.value) })}
                  placeholder="0000-0000-0"
                  maxLength={11}
                  disabled={disabled}
                  className={cn(inputClass(!!errorOf('traceNo'), ADMIN_INPUT), 'rounded-l-none tabular-nums placeholder:text-slate-300')}
                />
              </div>
            </Field>
            <Field label="도축장" error={errorOf('slaughterHouse')} className="col-span-2">
              <AdminSelect aria-label="도축장" value={cattle.slaughterHouse} onChange={setValue('slaughterHouse')} options={SLAUGHTER_HOUSE_OPTIONS} disabled={disabled} className={inputClass(!!errorOf('slaughterHouse'), '')} />
            </Field>
            <Field label="도축일" error={errorOf('slaughterDate')}>
              <AdminDateInput aria-label="도축일" value={cattle.slaughterDate} onChange={setValue('slaughterDate')} disabled={disabled} className={inputClass(!!errorOf('slaughterDate'), '')} />
            </Field>
            <Field label="도축번호" error={errorOf('slaughterNo')}>
              <input type="text" inputMode="numeric" value={cattle.slaughterNo} onChange={setText('slaughterNo')} disabled={disabled} className={inputClass(!!errorOf('slaughterNo'), ADMIN_INPUT)} />
            </Field>
            <Field label="도체중 (kg)" error={errorOf('carcassWeight')}>
              <input type="number" step="0.1" value={cattle.carcassWeight} onChange={setText('carcassWeight')} disabled={disabled} className={inputClass(!!errorOf('carcassWeight'))} />
            </Field>
            <Field label="가공일" error={errorOf('processDate')}>
              <AdminDateInput aria-label="가공일" value={cattle.processDate} onChange={setValue('processDate')} min={cattle.slaughterDate || undefined} disabled={disabled} className={inputClass(!!errorOf('processDate'), '')} />
            </Field>
            <Field label="가공중량 (kg)" error={errorOf('processWeight')}>
              <input type="number" step="0.1" value={cattle.processWeight} onChange={setText('processWeight')} disabled={disabled} className={inputClass(!!errorOf('processWeight'))} />
            </Field>
            <Field label="경락단가 (원/kg)" className="col-span-2">
              <input
                type="text"
                inputMode="numeric"
                value={withCommas(cattle.unitPrice)}
                onChange={(event) => onPatch({ unitPrice: onlyDigits(event.target.value) })}
                disabled={disabled}
                className={cn(ADMIN_INPUT, 'w-full text-right tabular-nums')}
              />
            </Field>
          </div>

          {/* 부위 7×3 · 열 단위 표라 Tab 이 위에서 아래로 흐른다 */}
          <div className={PARTS_GRID}>
            {partColumns.map((columnParts, columnIndex) => (
              <table key={columnIndex} className={PARTS_BLOCK}>
                <colgroup>
                  <col className="w-8" />
                  <col className="w-[96px]" />
                  <col className="w-9" />
                  <col />
                  <col className="w-[68px]" />
                  <col className="w-[88px]" />
                </colgroup>
                <thead>
                  <tr className={PARTS_HEAD_ROW}>
                    <th scope="col" className={cn(PARTS_HEAD_CELL, 'px-2 text-center')}>상장</th>
                    <th scope="col" className={cn(PARTS_HEAD_CELL, 'px-2 text-left')}>상장번호</th>
                    <th scope="col" className={cn(PARTS_HEAD_CELL, 'px-2 text-center')}>사진</th>
                    <th scope="col" className={cn(PARTS_HEAD_CELL, 'px-2 text-left')}>부위</th>
                    <th scope="col" className={cn(PARTS_HEAD_CELL, 'px-2 text-right')}>중량 (kg)</th>
                    <th scope="col" className={cn(PARTS_HEAD_CELL, 'px-2 text-right')}>최저가 (원/kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {columnParts.map((part) => {
                    const included = part.isIncluded;
                    const partIndex = part.id - 1;
                    const weightError = errorOf(`parts.${partIndex}.weight`);
                    const priceError = errorOf(`parts.${partIndex}.minPrice`);
                    return (
                      <tr key={part.id} className={cn(PARTS_BODY_ROW, !included && 'bg-slate-50/60 text-slate-400')}>
                        <td className={cn(GRID_CELL, 'text-center')}>
                          <Checkbox
                            aria-label={`${part.name} 상장 포함`}
                            checked={included}
                            disabled={disabled}
                            onCheckedChange={(checked) => onPatchPart(part.id, { isIncluded: checked === true })}
                            className="h-4 w-4 rounded-[2px] border-slate-300 align-middle data-[state=checked]:border-slate-900 data-[state=checked]:bg-slate-900"
                          />
                        </td>
                        <td className={cn(GRID_CELL, 'text-[11px] text-slate-400')}>{included && hasAuctionNo ? partListingNo(auctionNo, part.id) : '—'}</td>
                        <td className={cn(GRID_CELL, 'px-1')}>
                          <span className="flex justify-center">
                            <PartPhotoCell
                              partName={part.name}
                              count={part.images.length}
                              cover={coverOf(part)}
                              onOpen={included && !disabled ? () => onOpenPartPhotos(part.id) : undefined}
                              allowEmptyOpen
                            />
                          </span>
                        </td>
                        <td className={cn(GRID_CELL, included && 'font-medium text-slate-900')}>{part.name}</td>
                        <td className={cn(PARTS_CELL, PARTS_CELL_INPUT_WRAP)} title={weightError}>
                          {included ? (
                            <input
                              type="number"
                              step="0.1"
                              value={part.weight}
                              disabled={disabled}
                              onChange={(event) => onPatchPart(part.id, { weight: event.target.value })}
                              className={cn(PARTS_CELL_INPUT, weightError && ERROR_INPUT)}
                            />
                          ) : (
                            <span className="px-1.5">—</span>
                          )}
                        </td>
                        <td className={cn(PARTS_CELL, PARTS_CELL_INPUT_WRAP)} title={priceError}>
                          {included ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              value={withCommas(part.minPrice)}
                              disabled={disabled}
                              onChange={(event) => onPatchPart(part.id, { minPrice: onlyDigits(event.target.value) })}
                              className={cn(PARTS_CELL_INPUT, priceError && ERROR_INPUT)}
                            />
                          ) : (
                            <span className="px-1.5">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ))}
          </div>

          {/* 첨부 · 첨부 편집기와 같은 한 줄 */}
          <div className="flex items-start gap-8 border-t border-slate-100 pt-4">
            <section>
              <h4 className="mb-2 text-[12px] font-medium text-slate-500">
                메인 사진 <span className="tabular-nums text-slate-400">{cattle.images.length}/{MAX_LISTING_PHOTOS}</span>
                <span className="ml-2 font-normal text-slate-400">첫 장이 중도매인 화면의 메인 사진 · 별을 누르면 맨 앞으로</span>
              </h4>
              <PhotoStrip
                images={cattle.images}
                max={MAX_LISTING_PHOTOS}
                pending={pendingPhotos}
                disabled={disabled || pendingPhotos > 0}
                size="lg"
                coverBadge="메인"
                coverTitle="메인 사진으로"
                addTitle="사진 추가"
                onChange={(images) => onPatch({ images })}
                onFiles={(files) => void handlePhotoFiles(files)}
                onView={onView}
                editable
                editTitle="메인 사진"
              />
            </section>

            <div className="mt-6 h-16 w-px bg-slate-200" aria-hidden />

            {CERT_KINDS.map((kind) => (
              <CertificateField key={kind} kind={kind} cert={cattle[kind]} disabled={disabled} onChange={(cert) => onPatch({ [kind]: cert } as Partial<CattleDraft>)} onView={onView} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
