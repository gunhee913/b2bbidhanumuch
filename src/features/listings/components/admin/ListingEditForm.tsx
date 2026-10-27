'use client';

import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { ADMIN_BUTTON, ADMIN_INPUT, ADMIN_NUMBER_INPUT } from '@/components/admin/buttonStyles';
import { AdminDateInput } from '@/components/admin/AdminDateInput';
import { AdminSelect } from '@/components/admin/AdminSelect';
import { cn } from '@/lib/utils';
import { verifySecondaryPassword } from '@/features/admins/api';
import { useUpdateListing, useUpdatePart } from '../../hooks';
import { BREEDS } from '../../lib/listingDraft';
import { shortDateToIso, splitPartsIntoColumns, type ListingView, type PartView } from '../../lib/listingView';
import {
  formatKg,
  PARTS_BLOCK,
  PARTS_BODY_ROW,
  PARTS_CELL,
  PARTS_CELL_INPUT,
  PARTS_CELL_INPUT_WRAP,
  PARTS_GRID,
  PARTS_HEAD_CELL,
  PARTS_HEAD_ROW,
  partNoLabel,
} from './PartsTable';

export type EditMode = 'full' | 'minPrice';

interface ListingEditFormProps {
  listing: ListingView;
  mode: EditMode;
  onCancel: () => void;
  onSaved: () => void;
}

interface FormState {
  breed: string;
  gender: string;
  grade: string;
  monthAge: string;
  backFat: string;
  eyeMuscle: string;
  marblingScore: string;
  meatColor: string;
  fatColor: string;
  texture: string;
  maturity: string;
  traceNo: string;
  slaughterDate: string;
  slaughterNo: string;
  carcassWeight: string;
  processDate: string;
  processWeight: string;
}

interface PartDraft {
  weight: string;
  minPrice: string;
  isIncluded: boolean;
}

const toOptions = (values: readonly string[]) => values.map((value) => ({ value, label: value }));
const BREED_OPTIONS = toOptions(BREEDS);
const GENDER_OPTIONS = toOptions(['거세', '암']);
const GRADE_OPTIONS = toOptions(['1++A', '1++B', '1++C', '1+A', '1+B', '1+C', '1A', '1B', '1C', '2A', '2B', '2C']);

/** '1++A(9)' → '1++A' · 선택 상자 값으로 쓰려고 괄호를 뗀다 */
const bareGrade = (grade: string) => grade.replace(/\(.*\)$/, '');

const toForm = (listing: ListingView): FormState => ({
  breed: listing.breed,
  gender: listing.gender,
  grade: bareGrade(listing.grade),
  monthAge: String(listing.monthAge || ''),
  backFat: String(listing.backFat || ''),
  eyeMuscle: String(listing.eyeMuscle || ''),
  marblingScore: String(listing.marblingScore || ''),
  meatColor: String(listing.meatColor || ''),
  fatColor: String(listing.fatColor || ''),
  texture: String(listing.texture || ''),
  maturity: String(listing.maturity || ''),
  traceNo: listing.traceNo,
  slaughterDate: shortDateToIso(listing.slaughterDate) ?? '',
  slaughterNo: listing.slaughterNo,
  carcassWeight: String(listing.carcassWeight || ''),
  processDate: shortDateToIso(listing.processDate) ?? '',
  processWeight: String(listing.processWeight || ''),
});

const toPartDrafts = (parts: PartView[]): Record<string, PartDraft> =>
  Object.fromEntries(parts.map((part) => [part.id, { weight: formatKg(part.weight), minPrice: String(part.minPrice), isIncluded: part.isIncluded }]));

const numOrNull = (value: string, parse: (v: string) => number = parseFloat) => {
  const parsed = parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

/** 최저가 입력은 숫자만 받고, 보여 줄 때만 천 단위 쉼표를 붙인다 */
const onlyDigits = (value: string) => value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
const withCommas = (digits: string) => (digits ? Number(digits).toLocaleString('ko-KR') : '');

const COMPACT_INPUT = ADMIN_INPUT;
const COMPACT_NUMBER_INPUT = ADMIN_NUMBER_INPUT;
const CELL_INPUT = PARTS_CELL_INPUT;
const CELL_INPUT_WRAP = PARTS_CELL_INPUT_WRAP;

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('flex flex-col gap-1', className)}>
      <span className="text-[12px] font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}

