'use client';

import { Fragment } from 'react';
import { useMeasure } from 'react-use';
import { Checkbox } from '@/components/ui/checkbox';
import { ADMIN_BUTTON } from '@/components/admin/buttonStyles';
import { cn } from '@/lib/utils';
import type { ListingView } from '../../lib/listingView';
import { StatusBadge } from './StatusBadge';

interface ListingTableProps {
  listings: ListingView[];
  isLoading: boolean;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAllPending: () => void;
  onApproveOne: (listing: ListingView) => void;
  approvingId: string | null;
  renderDetail: (listing: ListingView) => React.ReactNode;
}

type Align = 'left' | 'right' | 'center';

interface Column {
  key: string;
  header: string;
  /** 최소 폭(px) · 머리글 글자 수 + 좌우 여백 기준으로 꼭 필요한 만큼만 */
  width: number;
  align?: Align;
  /** 열 그룹의 첫 열 · 왼쪽에 구분선 */
  groupStart?: boolean;
  /** 좁은 열(점수·세 자리 숫자) · 좌우 여백을 줄여 붙여 놓는다 */
  dense?: boolean;
  /** 화면이 넓을 때 남는 폭을 가져가는 열 (글자 열만) · 나머지는 고정 */
  flex?: boolean;
  render: (listing: ListingView) => React.ReactNode;
}

const COLUMNS: Column[] = [
  { key: 'listingNo', header: '접수번호', width: 92, render: (l) => <span className="font-semibold text-slate-900">{l.listingNo}</span> },
  { key: 'breed', header: '축종', width: 44, render: (l) => l.breed },
  { key: 'gender', header: '성별', width: 44, render: (l) => l.gender },
  { key: 'grade', header: '등급', width: 68, render: (l) => <span className="font-semibold text-slate-900">{l.grade}</span> },
  { key: 'monthAge', header: '개월령', width: 46, align: 'center', dense: true, render: (l) => l.monthAge },

  // 육질 판정 항목(근내지방 → 육색 → 지방색 → 조직감 → 성숙도) 뒤에 육량 측정값(등지방·등심면적)
  { key: 'marbling', header: '근내지방', width: 56, align: 'center', dense: true, groupStart: true, render: (l) => l.marblingScore || '' },
  { key: 'meatColor', header: '육색', width: 38, align: 'center', dense: true, render: (l) => l.meatColor },
  { key: 'fatColor', header: '지방색', width: 46, align: 'center', dense: true, render: (l) => l.fatColor },
  { key: 'texture', header: '조직감', width: 46, align: 'center', dense: true, render: (l) => l.texture },
  { key: 'maturity', header: '성숙도', width: 46, align: 'center', dense: true, render: (l) => l.maturity },
  { key: 'backFat', header: '등지방', width: 46, align: 'center', dense: true, render: (l) => l.backFat },
  { key: 'eyeMuscle', header: '등심면적', width: 56, align: 'center', dense: true, render: (l) => l.eyeMuscle },

  { key: 'traceNo', header: '이력번호', width: 118, groupStart: true, render: (l) => <span className="text-slate-500">002-{l.traceNo}</span> },
  { key: 'slaughterHouse', header: '도축장', width: 76, flex: true, render: (l) => <span className="block truncate" title={l.slaughterHouse}>{l.slaughterHouse}</span> },
  { key: 'slaughterDate', header: '도축일', width: 66, render: (l) => l.slaughterDate },
  // 도축번호·도체중·가공중량은 세 자리까지라 머리글 폭만 있으면 된다
  { key: 'slaughterNo', header: '도축번호', width: 52, align: 'center', dense: true, render: (l) => l.slaughterNo },
  { key: 'carcassWeight', header: '도체중', width: 46, align: 'center', dense: true, render: (l) => l.carcassWeight },

  { key: 'company', header: '상장업체', width: 84, align: 'center', groupStart: true, flex: true, render: (l) => <span className="block truncate" title={l.companyName}>{l.companyName}</span> },
  { key: 'processDate', header: '가공일', width: 66, render: (l) => l.processDate },
  { key: 'processWeight', header: '가공중량', width: 52, align: 'center', dense: true, render: (l) => l.processWeight },
];

