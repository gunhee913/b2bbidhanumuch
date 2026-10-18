'use client';

import { useMemo, useState } from 'react';
import { getPartGroupOrder } from '@/features/live-auction/lib/partGrouping';
import { cn } from '@/lib/utils';
import { GroupBuyShell } from '@/features/group-buy/components/GroupBuyShell';
import { PrimaryButton } from '@/features/group-buy/components/FormField';
import { GiftAutoPicker } from '@/features/group-buy/components/gifts/GiftAutoPicker';
import { GiftMenu } from '@/features/group-buy/components/gifts/GiftMenu';
import { GiftOrderSummary } from '@/features/group-buy/components/gifts/GiftOrderSummary';
import { GiftProductBoard } from '@/features/group-buy/components/gifts/GiftProductBoard';
import { GiftCheckout } from '@/features/group-buy/components/gifts/GiftCheckout';
import { GiftQuantityStepper } from '@/features/group-buy/components/gifts/GiftQuantityStepper';
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
  type GiftLeftoverMode,
} from '@/features/group-buy/lib/gift';
import { emptyDrafts, resolveAutoGiftCells, specFromDraft, specKeyOf, specLabelOf, type GiftAutoGroup, type GiftBulkPick, type GiftCellDraft } from '@/features/group-buy/lib/giftAuto';
import { GIFT_PRESET_IDS, GIFT_PRESET_META, buildGiftPreset, type GiftPresetId } from '@/features/group-buy/lib/giftPresets';
import { isOpen } from '@/features/group-buy/lib/homeFilters';
import { GRADE_KEY_ORDER, gradeKeyOf } from '@/features/group-buy/lib/pools';
import type { ConsumerProduct } from '@/features/group-buy/types';

const FALLBACK = 'https://picsum.photos/seed/hanwoo-gift/240/180';

const STEP_COPY: Record<GiftWizardStep, { title: string; desc: string }> = {
  box: { title: '한우 선물세트,', desc: '박스와 세트 수를 먼저 정하세요.' },
  parts: { title: '구성을 고르세요,', desc: '추천 구성, 부위, 등급을 드롭다운에서 고르세요.' },
  products: { title: '상품을 고르세요,', desc: '' },
  order: { title: '주문하세요,', desc: '배송지를 넣고, 남는 중량을 받을 곳을 정하세요.' },
};

const BACK_CLASS = 'inline-flex h-12 flex-1 items-center justify-center rounded-sm border border-line text-[14px] font-semibold text-content-soft hover:bg-surface-accent';

