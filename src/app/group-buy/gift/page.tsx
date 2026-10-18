'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPartGroupOrder } from '@/features/live-auction/lib/partGrouping';
import { cn } from '@/lib/utils';
import { GroupBuyShell } from '@/features/group-buy/components/GroupBuyShell';
import { PrimaryButton } from '@/features/group-buy/components/FormField';
import { GiftAutoPicker } from '@/features/group-buy/components/gifts/GiftAutoPicker';
import { GiftMenu } from '@/features/group-buy/components/gifts/GiftMenu';
import { GiftProductBoard } from '@/features/group-buy/components/gifts/GiftProductBoard';
import { GiftQuantityStepper } from '@/features/group-buy/components/gifts/GiftQuantityStepper';
import { GiftQuote } from '@/features/group-buy/components/gifts/GiftQuote';
import { GiftStepBar, type GiftWizardStep } from '@/features/group-buy/components/gifts/GiftStepBar';
import { GiftTray } from '@/features/group-buy/components/gifts/GiftTray';
import { productTitle } from '@/features/group-buy/components/products/ProductTable';
import { useConsumerPools, useConsumerProducts, useGiftSettings, useRealtimeGroupBuy } from '@/features/group-buy/hooks';
import { useHydrateKgCart, useKgCart } from '@/features/group-buy/lib/cartStore';
import {
  GIFT_CELL_COUNTS,
  GIFT_CELL_KG,
  GIFT_TRAY_META,
  packagingAmount,
  roundKg,
  type GiftCellCount,
  type GiftCellPick,
} from '@/features/group-buy/lib/gift';
import { emptyDrafts, resolveAutoGiftCells, specFromDraft, specKeyOf, specLabelOf, type GiftAutoGroup, type GiftCellDraft } from '@/features/group-buy/lib/giftAuto';
import { GIFT_PRESET_IDS, GIFT_PRESET_META, buildGiftPreset, type GiftPresetId } from '@/features/group-buy/lib/giftPresets';
import { isOpen } from '@/features/group-buy/lib/homeFilters';
import { GRADE_KEY_ORDER, gradeKeyOf } from '@/features/group-buy/lib/pools';
import type { ConsumerProduct } from '@/features/group-buy/types';

const FALLBACK = 'https://picsum.photos/seed/hanwoo-gift/240/180';

const STEP_COPY: Record<GiftWizardStep, { title: string; desc: string }> = {
  box: { title: '한우 선물세트,', desc: '박스와 세트 수를 먼저 정하세요.' },
  parts: { title: '구성을 고르세요,', desc: '추천 구성, 부위, 등급을 드롭다운에서 고르세요.' },
  products: { title: '상품을 고르세요,', desc: '벌크 구좌와 1kg 구매를 섞어 남는 중량이 가장 적게 맞춥니다.' },
  quote: { title: '견적을 확인하세요,', desc: '남는 양은 주문서에서 집 또는 매장으로 받으실 수 있어요.' },
};

const BACK_CLASS = 'inline-flex h-12 flex-1 items-center justify-center rounded-sm border border-line text-[14px] font-semibold text-content-soft hover:bg-surface-accent';