const ALIGN: Record<Align, string> = { left: 'text-left', right: 'text-right', center: 'text-center' };

const SELECT_WIDTH = 40;
const PHOTO_WIDTH = 44;
const STATUS_WIDTH = 68;
const ACTION_WIDTH = 68;
/** 모든 열의 최소 폭 합 · 이보다 좁으면 가로 스크롤, 넓으면 flex 열이 남는 폭을 나눠 가진다 */
const TABLE_MIN_WIDTH =
  SELECT_WIDTH + COLUMNS.reduce((sum, column) => sum + column.width, 0) + PHOTO_WIDTH + STATUS_WIDTH + ACTION_WIDTH;
const TOTAL_COLUMNS = COLUMNS.length + 4; // 선택 · 사진 · 상태 · 동작

const CELL = 'whitespace-nowrap px-2';
const DENSE_CELL = 'whitespace-nowrap px-1';
const GROUP_LINE = 'border-l border-slate-100';

const cellClass = (column: Column) =>
  cn(column.dense ? DENSE_CELL : CELL, ALIGN[column.align ?? 'left'], column.groupStart && GROUP_LINE);

/**
 * 사진·상태·동작 열은 오른쪽에 고정 · 열이 많아 가로 스크롤이 생겨도 승인 버튼은 항상 보인다.
 * 사진 열까지 묶어 두는 까닭 · 상태 열만 고정하면 스크롤 전엔 사진 칸이 그 밑에 깔려 잘린다.
 * 바탕은 행에서 물려받아(hover·선택 배경) 고정 칸만 다른 색으로 떠 보이지 않게 한다.
 */
const STICKY_ACTION = 'sticky right-0 bg-inherit';
// right 값은 ACTION_WIDTH, ACTION_WIDTH + STATUS_WIDTH 와 같아야 한다 (Tailwind 가 문자열을 읽으므로 리터럴로 둔다)
const STICKY_STATUS = 'sticky right-[68px] bg-inherit';
const STICKY_PHOTO = 'sticky right-[136px] bg-inherit shadow-[-8px_0_8px_-8px_rgba(15,23,42,0.18)]';

const CHECKBOX_CLASS =
  'h-4 w-4 rounded-[2px] border-slate-300 data-[state=checked]:border-slate-900 data-[state=checked]:bg-slate-900 data-[state=indeterminate]:border-slate-900 data-[state=indeterminate]:bg-slate-900';

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <tr key={index} className="border-b border-slate-100">
          <td colSpan={TOTAL_COLUMNS} className="h-10 px-4">
            <div className="h-3.5 w-full animate-pulse rounded-[2px] bg-slate-100" />
          </td>
        </tr>
      ))}
    </>
  );
}

