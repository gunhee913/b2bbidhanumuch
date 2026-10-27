'use client';

import { Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FormPhotoSource } from '../../lib/listingPhotos';
import { partListingNo, partTotals, splitPartsIntoColumns, type PartView } from '../../lib/listingView';

/** 경매장에서 이 부위에 실제로 걸리는 사진 · `resolveFormPartCover` 의 결과 */
export interface PartCover {
  src: string | null;
  source: FormPhotoSource;
}

interface PartsTableProps {
  listingNo: string;
  parts: PartView[];
  /** 부위마다 경매장에 나갈 사진을 정한다 · 없으면 사진 열을 그리지 않는다 */
  resolveCover?: (part: PartView) => PartCover;
  /** 썸네일을 눌렀을 때 · 없으면 썸네일은 보이기만 한다 */
  onOpenPartPhotos?: (part: PartView, cover: PartCover) => void;
  /** 합계 줄 오른쪽 끝에 두는 동작(최저가격 수정 등) · 표와 같은 줄에 두어 세로 높이를 아낀다 */
  footerAction?: React.ReactNode;
}

/**
 * 부위 격자 공통 스타일 · 조회 표와 수정 폼이 같은 모양을 쓴다.
 * 블록마다 테두리, 안쪽은 가로 실선만 · 열 구분은 정렬과 고정 폭으로 한다.
 */
export const PARTS_GRID = 'grid grid-cols-3 items-start gap-4';
export const PARTS_BLOCK = 'w-full border-collapse border border-slate-200 bg-white text-[13px] text-slate-600';

/**
 * 부위 행 글자 위계 · 부위명(무엇인가) → 낙찰가(결과) → 최저가(기준) → 중량(보조) → 번호(자리표시).
 * 숫자 세 열이 같은 무게면 눈이 머물 곳이 없어, 낙찰가만 굵고 진하게 두고 나머지는 한 단계씩 내린다.
 */
const PART_NO_TEXT = 'text-[11px] text-slate-400';
const PART_NAME_TEXT = 'font-semibold text-slate-900';
const PART_WEIGHT_TEXT = 'text-slate-500';
const PART_UNIT_TEXT = 'ml-px text-[11px] text-slate-400';
const PART_MIN_PRICE_TEXT = 'text-slate-600';
const PART_BID_PRICE_TEXT = 'font-semibold text-slate-900';
export const PARTS_HEAD_ROW = 'border-b border-slate-200 bg-slate-50';
export const PARTS_HEAD_CELL = 'h-7 whitespace-nowrap px-3 text-[11px] font-medium text-slate-500';
export const PARTS_BODY_ROW = 'border-b border-slate-100 last:border-b-0';
export const PARTS_CELL = 'h-8 whitespace-nowrap px-3 tabular-nums';
/**
 * 격자 칸 안의 입력 · 고칠 수 있는 칸임이 보이도록 테두리 있는 상자로 그린다.
 * 잠긴 칸(제외 부위·이미 낙찰된 부위)은 상자 없이 회색 글자라 둘이 한눈에 갈린다.
 */
export const PARTS_CELL_INPUT =
  'h-6 w-full rounded-[2px] border border-slate-300 bg-white px-1.5 text-right text-[13px] tabular-nums text-slate-900 outline-none hover:border-slate-400 focus:border-slate-900 disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';
export const PARTS_CELL_INPUT_WRAP = 'px-1.5 text-right';
export const PARTS_TOTAL_BAR = 'flex h-9 items-center gap-6 border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-900';

export const partNoLabel = (partNo: number) => String(partNo).padStart(2, '0');
export const formatWon = (value: number) => value.toLocaleString('ko-KR');
/** 중량은 늘 소수 첫째 자리까지 · 「25」와 「25.9」가 한 열에 섞이면 자릿수가 어긋나 읽기 어렵다 */
export const formatKg = (value: number) => value.toFixed(1);