/** 선물세트 4단계 · 박스 → 구성 → 상품 → 견적 */
export default function GroupBuyGiftPage() {
  const router = useRouter();
  const hydrated = useHydrateKgCart();
  const setGiftDraft = useKgCart((s) => s.setGiftDraft);
  const { data: products } = useConsumerProducts();
  const { data: pools } = useConsumerPools();
  const { data: settings } = useGiftSettings();
  useRealtimeGroupBuy();

  const [step, setStep] = useState<GiftWizardStep>('box');
  const [cellCount, setCellCount] = useState<GiftCellCount>(3);
  const [quantity, setQuantity] = useState(1);
  const [presetId, setPresetId] = useState<GiftPresetId | null>(null);
  const [cellDrafts, setCellDrafts] = useState<GiftCellDraft[]>(() => emptyDrafts(3));
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [picking, setPicking] = useState<number | null>(1);

  const openProducts = useMemo(() => (products ?? []).filter(isOpen), [products]);
  const openPools = useMemo(() => (pools ?? []).filter((pool) => pool.status === 'open'), [pools]);
  const cellSpecs = useMemo(() => cellDrafts.map(specFromDraft), [cellDrafts]);
  const allSpecs = cellSpecs.every(Boolean);
  const resolved = useMemo(
    () => resolveAutoGiftCells(cellSpecs, openProducts, quantity, overrides, openPools),
    [cellSpecs, openProducts, quantity, overrides, openPools],
  );
  const cells = resolved.cells;
  const picks = cells.filter((c): c is GiftCellPick => !!c);
  const filled = allSpecs && picks.length === cellCount;
  const emptyCells = cellDrafts.filter((draft) => !specFromDraft(draft)).length;

  const partGroups = useMemo(() => {
    const present = new Set(openProducts.map((product) => product.partGroup));
    return getPartGroupOrder().filter((group) => present.has(group));
  }, [openProducts]);

  const grades = useMemo(() => {
    const present = new Set(
      openProducts
        .map((product) => gradeKeyOf(product.cattle.grade, product.cattle.marblingScore))
        .filter((grade): grade is string => !!grade),
    );
    return GRADE_KEY_ORDER.filter((grade) => present.has(grade));
  }, [openProducts]);

  const changeTray = (n: GiftCellCount) => {
    setCellCount(n);
    setCellDrafts((prev) => Array.from({ length: n }, (_, i) => prev[i] ?? { partGroup: '', gradeKey: '' }));
    setPresetId(null);
    setOverrides({});
    setPicking((current) => (current && current > n ? 1 : current));
  };

  const applyPreset = (id: GiftPresetId) => {
    setPresetId(id);
    setOverrides({});
    setCellDrafts(buildGiftPreset(id, cellCount, openProducts));
    setPicking(1);
  };

  const changeDraft = (cellNo: number, next: GiftCellDraft) => {
    setPresetId(null);
    setOverrides({});
    const drafts = cellDrafts.map((draft, index) => (index === cellNo - 1 ? next : draft));
    setCellDrafts(drafts);
    if (specFromDraft(next)) {
      const nextEmpty = drafts.findIndex((draft) => !specFromDraft(draft));
      setPicking(nextEmpty >= 0 ? nextEmpty + 1 : cellNo);
      return;
    }
    setPicking(cellNo);
  };

  const fillLeftover = (group: GiftAutoGroup) => {
    const cellNeed = roundKg(GIFT_CELL_KG * Math.max(1, quantity));
    const room = Math.min(emptyCells, Math.floor(group.leftoverKg / cellNeed));
    if (room < 1) return;
    setPresetId(null);
    setCellDrafts((prev) => {
      let left = room;
      return prev.map((draft) => {
        if (left > 0 && !specFromDraft(draft)) {
          left -= 1;
          return { partGroup: group.spec.partGroup, gradeKey: group.spec.gradeKey };
        }
        return draft;
      });
    });
  };

  const plan = resolved.groups.map((group) => {
    const productId = group.product?.id ?? group.poolId ?? specKeyOf(group.spec);
    if (group.shortKg > 0 || group.error) {
      return { productId, ok: false as const, error: group.error ?? '모집이 끝난 부위', needKg: group.needKg, usedKg: 0, leftoverKg: 0, product: group.product ?? undefined };
    }
    return {
      productId,
      ok: true as const,
      title: group.product ? productTitle(group.product) : (group.poolLabel ?? specLabelOf(group.spec)),
      product: group.product ?? undefined,
      needKg: group.needKg,
      usedKg: group.usedKg,
      leftoverKg: group.leftoverKg,
      amount: group.amount,
      lines: group.lines,
    };
  });

  const meatAmount = plan.reduce((acc, line) => acc + (line.ok ? line.amount : 0), 0);
  const packFee = settings?.packagingFee ?? 15000;
  const packAmount = packagingAmount(packFee, quantity);
  const ready = filled && plan.length > 0 && plan.every((line) => line.ok);
  const setKg = cellCount * GIFT_CELL_KG * quantity;
  const usedKg = plan.reduce((acc, line) => acc + line.usedKg, 0);
  const leftoverKg = plan.reduce((acc, line) => acc + line.leftoverKg, 0);
  const short = resolved.groups.some((group) => group.shortKg > 0);
  const trayFills = picks.map((cell) => {
    const product = openProducts.find((item) => item.id === cell.productId);
    const pool = openPools.find((item) => item.id === cell.poolId);
    return { cellNo: cell.cellNo, label: product?.partName ?? pool?.partGroup ?? '부위', image: product?.images[0] ?? pool?.image ?? FALLBACK };
  });
  const partFills = cellDrafts.flatMap((draft, index) => (draft.partGroup ? [{ cellNo: index + 1, label: draft.partGroup, image: null }] : []));

  const goCheckout = () => {
    if (!ready) return;
    setGiftDraft({ cellCount, quantity, cells: picks });
    router.push('/group-buy/gift/checkout');
  };

  const go = (next: GiftWizardStep) => {
    if (next === 'parts') setPicking((current) => current ?? 1);
    setStep(next);
  };

  const copy = STEP_COPY[step];

  return (
    <GroupBuyShell>
      <GiftStepBar step={step} enabled={{ box: true, parts: true, products: allSpecs, quote: ready }} onGo={go} />
      <h1 className="mt-6 text-[30px] font-bold leading-[1.2] tracking-[-0.03em] text-content">{copy.title}</h1>
      <p className="mt-1 max-w-[720px] text-[13.5px] leading-relaxed text-content-soft">{copy.desc}</p>

      {step === 'box' ? (
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-sm border border-line bg-surface p-6">
            <GiftTray cellCount={cellCount} size="hero" />
          </div>
          <aside className="space-y-5">
            <section>
              <h2 className="text-[15px] font-bold text-content">박스</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {GIFT_CELL_COUNTS.map((n) => {
                  const meta = GIFT_TRAY_META[n];
                  const active = cellCount === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => changeTray(n)}
                      aria-pressed={active}
                      className={cn('min-w-0 overflow-hidden rounded-sm border bg-surface px-2.5 py-2.5 text-left transition-colors', active ? 'border-ink' : 'border-line hover:border-content-faint')}
                    >
                      <GiftTray cellCount={n} compact />
                      <p className="mt-2 text-[14px] font-bold text-content">{meta.title}</p>
                      <p className="mt-0.5 text-[12.5px] text-content-soft">
                        {meta.hint} · {meta.people}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>
            <section>
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-bold text-content">세트 수</h2>
                <GiftQuantityStepper
                  value={quantity}
                  onChange={(next) => {
                    setQuantity(next);
                  }}
                />
              </div>
            </section>
            <PrimaryButton className="rounded-sm" onClick={() => go('parts')}>
              구성 고르기
            </PrimaryButton>
          </aside>
        </div>
      ) : null}

      {step === 'parts' ? (
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(420px,1fr)_420px]">
          <div className="rounded-sm border border-line bg-surface p-5">
            <GiftTray cellCount={cellCount} selectedCell={picking} onSelectCell={setPicking} fills={partFills} />
          </div>
          <section className="rounded-sm border border-line bg-surface p-5">
            <GiftMenu
              label="추천 구성"
              value={presetId ?? ''}
              placeholder="직접 고르기"
              options={GIFT_PRESET_IDS.map((id) => ({
                value: id,
                label: GIFT_PRESET_META[id].title,
                hint: GIFT_PRESET_META[id].desc,
              }))}
              onChange={(id) => applyPreset(id as GiftPresetId)}
            />
            <div className="mt-4">
              <GiftAutoPicker
                picking={picking}
                drafts={cellDrafts}
                partGroups={partGroups}
                grades={grades}
                groups={[]}
                onChange={changeDraft}
                onSelectCell={setPicking}
              />
            </div>
            {!allSpecs ? <p className="mt-4 text-[12.5px] text-content-faint">모든 칸의 부위와 등급을 고르세요.</p> : null}
            <div className="mt-5 flex gap-2">
              <button type="button" className={BACK_CLASS} onClick={() => go('box')}>
                이전
              </button>
              <PrimaryButton className="flex-1 rounded-sm" disabled={!allSpecs} onClick={() => go('products')}>
                상품 고르기
              </PrimaryButton>
            </div>
          </section>
        </div>
      ) : null}

      {step === 'products' ? (
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(420px,1fr)_420px]">
          <div className="rounded-sm border border-line bg-surface p-5">
            <GiftTray cellCount={cellCount} fills={trayFills} />
          </div>
          <section className="rounded-sm border border-line bg-surface p-5">
            <h2 className="text-[15px] font-bold text-content">구매</h2>
            <div className="mt-4">
              <GiftProductBoard
                groups={resolved.groups}
                products={openProducts}
                pools={openPools}
                quantity={quantity}
                emptyCells={emptyCells}
                onPick={(specKey, productId) => setOverrides((prev) => ({ ...prev, [specKey]: productId }))}
                onFillLeftover={fillLeftover}
              />
            </div>
            {short ? <p className="mt-4 text-[12.5px] text-rose-600">부족한 상품이 있어요. 다른 상품을 고르거나 칸 수를 줄이세요.</p> : null}
            <div className="mt-5 flex gap-2">
              <button type="button" className={BACK_CLASS} onClick={() => go('parts')}>
                이전
              </button>
              <PrimaryButton className="flex-1 rounded-sm" disabled={!ready} onClick={() => go('quote')}>
                견적 보기
              </PrimaryButton>
            </div>
          </section>
        </div>
      ) : null}

      {step === 'quote' ? (
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(420px,1fr)_400px]">
          <div className="rounded-sm border border-line bg-surface p-5">
            <GiftTray cellCount={cellCount} fills={trayFills} />
          </div>
          <aside>
            <GiftQuote
              cellCount={cellCount}
              quantity={quantity}
              plan={plan}
              setKg={setKg}
              usedKg={usedKg}
              leftoverKg={leftoverKg}
              packAmount={packAmount}
              meatAmount={meatAmount}
              ready={ready}
              hydrated={hydrated}
              onOrder={goCheckout}
            />
            <button type="button" className={cn(BACK_CLASS, 'mt-3 w-full flex-none')} onClick={() => go('products')}>
              이전
            </button>
          </aside>
        </div>
      ) : null}
    </GroupBuyShell>
  );
}
