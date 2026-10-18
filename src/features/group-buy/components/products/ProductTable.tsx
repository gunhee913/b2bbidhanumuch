'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { SmartImage } from '@/components/ui/smart-image';
import { cn } from '@/lib/utils';
import type { ConsumerProduct } from '../../types';
import { formatWon, sumZones, type ProductZone } from '../../lib/slots';
import { gradeWithMarbling } from '../../lib/format';

interface ProductTableProps {
  products: ConsumerProduct[];
  selectedId?: string;
  /** 선택한 상품에서 고른 구좌 번호 */
  selectedSlots: number[];
  onSelect: (product: ConsumerProduct) => void;
  /** 구좌 줄 클릭 · 상품 선택 + 해당 구좌 토글 */
  onToggleZone: (product: ConsumerProduct, zone: ProductZone) => void;
  /** 맨 오른쪽 "상세" 열 · 상세 페이지 자신에서는 뺀다 */
  showDetailLink?: boolean;
  /** 상품이 여러 개일 때 구좌 선택 · 있으면 selectedId 보다 우선한다 */
  pickedSlots?: Record<string, number[]>;
  /** 상세를 새 탭에서 연다 */
  detailNewTab?: boolean;
}

const FALLBACK_THUMB = 'https://picsum.photos/seed/hanwoo-thumb/96/96';
/** 셀 경계는 `line`, 상품 묶음 경계·표 바깥은 한 톤 진한 `content-ghost` 로 구분한다 */
const GROUP_LINE = 'border-content-ghost';
const CELL = 'border border-line px-3.5 text-[15px] font-semibold tabular-nums whitespace-nowrap';
/** 머리글 · 전부 가운데 정렬 — 본문 셀의 좌/우 정렬과 달리 열 이름만 읽기 쉽게 */
const HEAD = 'border border-line border-b-content-ghost bg-surface-accent px-3.5 py-3 text-center text-[13.5px] font-semibold text-content-mid whitespace-nowrap';
/** 열 너비 · 머리글 표와 본문 표가 같은 값을 써야 열이 맞는다 */
const COLUMN_WIDTHS = ['w-[26%]', 'w-[9%]', 'w-[14%]', 'w-[12%]', 'w-[15%]', 'w-[14%]', 'w-[10%]'];
const TABLE = cn('w-full table-fixed border-collapse border', GROUP_LINE);
/** 합계 줄 · 구좌 줄과 확실히 구분되게 진한 배경 + 위쪽 굵은 선 */
const TOTAL_ROW = 'bg-surface-strong font-bold hover:bg-surface-strong';
/**
 * 줄 높이 · 상품 하나의 세로 길이는 분할 수와 무관하게 3분할(48×4)과 같게 맞춘다.
 * 합계 줄은 늘 48px, 2분할은 위치 줄 두 개가 나머지(72×2)를 나눠 갖는다 —
 * 이미지 셀(rowSpan)이 남긴 여백을 브라우저가 합계 줄까지 늘려 배분하지 않도록 명시한다.
 */
const ROW_HEIGHT = 'h-[48px]';
const ZONE_ROW_HEIGHT: Record<number, string> = { 2: 'h-[72px]', 3: ROW_HEIGHT, 4: ROW_HEIGHT };
const TOTAL_CELL = 'border-t-2 border-t-content-ghost border-b-content-ghost';

/** 공동구매 표 제목 · "채끝 1++(9)" · 좌/우가 있으면 "등심(우) 1++(9)" */
export function productTitle(p: ConsumerProduct): string {
  return `${p.partName} ${gradeWithMarbling(p.cattle.grade, p.cattle.marblingScore)}`;
}

const formatZoneKg = (kg: number) => `${kg.toFixed(1)}kg`;

function ProductColGroup({ showDetailLink }: { showDetailLink: boolean }) {
  const widths = showDetailLink ? COLUMN_WIDTHS : COLUMN_WIDTHS.slice(0, -1);
  return (
    <colgroup>
      {widths.map((w, index) => (
        <col key={index} className={w} />
      ))}
    </colgroup>
  );
}