/** 펼친 행 안에서 바로 고치는 수정 폼 · 개체 정보 한 줄 + 부위 7×3, 저장 전에 2차 비밀번호 */
export function ListingEditForm({ listing, mode, onCancel, onSaved }: ListingEditFormProps) {
  const updateListing = useUpdateListing();
  const updatePart = useUpdatePart();

  const [form, setForm] = useState<FormState>(() => toForm(listing));
  const [partDrafts, setPartDrafts] = useState<Record<string, PartDraft>>(() => toPartDrafts(listing.parts));
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isMinPriceOnly = mode === 'minPrice';
  const partColumns = useMemo(() => splitPartsIntoColumns(listing.parts), [listing.parts]);

  const changedParts = useMemo(
    () =>
      listing.parts.filter((part) => {
        const draft = partDrafts[part.id];
        if (!draft) return false;
        // 중량은 「25」와 「25.0」이 같은 값이라 숫자로 견준다
        return numOrNull(draft.weight) !== part.weight || String(part.minPrice) !== draft.minPrice || part.isIncluded !== draft.isIncluded;
      }),
    [listing.parts, partDrafts],
  );

  const setValue = (key: keyof FormState) => (value: string) => setForm((prev) => ({ ...prev, [key]: value }));
  const setField = (key: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) => setValue(key)(event.target.value);

  const setPartField = (partId: string, key: keyof PartDraft, value: string | boolean) =>
    setPartDrafts((prev) => ({ ...prev, [partId]: { ...prev[partId], [key]: value } }));

  const handleSave = async () => {
    if (!password) {
      setPasswordError('2차 비밀번호를 입력해 주세요.');
      return;
    }

    setIsSaving(true);
    try {
      const verified = await verifySecondaryPassword(password);
      if (!verified) {
        setPasswordError('2차 비밀번호가 올바르지 않습니다.');
        return;
      }

      if (!isMinPriceOnly) {
        await updateListing.mutateAsync({
          id: listing.id,
          input: {
            breed: form.breed,
            gender: form.gender,
            grade: form.grade,
            monthAge: numOrNull(form.monthAge, (v) => parseInt(v, 10)),
            backFat: numOrNull(form.backFat),
            eyeMuscle: numOrNull(form.eyeMuscle),
            marblingScore: numOrNull(form.marblingScore, (v) => parseInt(v, 10)),
            meatColor: numOrNull(form.meatColor, (v) => parseInt(v, 10)),
            fatColor: numOrNull(form.fatColor, (v) => parseInt(v, 10)),
            texture: numOrNull(form.texture, (v) => parseInt(v, 10)),
            maturity: numOrNull(form.maturity, (v) => parseInt(v, 10)),
            traceNo: form.traceNo || undefined,
            slaughterDate: form.slaughterDate || undefined,
            slaughterNo: form.slaughterNo || undefined,
            carcassWeight: numOrNull(form.carcassWeight),
            processDate: form.processDate || undefined,
            processWeight: numOrNull(form.processWeight),
          },
        });
      }

      await Promise.all(
        changedParts.map((part) => {
          const draft = partDrafts[part.id];
          return updatePart.mutateAsync({
            listingId: listing.id,
            partId: part.id,
            input: isMinPriceOnly
              ? { minPrice: numOrNull(draft.minPrice, (v) => parseInt(v, 10)) ?? 0 }
              : {
                  weight: numOrNull(draft.weight) ?? 0,
                  minPrice: numOrNull(draft.minPrice, (v) => parseInt(v, 10)) ?? 0,
                  isIncluded: draft.isIncluded,
                },
          });
        }),
      );

      toast.success(`${listing.listingNo} 수정을 저장했습니다.`);
      onSaved();
    } catch (error) {
      console.error('상장 수정 실패:', error);
      toast.error(error instanceof Error ? error.message : '수정에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = !isSaving && !(isMinPriceOnly && changedParts.length === 0);

  return (
    <div className="rounded-[2px] border border-slate-900 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-semibold text-slate-900">{isMinPriceOnly ? '최저가격 수정' : '상장 수정'}</span>
          <span className="text-[12px] text-slate-500">
            {isMinPriceOnly ? '아직 낙찰되지 않은 부위의 최저가격만 바꿀 수 있습니다.' : '체크를 풀면 그 부위는 상장에서 제외됩니다.'}
          </span>
        </div>
        <span className="text-[12px] text-slate-500">{changedParts.length > 0 && `부위 ${changedParts.length}개 변경`}</span>
      </div>

      {!isMinPriceOnly && (
        <section className="border-b border-slate-200 px-4 py-4">
          <h3 className="mb-3 text-[12px] font-semibold text-slate-900">개체 정보</h3>
          <div className="grid grid-cols-9 gap-x-3 gap-y-3">
            <Field label="축종">
              <AdminSelect aria-label="축종" value={form.breed} onChange={setValue('breed')} options={BREED_OPTIONS} />
            </Field>
            <Field label="성별">
              <AdminSelect aria-label="성별" value={form.gender} onChange={setValue('gender')} options={GENDER_OPTIONS} />
            </Field>
            <Field label="등급">
              <AdminSelect aria-label="등급" value={form.grade} onChange={setValue('grade')} options={GRADE_OPTIONS} />
            </Field>
            <Field label="개월령"><input type="number" value={form.monthAge} onChange={setField('monthAge')} className={COMPACT_NUMBER_INPUT} /></Field>
            <Field label="등지방"><input type="number" step="0.1" value={form.backFat} onChange={setField('backFat')} className={COMPACT_NUMBER_INPUT} /></Field>
            <Field label="등심면적"><input type="number" step="0.1" value={form.eyeMuscle} onChange={setField('eyeMuscle')} className={COMPACT_NUMBER_INPUT} /></Field>
            <Field label="근내지방"><input type="number" value={form.marblingScore} onChange={setField('marblingScore')} className={COMPACT_NUMBER_INPUT} /></Field>
            <Field label="육색"><input type="number" value={form.meatColor} onChange={setField('meatColor')} className={COMPACT_NUMBER_INPUT} /></Field>
            <Field label="지방색"><input type="number" value={form.fatColor} onChange={setField('fatColor')} className={COMPACT_NUMBER_INPUT} /></Field>
            <Field label="조직감"><input type="number" value={form.texture} onChange={setField('texture')} className={COMPACT_NUMBER_INPUT} /></Field>

            <Field label="성숙도"><input type="number" value={form.maturity} onChange={setField('maturity')} className={COMPACT_NUMBER_INPUT} /></Field>
            <Field label="이력번호" className="col-span-2">
              <div className="flex items-center">
                <span className={cn(COMPACT_INPUT, 'flex w-12 items-center rounded-r-none border-r-0 bg-slate-50 text-slate-500')}>002-</span>
                <input type="text" value={form.traceNo} onChange={setField('traceNo')} className={cn(COMPACT_INPUT, 'flex-1 rounded-l-none')} />
              </div>
            </Field>
            <Field label="도축일"><AdminDateInput aria-label="도축일" value={form.slaughterDate} onChange={setValue('slaughterDate')} className="w-full" /></Field>
            <Field label="도축번호"><input type="text" value={form.slaughterNo} onChange={setField('slaughterNo')} className={COMPACT_INPUT} /></Field>
            <Field label="도체중 (kg)"><input type="number" step="0.1" value={form.carcassWeight} onChange={setField('carcassWeight')} className={COMPACT_NUMBER_INPUT} /></Field>
            <Field label="가공일"><AdminDateInput aria-label="가공일" value={form.processDate} onChange={setValue('processDate')} className="w-full" /></Field>
            <Field label="가공중량 (kg)"><input type="number" step="0.1" value={form.processWeight} onChange={setField('processWeight')} className={COMPACT_NUMBER_INPUT} /></Field>
          </div>
        </section>
      )}

      <section className="bg-slate-50 px-4 py-4">
        <div className={PARTS_GRID}>
          {partColumns.map((columnParts, columnIndex) => (
            <table key={columnIndex} className={PARTS_BLOCK}>
              <colgroup>
                {!isMinPriceOnly && <col className="w-9" />}
                <col className="w-10" />
                <col className="w-[88px]" />
                <col />
                <col />
                {isMinPriceOnly && <col />}
              </colgroup>
              <thead>
                <tr className={PARTS_HEAD_ROW}>
                  {!isMinPriceOnly && <th scope="col" className={cn(PARTS_HEAD_CELL, 'text-center')}>상장</th>}
                  <th scope="col" className={cn(PARTS_HEAD_CELL, 'text-center')}>번호</th>
                  <th scope="col" className={cn(PARTS_HEAD_CELL, 'text-left')}>부위</th>
                  <th scope="col" className={cn(PARTS_HEAD_CELL, 'text-right')}>중량 (kg)</th>
                  <th scope="col" className={cn(PARTS_HEAD_CELL, 'text-right')}>최저가 (원/kg)</th>
                  {isMinPriceOnly && <th scope="col" className={cn(PARTS_HEAD_CELL, 'text-right')}>낙찰가 (원/kg)</th>}
                </tr>
              </thead>
              <tbody>
                {columnParts.map((part) => {
                  const draft = partDrafts[part.id];
                  if (!draft) return null;
                  const included = draft.isIncluded;
                  // 이미 낙찰된 부위는 최저가를 바꿀 이유가 없다
                  const isSold = Boolean(part.bidPrice);
                  const isLocked = !included || (isMinPriceOnly && isSold);
                  return (
                    <tr key={part.id} className={cn(PARTS_BODY_ROW, !included && 'bg-slate-50/60 text-slate-400')}>
                      {!isMinPriceOnly && (
                        <td className={cn(PARTS_CELL, 'text-center')}>
                          <Checkbox
                            aria-label={`${part.name} 상장 포함`}
                            checked={included}
                            onCheckedChange={(checked) => setPartField(part.id, 'isIncluded', checked === true)}
                            className="h-4 w-4 rounded-[2px] border-slate-300 align-middle data-[state=checked]:border-slate-900 data-[state=checked]:bg-slate-900"
                          />
                        </td>
                      )}
                      <td className={cn(PARTS_CELL, 'text-center text-slate-400')}>{partNoLabel(part.partNo)}</td>
                      <td className={cn(PARTS_CELL, included && 'font-medium text-slate-900')}>{part.name}</td>
                      <td className={cn(PARTS_CELL, CELL_INPUT_WRAP)}>
                        {isMinPriceOnly ? (
                          <span className="px-1.5">{formatKg(part.weight)}</span>
                        ) : (
                          <input
                            type="number"
                            step="0.1"
                            value={draft.weight}
                            disabled={!included}
                            onChange={(event) => setPartField(part.id, 'weight', event.target.value)}
                            className={CELL_INPUT}
                          />
                        )}
                      </td>
                      <td className={cn(PARTS_CELL, CELL_INPUT_WRAP)}>
                        {isLocked ? (
                          <span className="px-1.5 text-slate-400">{included ? withCommas(draft.minPrice) : '—'}</span>
                        ) : (
                          <input
                            type="text"
                            inputMode="numeric"
                            value={withCommas(draft.minPrice)}
                            onChange={(event) => setPartField(part.id, 'minPrice', onlyDigits(event.target.value))}
                            className={CELL_INPUT}
                          />
                        )}
                      </td>
                      {isMinPriceOnly && (
                        <td className={cn(PARTS_CELL, 'text-right')}>
                          {isSold ? <span className="font-semibold text-slate-900">{withCommas(String(part.bidPrice))}</span> : <span className="text-slate-300">—</span>}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ))}
        </div>
      </section>

      <footer className="flex items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-4 py-3">
        <label className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-slate-600">2차 비밀번호</span>
          <input
            type="password"
            value={password}
            autoComplete="off"
            onChange={(event) => {
              setPassword(event.target.value);
              setPasswordError(null);
            }}
            onKeyDown={(event) => event.key === 'Enter' && canSave && handleSave()}
            className={cn(COMPACT_INPUT, 'w-36', passwordError && 'border-rose-500 focus:border-rose-500')}
          />
          {passwordError && <span className="text-[12px] text-rose-600">{passwordError}</span>}
        </label>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onCancel} disabled={isSaving} className={ADMIN_BUTTON.secondary}>
            취소
          </button>
          <button type="button" onClick={handleSave} disabled={!canSave} className={ADMIN_BUTTON.primary}>
            {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            저장
          </button>
        </div>
      </footer>
    </div>
  );
}