/** 부위를 7행 × 3열 블록으로, 아래 합계 한 줄 */
export function PartsTable({ listingNo, parts, resolveCover, onOpenPartPhotos, footerAction }: PartsTableProps) {
  const totals = partTotals(parts);

  if (parts.length === 0) {
    return <p className="py-8 text-center text-[13px] text-slate-400">등록된 부위가 없습니다.</p>;
  }

  const columns = splitPartsIntoColumns(parts);

  return (
    <div className="space-y-2">
      <div className={PARTS_GRID}>
        {columns.map((columnParts, columnIndex) => (
          <PartsBlock key={columnIndex} listingNo={listingNo} parts={columnParts} resolveCover={resolveCover} onOpenPartPhotos={onOpenPartPhotos} />
        ))}
      </div>

      <div className={PARTS_TOTAL_BAR}>
        <span>
          합계 <span className="ml-1 font-normal text-slate-500">상장 {totals.includedCount} / {totals.totalCount}부위</span>
        </span>
        <span className="tabular-nums">
          <span className="mr-1.5 font-normal text-slate-500">중량</span>
          {formatKg(totals.weight)}kg
        </span>
        <span className="tabular-nums" title="중량 × 최저가격 합계">
          <span className="mr-1.5 font-normal text-slate-500">최저가 합계</span>
          {formatWon(Math.round(totals.minPriceTotal))}원
        </span>
        <span className="tabular-nums" title="중량 × 낙찰가격 합계">
          <span className="mr-1.5 font-normal text-slate-500">낙찰가 합계</span>
          {totals.bidTotal > 0 ? `${formatWon(Math.round(totals.bidTotal))}원` : <span className="font-normal text-slate-300">—</span>}
        </span>
        {footerAction && <span className="ml-auto">{footerAction}</span>}
      </div>
    </div>
  );
}

/**
 * 부위 표에서 보여줄 사진은 두 가지뿐 · 업체가 올린 실제 사진, 아니면 설정의 대표사진.
 * 메인 사진 1번으로 대신 나가는 경우(listing)는 부위 사진이 아니므로 「사진 없음」으로 친다.
 */
export const isPartPhotoShown = (source: FormPhotoSource) => source === 'part' || source === 'company';

export const PART_COVER_LABEL: Record<FormPhotoSource, string> = {
  part: '실제 사진(업로드)',
  company: '대표사진(설정)',
  listing: '사진 없음',
  none: '사진 없음',
};

/** 썸네일 왼쪽 아래 배지 · 메인 사진의 「메인」 배지(`ListingDetail`의 `Thumb`)와 같은 모양 */
const SOURCE_BADGE_TEXT: Record<'part' | 'company', string> = { part: '실제', company: '대표' };
const SOURCE_BADGE = 'pointer-events-none absolute bottom-0 left-0 bg-slate-900/85 px-1 py-px text-[8px] font-semibold leading-none text-white';

interface PartPhotoCellProps {
  partName: string;
  /** 이 부위에 올린 사진 수 */
  count: number;
  cover: PartCover;
  /** 눌렀을 때 · 없으면 보이기만 한다 */
  onOpen?: () => void;
  /** 사진이 없을 때도 누를 수 있게(등록 폼) · 점선 카메라 칸으로 그린다 */
  allowEmptyOpen?: boolean;
}

/**
 * 경매장에 나갈 사진 · 32×24 (행 높이 32px 안에).
 * 실제 사진이면 「실제」 + 장수, 대표사진이면 「대표」, 둘 다 없으면 글자로 「사진 없음」.
 */