/**
 * 표 머리글만 따로 그린 표 · 필터와 함께 sticky 영역에 올라가 스크롤해도 따라온다.
 * 본문(`ProductTable`)과 같은 colgroup 을 쓰므로 열이 정확히 맞는다.
 */
export function ProductTableHead({ showDetailLink = true }: { showDetailLink?: boolean }) {
  return (
    <table className={TABLE}>
      <ProductColGroup showDetailLink={showDetailLink} />
      <thead>
        <tr>
          <th className={HEAD}>상품정보</th>
          <th className={HEAD}>위치</th>
          <th className={HEAD}>kg당 가격</th>
          <th className={HEAD}>중량</th>
          <th className={HEAD}>가격</th>
          <th className={HEAD}>상태</th>
          {showDetailLink ? <th className={HEAD}>상세</th> : null}
        </tr>
      </thead>
    </table>
  );
}

/**
 * 공동구매 표 본문 · 상품 하나 = 위치 줄(상단·하단 또는 상단·중단·하단) + 합계 줄.
 * 상품정보(부위·등급·개체) / 상세보기는 네 줄에 걸쳐 합쳐지고,
 * 위치·kg당 가격·중량·가격은 구좌마다 다르다. 마감은 상장 단위로 공통이라 표에서는 뺐다.
 * 머리글은 `ProductTableHead` 가 위에서 그리므로 첫 줄의 위쪽 선은 지워 이중선을 막는다.
 */
export function ProductTable({ products, selectedId, selectedSlots, onSelect, onToggleZone, showDetailLink = true, pickedSlots, detailNewTab = false }: ProductTableProps) {
  return (
    <table className={cn(TABLE, 'border-t-0 [&_tbody_tr:first-child>td]:border-t-0')}>
      <ProductColGroup showDetailLink={showDetailLink} />
      <tbody>
        {products.map((p) => {
          const selected = p.id === selectedId;
          // 상품 하나가 차지하는 줄 수 · 위치 줄(2 또는 3) + 합계
          const rowSpan = p.zones.length + 1;
          const total = sumZones(p.zones, p.zones.map((z) => z.slotNo));
          const remaining = p.zones.filter((z) => !z.sold).length;
          const rowBase = 'cursor-pointer transition-colors hover:bg-surface-accent/40';
          const zoneRow = cn(rowBase, ZONE_ROW_HEIGHT[p.zones.length] ?? ROW_HEIGHT);
          const spanCell = cn(CELL, 'border-b-content-ghost bg-surface align-middle');

          return p.zones.map((zone, i) => {
            const picked = pickedSlots ? (pickedSlots[p.id] ?? []).includes(zone.slotNo) : selected && selectedSlots.includes(zone.slotNo);
            const isLast = i === p.zones.length - 1;
            return (
              <ZoneRows
                key={`${p.id}-${zone.slotNo}`}
                first={i === 0}
                rowSpan={rowSpan}
                product={p}
                zone={zone}
                picked={picked}
                rowClass={zoneRow}
                spanCell={spanCell}
                showDetailLink={showDetailLink}
                detailNewTab={detailNewTab}
                onSelect={() => onSelect(p)}
                onToggle={() => onToggleZone(p, zone)}
                totalRow={
                  isLast ? (
                    <tr key={`${p.id}-total`} onClick={() => onSelect(p)} className={cn(rowBase, ROW_HEIGHT, TOTAL_ROW)}>
                      <td colSpan={2} className={`${CELL} ${TOTAL_CELL} text-center text-[13.5px] text-content-mid`}>합계</td>
                      <td className={`${CELL} ${TOTAL_CELL} text-right text-content`}>{formatZoneKg(total.kg)}</td>
                      <td className={`${CELL} ${TOTAL_CELL} text-right text-content`}>{formatWon(total.amount)}</td>
                      <td className={`${CELL} ${TOTAL_CELL} text-center text-[13px] text-content-faint`}>{remaining === 0 ? '판매 완료' : ''}</td>
                    </tr>
                  ) : null
                }
              />
            );
          });
        })}
      </tbody>
    </table>
  );
}