/** 상장 목록 · 열 구성은 원장 그대로, 선택·상태·승인 동작을 양쪽 끝에 */
export function ListingTable({
  listings,
  isLoading,
  expandedId,
  onToggleExpand,
  selectedIds,
  onToggleSelect,
  onToggleSelectAllPending,
  onApproveOne,
  approvingId,
  renderDetail,
}: ListingTableProps) {
  const pending = listings.filter((listing) => listing.status === '대기');
  const allPendingSelected = pending.length > 0 && pending.every((listing) => selectedIds.has(listing.id));
  const somePendingSelected = pending.some((listing) => selectedIds.has(listing.id));

  // 표가 가로로 넘쳐도 펼친 영역은 보이는 폭에 맞춰 왼쪽에 붙인다
  const [scrollRef, { width: viewportWidth }] = useMeasure<HTMLDivElement>();

  return (
    <div className="rounded-[2px] border border-slate-200 bg-white">
      <div ref={scrollRef} className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-[12px]" style={{ minWidth: TABLE_MIN_WIDTH }}>
          <colgroup>
            <col style={{ width: SELECT_WIDTH }} />
            {COLUMNS.map((column) => (
              <col key={column.key} style={column.flex ? undefined : { width: column.width }} />
            ))}
            <col style={{ width: PHOTO_WIDTH }} />
            <col style={{ width: STATUS_WIDTH }} />
            <col style={{ width: ACTION_WIDTH }} />
          </colgroup>
          <thead>
            <tr className="border-b border-slate-200 text-[11px] font-medium text-slate-500 [&>th]:h-9 [&>th]:bg-slate-50">
              <th scope="col" className="pl-4 pr-2">
                <Checkbox
                  aria-label="대기 상장 전체 선택"
                  checked={allPendingSelected ? true : somePendingSelected ? 'indeterminate' : false}
                  disabled={pending.length === 0}
                  onCheckedChange={onToggleSelectAllPending}
                  className={cn(CHECKBOX_CLASS, 'disabled:opacity-30')}
                />
              </th>
              {COLUMNS.map((column) => (
                <th key={column.key} scope="col" className={cellClass(column)}>
                  {column.header}
                </th>
              ))}
              <th scope="col" className={cn(CELL, 'text-center', STICKY_PHOTO)}>사진</th>
              <th scope="col" className={cn(CELL, 'text-left', STICKY_STATUS)}>상태</th>
              <th scope="col" className={cn('pl-2 pr-4', STICKY_ACTION)} />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <SkeletonRows />
            ) : listings.length === 0 ? (
              <tr>
                <td colSpan={TOTAL_COLUMNS} className="px-4 py-14 text-center text-[13px] text-slate-400">
                  조건에 맞는 상장이 없습니다.
                </td>
              </tr>
            ) : (
              listings.map((listing) => {
                const isExpanded = expandedId === listing.id;
                const isPending = listing.status === '대기';
                const isSelected = selectedIds.has(listing.id);
                const photoCount = listing.images.length;
                return (
                  <Fragment key={listing.id}>
                    <tr
                      onClick={() => onToggleExpand(listing.id)}
                      className={cn(
                        'cursor-pointer border-b border-slate-100 transition-colors [&>td]:h-10',
                        isExpanded ? 'bg-slate-50' : isSelected ? 'bg-slate-100' : 'bg-white hover:bg-slate-50',
                      )}
                    >
                      <td className="pl-4 pr-2" onClick={(event) => event.stopPropagation()}>
                        {isPending && (
                          <Checkbox
                            aria-label={`${listing.listingNo} 선택`}
                            checked={isSelected}
                            onCheckedChange={() => onToggleSelect(listing.id)}
                            className={CHECKBOX_CLASS}
                          />
                        )}
                      </td>
                      {COLUMNS.map((column) => (
                        <td key={column.key} className={cn(cellClass(column), 'tabular-nums text-slate-700')}>
                          {column.render(listing)}
                        </td>
                      ))}
                      <td className={cn(CELL, 'text-center tabular-nums', STICKY_PHOTO)}>
                        {photoCount > 0 ? <span className="text-slate-700">{photoCount}장</span> : <span className="font-medium text-rose-600">없음</span>}
                      </td>
                      <td className={cn(CELL, STICKY_STATUS)}>
                        <StatusBadge status={listing.status} />
                      </td>
                      <td className={cn('pl-2 pr-4 text-right', STICKY_ACTION)} onClick={(event) => event.stopPropagation()}>
                        {isPending && (
                          <button
                            type="button"
                            onClick={() => onApproveOne(listing)}
                            disabled={approvingId !== null}
                            className={cn(ADMIN_BUTTON.secondary, 'h-7 px-2.5')}
                          >
                            {approvingId === listing.id ? '승인 중' : '승인'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={TOTAL_COLUMNS} className="p-0">
                          <div className="sticky left-0" style={viewportWidth ? { width: viewportWidth } : undefined}>
                            {renderDetail(listing)}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-[12px] text-slate-500">
        <span>총 {listings.length}건</span>
        {selectedIds.size > 0 && <span className="font-medium text-slate-900">{selectedIds.size}건 선택됨</span>}
      </div>
    </div>
  );
}
