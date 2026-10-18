'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { AdminProduct, UpdateProductSettingsInput } from '../../types';
import { usePublishProduct, useUnpublishProduct, useUpdateProductSettings } from '../../hooks';
import { calcSlotWeight } from '../../lib/slots';
import { SlotPreview } from './SlotPreview';
import {
  ADMIN_INPUT_CLASS,
  AdminButton,
  AdminField,
  AdminStatusBadge,
  formatNumberInput,
  fromDateTimeLocal,
  toDateTimeLocal,
} from './AdminPrimitives';

interface FormState {
  slotCount: string;
  pricePerKg: string;
  referenceRetailPerKg: string;
  bidPriceCap: string;
  positional: boolean;
  recruitDeadline: string;
  description: string;
}

function toForm(p: AdminProduct): FormState {
  const refPerKg = p.referenceRetailPrice && p.slotWeight ? Math.round(p.referenceRetailPrice / p.slotWeight) : null;
  return {
    slotCount: p.slotCount?.toString() ?? '',
    pricePerKg: p.pricePerKg?.toString() ?? '',
    referenceRetailPerKg: refPerKg?.toString() ?? '',
    bidPriceCap: p.bidPriceCap?.toString() ?? '',
    positional: p.positional,
    recruitDeadline: toDateTimeLocal(p.recruitDeadline),
    description: p.description ?? '',
  };
}

/**
 * 상품 판매 조건 설정 시트 · 분할 수·kg당 단가·참고 소매가·응찰 상한·마감.
 * 저장은 draft/recruiting 모두 가능, 공개는 draft 에서만.
 */