/** 선물세트 4단계 · 박스 → 구성 → 상품 → 주문 */
export default function GroupBuyGiftPage() {
  useHydrateKgCart();
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
  const [kgOverrides, setKgOverrides] = useState<Record<string, number>>({});
  const [bulkPicks, setBulkPicks] = useState<Record<string, GiftBulkPick[]>>({});
  const [picking, setPicking] = useState<number | null>(1);
  const [leftoverModes, setLeftoverModes] = useState<Record<string, GiftLeftoverMode>>({});
  const [orderedId, setOrderedId] = useState<string | null>(null);

  const openProducts = useMemo(() => (products ?? []).filter(isOpen), [products]);
  const openPools = useMemo(() => (pools ?? []).filter((pool) => pool.status === 'open'), [pools]);
  const cellSpecs = useMemo(() => cellDrafts.map(specFromDraft), [cellDrafts]);
  const allSpecs = cellSpecs.every(Boolean);
  const resolved = useMemo(
    () => resolveAutoGiftCells(cellSpecs, openProducts, quantity, overrides, openPools, kgOverrides, bulkPicks),
    [cellSpecs, openProducts, quantity, overrides, openPools, kgOverrides, bulkPicks],
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
    setKgOverrides({});
    setBulkPicks({});
    setPicking((current) => (current && current > n ? 1 : current));
  };

  const applyPreset = (id: GiftPresetId) => {
    setPresetId(id);
    setOverrides({});
    setKgOverrides({});
    setBulkPicks({});
    setCellDrafts(buildGiftPreset(id, cellCount, openProducts));
    setPicking(1);
  };

  const changeDraft = (cellNo: number, next: GiftCellDraft) => {
    setPresetId(null);
    setOverrides({});
    setKgOverrides({});
    setBulkPicks({});
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
  const short = resolved.groups.some((group) => group.shortKg > 0);
  const trayFills = picks.map((cell) => {
    const product = openProducts.find((item) => item.id === cell.productId);
    const pool = openPools.find((item) => item.id === cell.poolId);
    return { cellNo: cell.cellNo, label: product?.partName ?? pool?.partGroup ?? '부위', image: product?.images[0] ?? pool?.image ?? FALLBACK };
  });
  const partFills = cellDrafts.flatMap((draft, index) => (draft.partGroup ? [{ cellNo: index + 1, label: draft.partGroup, image: null }] : []));

  const toggleSlot = (picks: GiftBulkPick[], productId: string, slotNo: number): GiftBulkPick[] => {
    const found = picks.find((pick) => pick.productId === productId);
    if (!found) return [...picks, { productId, slotNos: [slotNo] }];
    const slotNos = found.slotNos.includes(slotNo) ? found.slotNos.filter((no) => no !== slotNo) : [...found.slotNos, slotNo];
    return picks.map((pick) => (pick.productId === productId ? { ...pick, slotNos } : pick)).filter((pick) => pick.slotNos.length > 0);
  };

  const bulkKgOf = (picks: GiftBulkPick[]) =>
    roundKg(
      picks.reduce((acc, pick) => {
        const product = openProducts.find((item) => item.id === pick.productId);
        const kg = product?.zones.filter((zone) => pick.slotNos.includes(zone.slotNo) && !zone.sold).reduce((sum, zone) => sum + zone.kg, 0) ?? 0;
        return acc + kg;
      }, 0),
    );

  const toggleBulk = (specKey: string, productId: string, slotNo: number) => {
    const group = resolved.groups.find((item) => specKeyOf(item.spec) === specKey);
    const next = toggleSlot(bulkPicks[specKey] ?? group?.bulks ?? [], productId, slotNo);
    setBulkPicks((prev) => ({ ...prev, [specKey]: next }));
    const covered = !!group && bulkKgOf(next) + 0.001 >= group.needKg;
    setKgOverrides((prev) => {
      if (covered) return { ...prev, [specKey]: 0 };
      if (specKey in prev) return prev;
      return { ...prev, [specKey]: group?.kg ?? 0 };
    });
  };

  const goCheckout = () => {
    if (!ready) return;
    setGiftDraft({
      cellCount,
      quantity,
      cells: picks,
      supplies: resolved.groups.map((group) => ({
        cellNos: group.cellNos,
        bulks: group.bulks,
        poolId: group.kg > 0 ? group.poolId : null,
        kg: group.kg,
        leftoverMode: group.leftoverKg > 0 ? (leftoverModes[specKeyOf(group.spec)] ?? 'separate') : 'separate',
      })),
    });
    go('order');
  };

  const go = (next: GiftWizardStep) => {
    if (next === 'parts') setPicking((current) => current ?? 1);
    setStep(next);
  };

  const copy = STEP_COPY[step];

  return (
    <GroupBuyShell>
      {orderedId ? null : (
        <>
          <GiftStepBar step={step} enabled={{ box: true, parts: true, products: allSpecs, order: ready }} onGo={go} />
          <h1 className="mt-6 text-[30px] font-bold leading-[1.2] tracking-[-0.03em] text-content">{copy.title}</h1>
          {copy.desc ? <p className="mt-1 max-w-[720px] text-[13.5px] leading-relaxed text-content-soft">{copy.desc}</p> : null}
        </>
      )}

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
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0 space-y-6">
            <div className="relative rounded-sm border border-line bg-surface p-5">
              <GiftTray cellCount={cellCount} fills={trayFills} />
              <p className="absolute bottom-5 right-5 text-[14px] font-bold tabular-nums text-content">{quantity}세트</p>
            </div>
            <GiftProductBoard
              groups={resolved.groups}
              products={openProducts}
              pools={openPools}
              quantity={quantity}
              emptyCells={emptyCells}
              onToggleBulk={toggleBulk}
              onKg={(specKey, kg) => setKgOverrides((prev) => ({ ...prev, [specKey]: kg }))}
              onFillLeftover={fillLeftover}
              leftoverModes={leftoverModes}
              onLeftoverMode={(specKey, mode) => setLeftoverModes((prev) => ({ ...prev, [specKey]: mode }))}
            />
          </div>
          <GiftOrderSummary
            quantity={quantity}
            groups={resolved.groups}
            packAmount={packAmount}
            meatAmount={meatAmount}
            ready={ready}
            short={short}
            leftoverModes={leftoverModes}
            onLeftoverMode={(specKey, mode) => setLeftoverModes((prev) => ({ ...prev, [specKey]: mode }))}
            onOrder={goCheckout}
            onBack={() => go('parts')}
          />
        </div>
      ) : null}

      {step === 'order' ? <GiftCheckout embedded onBack={() => go('products')} onDone={setOrderedId} /> : null}
    </GroupBuyShell>
  );
}