export function PartPhotoCell({ partName, count, cover, onOpen, allowEmptyOpen = false }: PartPhotoCellProps) {
  if (!cover.src || !isPartPhotoShown(cover.source)) {
    if (!onOpen || !allowEmptyOpen) return <span className="text-[10px] text-slate-400">사진 없음</span>;
    return (
      <button
        type="button"
        onClick={onOpen}
        title={`${partName} · 사진 없음 · 눌러서 올리기`}
        className="flex h-6 w-8 items-center justify-center border border-dashed border-slate-300 text-slate-400 hover:border-slate-900 hover:text-slate-900"
      >
        <Camera className="h-3 w-3" strokeWidth={2} />
      </button>
    );
  }

  const isOwn = cover.source === 'part';
  const label = isOwn ? `${partName} · 실제 사진 ${count}장` : `${partName} · ${PART_COVER_LABEL[cover.source]}`;
  const badgeText = SOURCE_BADGE_TEXT[isOwn ? 'part' : 'company'];

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!onOpen}
      title={label}
      aria-label={label}
      className="relative block h-6 w-8 overflow-hidden border border-slate-200 bg-slate-50 hover:border-slate-900 disabled:cursor-default disabled:hover:border-slate-200"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={cover.src} alt="" className="h-full w-full object-cover" />
      {isOwn && count > 1 && (
        <span className="absolute right-0 top-0 min-w-[13px] bg-slate-900/85 px-0.5 text-center text-[8px] font-bold leading-[13px] text-white">{count}</span>
      )}
      <span className={SOURCE_BADGE}>{badgeText}</span>
    </button>
  );
}

/** 조회 표용 · `PartView` 를 받아 셀 props 로 푼다 */
function PartPhotoCellFor({ part, cover, onOpen }: { part: PartView; cover: PartCover; onOpen?: (part: PartView, cover: PartCover) => void }) {
  return <PartPhotoCell partName={part.name} count={part.images.length} cover={cover} onOpen={onOpen ? () => onOpen(part, cover) : undefined} />;
}

function PartsBlock({ listingNo, parts, resolveCover, onOpenPartPhotos }: PartsTableProps) {
  return (
    <table className={PARTS_BLOCK}>
      <colgroup>
        <col className="w-11" />
        <col className="w-12" />
        <col className="w-[88px]" />
        <col />
        <col />
        <col />
      </colgroup>
      <thead>
        <tr className={PARTS_HEAD_ROW}>
          <th scope="col" className={cn(PARTS_HEAD_CELL, 'text-center')}>번호</th>
          <th scope="col" className={cn(PARTS_HEAD_CELL, 'px-2 text-center')}>사진</th>
          <th scope="col" className={cn(PARTS_HEAD_CELL, 'text-left')}>부위</th>
          <th scope="col" className={cn(PARTS_HEAD_CELL, 'text-right')}>중량</th>
          <th scope="col" className={cn(PARTS_HEAD_CELL, 'text-right')}>최저가</th>
          <th scope="col" className={cn(PARTS_HEAD_CELL, 'text-right')}>낙찰가</th>
        </tr>
      </thead>
      <tbody>
        {parts.map((part) => (
          <tr
            key={part.id || part.partNo}
            className={cn(PARTS_BODY_ROW, !part.isIncluded && 'bg-slate-50/60 text-slate-400')}
            title={part.isIncluded ? partListingNo(listingNo, part.partNo) : '상장 제외'}
          >
            <td className={cn(PARTS_CELL, 'text-center', PART_NO_TEXT)}>{partNoLabel(part.partNo)}</td>
            <td className={cn(PARTS_CELL, 'px-2')}>
              {resolveCover && (
                <span className="flex justify-center">
                  <PartPhotoCellFor part={part} cover={resolveCover(part)} onOpen={onOpenPartPhotos} />
                </span>
              )}
            </td>
            <td className={cn(PARTS_CELL, part.isIncluded && PART_NAME_TEXT)}>
              {part.name}
              {!part.isIncluded && <span className="ml-1.5 text-[11px] text-slate-400">제외</span>}
            </td>
            <td className={cn(PARTS_CELL, 'text-right', part.isIncluded && PART_WEIGHT_TEXT)}>
              {part.isIncluded ? (
                <>
                  {formatKg(part.weight)}
                  <span className={PART_UNIT_TEXT}>kg</span>
                </>
              ) : (
                '—'
              )}
            </td>
            <td className={cn(PARTS_CELL, 'text-right', part.isIncluded && PART_MIN_PRICE_TEXT)}>{part.isIncluded ? formatWon(part.minPrice) : '—'}</td>
            <td className={cn(PARTS_CELL, 'text-right')}>
              {part.isIncluded && part.bidPrice ? (
                <span className={PART_BID_PRICE_TEXT}>{formatWon(part.bidPrice)}</span>
              ) : (
                <span className="text-slate-300">—</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