export function ProductSettingsSheet({
  product,
  open,
  onOpenChange,
  soldSlotNos = [],
}: {
  product: AdminProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  soldSlotNos?: number[];
}) {
  const [form, setForm] = useState<FormState | null>(null);
  const update = useUpdateProductSettings();
  const publish = usePublishProduct();
  const unpublish = useUnpublishProduct();

  useEffect(() => {
    if (product && open) setForm(toForm(product));
  }, [product, open]);

  if (!product || !form) return null;

  const slotCount = formatNumberInput(form.slotCount);
  const pricePerKg = formatNumberInput(form.pricePerKg);
  const refPerKg = formatNumberInput(form.referenceRetailPerKg);
  const slotWeight = slotCount ? calcSlotWeight(product.partWeight, slotCount) : null;
  const editable = product.status === 'draft' || product.status === 'recruiting';
  const canPublish = product.status === 'draft' && !!slotCount && !!pricePerKg && !!form.recruitDeadline;

  const buildInput = (): UpdateProductSettingsInput => ({
    slotCount,
    pricePerKg,
    referenceRetailPrice: refPerKg && slotWeight ? Math.ceil((refPerKg * slotWeight) / 10) * 10 : null,
    bidPriceCap: formatNumberInput(form.bidPriceCap),
    positional: form.positional,
    recruitDeadline: fromDateTimeLocal(form.recruitDeadline),
    description: form.description.trim() || null,
  });

  const save = async () => {
    try {
      await update.mutateAsync({ id: product.id, input: buildInput() });
      toast.success('판매 조건을 저장했습니다.');
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '저장에 실패했습니다.');
      return false;
    }
  };

  const saveAndPublish = async () => {
    const ok = await save();
    if (!ok) return;
    try {
      await publish.mutateAsync(product.id);
      toast.success('소비자에게 공개되었습니다.');
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '공개에 실패했습니다.');
    }
  };

  const handleUnpublish = async () => {
    try {
      await unpublish.mutateAsync(product.id);
      toast.success('공개를 내렸습니다.');
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '비공개 처리에 실패했습니다.');
    }
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[520px] overflow-y-auto sm:max-w-[520px]">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <AdminStatusBadge status={product.status} />
            <span className="text-[11px] text-gray-500">
              {product.listingNo} · {product.slaughterHouse ?? '-'} · {product.grade ?? '-'}
            </span>
          </div>
          <SheetTitle className="text-base">{product.partName}</SheetTitle>
          <SheetDescription className="text-xs">
            부위 중량 {product.partWeight.toLocaleString()}kg · 최저가 {product.minPrice ? `${product.minPrice.toLocaleString()}원/kg` : '-'}
            {product.soldCount > 0 ? ` · 판매 ${product.soldCount}구좌` : ''}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <AdminField label="분할 수 (구좌)" hint={product.soldCount > 0 ? `판매분 ${product.soldCount} 미만으로 줄일 수 없음` : '1~100'}>
              <input
                type="number"
                min={1}
                max={100}
                inputMode="numeric"
                value={form.slotCount}
                onChange={(e) => set('slotCount', e.target.value)}
                disabled={!editable}
                className={ADMIN_INPUT_CLASS}
              />
            </AdminField>
            <AdminField label="kg당 판매 단가 (원)" hint="소비자 구좌가 = 단가 × 구좌 중량">
              <input
                type="number"
                min={0}
                step={100}
                inputMode="numeric"
                value={form.pricePerKg}
                onChange={(e) => set('pricePerKg', e.target.value)}
                disabled={!editable}
                className={ADMIN_INPUT_CLASS}
              />
            </AdminField>
            <AdminField label="참고 소매가 (원/kg)" hint="절약률 표기에 사용 · 비우면 표기 안 함">
              <input
                type="number"
                min={0}
                step={100}
                inputMode="numeric"
                value={form.referenceRetailPerKg}
                onChange={(e) => set('referenceRetailPerKg', e.target.value)}
                disabled={!editable}
                className={ADMIN_INPUT_CLASS}
              />
            </AdminField>
            <AdminField label="응찰 상한 (원/kg)" hint="비우면 최저가로 응찰">
              <input
                type="number"
                min={0}
                step={100}
                inputMode="numeric"
                value={form.bidPriceCap}
                onChange={(e) => set('bidPriceCap', e.target.value)}
                disabled={!editable}
                className={ADMIN_INPUT_CLASS}
              />
            </AdminField>
            <AdminField label="모집 마감" hint="경매 시작 전이어야 응찰 가능" className="col-span-2">
              <input
                type="datetime-local"
                value={form.recruitDeadline}
                onChange={(e) => set('recruitDeadline', e.target.value)}
                disabled={!editable}
                className={ADMIN_INPUT_CLASS}
              />
            </AdminField>
          </div>

          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={form.positional}
              onChange={(e) => set('positional', e.target.checked)}
              disabled={!editable}
              className="h-3.5 w-3.5 accent-black"
            />
            위치 선택 사용 (소비자가 구좌 번호 = 소분 위치를 고름)
          </label>

          <AdminField label="상세설명" hint="소비자 상세 페이지 맨 아래에 표시 · 줄바꿈 그대로 · 이 상품에만 적용">
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              disabled={!editable}
              rows={8}
              maxLength={5000}
              placeholder={`예) 32개월 거세 한우 등심(좌) 상단입니다.\n마블링이 고르게 분포해 구이용으로 알맞습니다.`}
              className={`${ADMIN_INPUT_CLASS} h-auto resize-y py-2 leading-relaxed`}
            />
          </AdminField>

          <SlotPreview
            partWeight={product.partWeight}
            partName={product.partName}
            slotCount={slotCount}
            pricePerKg={pricePerKg}
            positional={form.positional}
            soldSlotNos={soldSlotNos}
          />

          {pricePerKg && product.minPrice && pricePerKg < product.minPrice ? (
            <p className="border border-rose-200 bg-rose-50 px-3 py-2 text-[11.5px] text-rose-700">
              판매 단가가 경매 최저가({product.minPrice.toLocaleString()}원/kg)보다 낮습니다. 낙찰 시 손실이 납니다.
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
          <div>
            {product.status === 'recruiting' && product.soldCount === 0 ? (
              <AdminButton variant="danger" onClick={handleUnpublish} loading={unpublish.isPending}>
                비공개로 되돌리기
              </AdminButton>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <AdminButton size="md" onClick={() => void save()} disabled={!editable} loading={update.isPending}>
              저장
            </AdminButton>
            {product.status === 'draft' ? (
              <AdminButton size="md" variant="primary" onClick={saveAndPublish} disabled={!canPublish} loading={publish.isPending}>
                저장하고 공개
              </AdminButton>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
