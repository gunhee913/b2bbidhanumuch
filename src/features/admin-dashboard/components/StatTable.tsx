'use client';

import { cn } from '@/lib/utils';

export interface StatColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  render: (row: T) => React.ReactNode;
  /** 합계 행 값 · 없으면 빈 칸 */
  footer?: React.ReactNode;
  /** 칸 너비 고정 · 순위처럼 좁은 열 */
  width?: string;
}

interface StatTableProps<T> {
  columns: StatColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** 합계 행 표시 여부 · 데이터가 없으면 그리지 않는다 */
  showFooter?: boolean;
  footerLabel?: string;
  /** 합계 라벨이 차지할 열 수 (순위+이름처럼 묶을 때 2) */
  footerLabelSpan?: number;
  emptyText?: string;
  /** 표 본문 최대 높이 · 넘치면 안에서 스크롤 */
  maxHeight?: number;
}

const ALIGN_CLASS = { left: 'text-left', right: 'text-right' } as const;

/**
 * 집계 표 · 세로선 없이 가로선만, 숫자는 오른쪽 정렬 + 고정폭.
 * 대시보드의 부위별·등급별·상장업체별·중도매인별 표가 같이 쓴다.
 */
export function StatTable<T>({
  columns,
  rows,
  rowKey,
  showFooter = true,
  footerLabel = '합계',
  footerLabelSpan = 1,
  emptyText = '데이터 없음',
  maxHeight,
}: StatTableProps<T>) {
  const hasRows = rows.length > 0;
  const footerColumns = columns.slice(footerLabelSpan);

  return (
    <div className="overflow-auto" style={maxHeight ? { maxHeight } : undefined}>
      <table className="w-full border-collapse text-[13px]">
        <thead className="sticky top-0 z-10 bg-white">
          <tr className="border-b border-slate-200">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                style={column.width ? { width: column.width } : undefined}
                className={cn(
                  'whitespace-nowrap px-2 py-2 text-[12px] font-medium text-slate-500',
                  ALIGN_CLASS[column.align ?? 'left'],
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {!hasRows ? (
            <tr>
              <td colSpan={columns.length} className="px-2 py-10 text-center text-[13px] text-slate-400">
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)} className="border-b border-slate-100 transition-colors hover:bg-slate-50">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'whitespace-nowrap px-2 py-[7px] tabular-nums text-slate-800',
                      ALIGN_CLASS[column.align ?? 'left'],
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
        {showFooter && hasRows && (
          <tfoot className="sticky bottom-0 bg-white">
            <tr className="border-t border-slate-300 font-semibold text-slate-900">
              <td colSpan={footerLabelSpan} className="px-2 py-2">
                {footerLabel}
              </td>
              {footerColumns.map((column) => (
                <td
                  key={column.key}
                  className={cn('whitespace-nowrap px-2 py-2 tabular-nums', ALIGN_CLASS[column.align ?? 'left'])}
                >
                  {column.footer ?? ''}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

/** 표를 감싸는 흰 패널 · 제목 줄 포함 */
export function Panel({
  title,
  aside,
  children,
  className,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-[2px] border border-slate-200 bg-white', className)}>
      <header className="flex h-12 items-center justify-between border-b border-slate-100 px-4">
        <h2 className="text-[14px] font-semibold text-slate-900">{title}</h2>
        {aside}
      </header>
      <div className="px-2 pb-2 pt-1">{children}</div>
    </section>
  );
}