interface ZoneRowsProps {
  first: boolean;
  rowSpan: number;
  product: ConsumerProduct;
  zone: ProductZone;
  picked: boolean;
  rowClass: string;
  spanCell: string;
  showDetailLink: boolean;
  detailNewTab: boolean;
  onSelect: () => void;
  onToggle: () => void;
  totalRow: React.ReactNode;
}

/** 구좌 한 줄 · 첫 줄이면 rowSpan 셀(상품정보·상세)을 함께 그린다 */
function ZoneRows({ first, rowSpan, product: p, zone, picked, rowClass, spanCell, showDetailLink, detailNewTab, onSelect, onToggle, totalRow }: ZoneRowsProps) {
  const tone = zone.sold ? 'text-content-ghost line-through' : 'text-content';
  return (
    <>
      <tr
        onClick={zone.sold ? onSelect : onToggle}
        className={cn(rowClass, zone.sold && 'cursor-default hover:bg-transparent', picked && 'bg-surface-accent/70 hover:bg-surface-accent/70')}
        aria-selected={picked}
      >
        {first ? (
          <>
            <td rowSpan={rowSpan} className={cn(spanCell, 'py-3')}>
              <div className="flex flex-col items-center gap-2.5 text-center">
                <span className="relative aspect-[4/3] w-full max-w-[150px] overflow-hidden rounded-sm bg-surface-accent">
                  <SmartImage src={p.images[0] ?? FALLBACK_THUMB} alt="" fill fallbackSrc={FALLBACK_THUMB} className="object-cover" />
                </span>
                <span className="min-w-0 max-w-full">
                  <span className="block truncate text-content">
                    {p.partName} <span className="font-medium text-content-soft">{gradeWithMarbling(p.cattle.grade, p.cattle.marblingScore)}</span>
                  </span>
                  <span className="block truncate text-[12.5px] font-medium text-content-faint">
                    {p.cattle.listingNo}
                    {p.cattle.slaughterHouse ? ` · ${p.cattle.slaughterHouse}` : ''}
                  </span>
                </span>
              </div>
            </td>
          </>
        ) : null}
        <td className={`${CELL} text-center text-[13.5px] ${zone.sold ? 'text-content-ghost' : 'text-content-mid'}`}>{zone.label}</td>
        <td className={`${CELL} text-right ${tone}`}>{formatWon(zone.pricePerKg)}</td>
        <td className={`${CELL} text-right ${tone}`}>{formatZoneKg(zone.kg)}</td>
        <td className={`${CELL} text-right ${tone}`}>{formatWon(zone.price)}</td>
        <td className={`${CELL} text-center text-[13px]`}>
          {zone.sold ? (
            <span className="text-content-faint">판매 완료</span>
          ) : picked ? (
            <span className="inline-flex items-center gap-1 text-content">
              <Check className="h-3.5 w-3.5" strokeWidth={3} /> 선택됨
            </span>
          ) : (
            <span className="text-content-soft">구매 가능</span>
          )}
        </td>
        {first && showDetailLink ? (
          <td rowSpan={rowSpan} className={`${spanCell} text-center`}>
            <Link
              href={`/group-buy/products/${p.id}`}
              target={detailNewTab ? '_blank' : undefined}
              rel={detailNewTab ? 'noreferrer' : undefined}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex h-9 items-center rounded-sm border border-line bg-surface px-3 text-[13px] font-semibold text-content hover:bg-surface-muted"
            >
              상세
            </Link>
          </td>
        ) : null}
      </tr>
      {totalRow}
    </>
  );
}
