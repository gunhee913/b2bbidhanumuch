'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { SmartImage } from '@/components/ui/smart-image';
import { cn } from '@/lib/utils';
import type { ConsumerPool } from '../../types';
import { formatWon } from '../../lib/slots';
import { gradeKeyCompact } from '../../lib/pools';

interface PoolTableProps {
  /** 정렬이 끝난 목록 · 이 순서대로 그린다 */
  pools: ConsumerPool[];
  selectedId?: string;
  onSelect: (pool: ConsumerPool) => void;
}

const FLASH_MS = 900;
const FALLBACK_THUMB = 'https://picsum.photos/seed/hanwoo-thumb/96/96';

const CELL = 'border border-line-soft px-4 text-[15px] font-semibold tabular-nums';
const HEAD = 'border border-line-soft border-b-line bg-surface-accent/60 px-4 py-3 text-[13.5px] font-semibold text-content-faint';

/** 한 줄 = 부위×등급 하나. 행을 누르면 오른쪽 주문 패널이 그 부위로 바뀐다. */
export function PoolTable({ pools, selectedId, onSelect }: PoolTableProps) {
  const flashing = useFlashOnIncrease(pools);

  return (
    <table className="w-full table-fixed border-collapse border border-line">
      <colgroup>
        <col className="w-[36%]" />
        <col className="w-[20%]" />
        <col className="w-[16%]" />
        <col className="w-[12%]" />
        <col className="w-[16%]" />
      </colgroup>
      <thead>
        <tr className="text-left">
          <th scope="col" className={HEAD}>
            부위 · 등급
          </th>
          <th scope="col" className={cn(HEAD, 'text-right')}>
            kg당 가격
          </th>
          <th scope="col" className={cn(HEAD, 'text-right')}>
            총 판매량
          </th>
          <th scope="col" className={cn(HEAD, 'text-right')}>
            리뷰 수
          </th>
          <th scope="col" className={cn(HEAD, 'text-center')}>
            상세페이지
          </th>
        </tr>
      </thead>
      <tbody>
        {pools.map((pool) => {
          const selected = pool.id === selectedId;
          return (
            <tr
              key={pool.id}
              onClick={() => onSelect(pool)}
              aria-selected={selected}
              className={cn(
                'h-[68px] cursor-pointer transition-colors',
                selected ? 'bg-surface-accent' : 'hover:bg-surface-accent/50',
                flashing.has(pool.id) && 'flash-up',
              )}
            >
              <td className={CELL}>
                <div className="flex items-center gap-3">
                  <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-sm bg-surface-accent">
                    <SmartImage src={pool.image ?? FALLBACK_THUMB} alt="" fill fallbackSrc={FALLBACK_THUMB} className="object-cover" />
                  </span>
                  <span className="truncate text-content">
                    {pool.partGroup} <span className="text-content-soft">{gradeKeyCompact(pool.gradeKey)}</span>
                  </span>
                </div>
              </td>
              <td className={cn(CELL, 'text-right text-content')}>{formatWon(pool.pricePerKg)}</td>
              <td className={cn(CELL, 'text-right', pool.totalKg > 0 ? 'text-content' : 'text-content-soft')}>{pool.totalKg}kg</td>
              <td className={cn(CELL, 'text-right', pool.reviewCount > 0 ? 'text-content' : 'text-content-soft')}>{pool.reviewCount}</td>
              <td className={cn(CELL, 'text-center')}>
                <Link
                  href={`/group-buy/kg/${pool.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex h-9 items-center rounded-sm border border-line bg-surface px-3.5 text-[13px] font-semibold text-content-mid transition-colors hover:border-content-soft hover:text-content"
                >
                  상세보기
                </Link>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** 모인 kg이 늘어난 풀을 잠깐 번쩍이게 · 체결 플래시 */
function useFlashOnIncrease(pools: ConsumerPool[]): Set<string> {
  const prevRef = useRef<Map<string, number>>(new Map());
  const [flashing, setFlashing] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const prev = prevRef.current;
    const increased = prev.size > 0 ? pools.filter((p) => (prev.get(p.id) ?? 0) < p.totalKg).map((p) => p.id) : [];
    prevRef.current = new Map(pools.map((p) => [p.id, p.totalKg]));
    if (increased.length === 0) return;
    setFlashing(new Set(increased));
    const timer = setTimeout(() => setFlashing(new Set()), FLASH_MS);
    return () => clearTimeout(timer);
  }, [pools]);

  return flashing;
}
