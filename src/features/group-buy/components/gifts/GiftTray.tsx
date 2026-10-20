'use client';

import { useId } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  GIFT_CELL_GRAMS,
  GIFT_CELL_PACK_CM,
  TRAY_CANVAS,
  formatCellPack,
  formatCm,
  formatTraySize,
  trayBoxes,
  traySizeCm,
  trayViewBox,
  type GiftCellCount,
} from '../../lib/gift';

export interface GiftTrayFill {
  cellNo: number;
  label: string;
  image: string | null;
}

interface GiftTrayProps {
  cellCount: GiftCellCount;
  fills?: GiftTrayFill[];
  selectedCell?: number | null;
  onSelectCell?: (cellNo: number) => void;
  compact?: boolean;
  thumb?: boolean;
  size?: 'default' | 'hero';
  className?: string;
}

const BOX_RX = 6;
const WELL_RX = 4;

/**
 * 정육 N구 스티로폼 아이스박스 · 위에서 본 열린 상자.
 * 칸은 12×18cm 로 같고, 카드에서는 가장 큰 박스(6구) 캔버스에 맞춰 같은 축척으로 그린다.
 */
export function GiftTray({ cellCount, fills = [], selectedCell = null, onSelectCell, compact = false, thumb = false, size = 'default', className }: GiftTrayProps) {
  const rawId = useId().replace(/:/g, '');
  const local = trayViewBox(cellCount);
  const canvas = TRAY_CANVAS;
  const ox = (canvas.w - local.w) / 2;
  const oy = (canvas.h - local.h) / 2;
  const boxes = trayBoxes(cellCount).map((box) => ({ ...box, x: box.x + ox, y: box.y + oy }));
  const byCell = new Map(fills.map((f) => [f.cellNo, f]));
  const interactive = !!onSelectCell;
  const foam = `foam-${rawId}`;
  const grain = `grain-${rawId}`;
  const well = `well-${rawId}`;
  const showSize = !compact && !thumb;
  const boxCm = traySizeCm(cellCount);
  const padL = showSize ? 46 : 0;
  const padT = showSize ? 32 : 0;
  const padR = showSize ? 16 : 0;
  const padB = showSize ? 16 : 0;
  const frameH = thumb ? 'h-[72px]' : compact ? '' : size === 'hero' ? 'h-[520px]' : 'h-[420px]';

  return (
    <div className={cn('relative w-full', className)}>
      <div
        className={cn('w-full', thumb || compact ? 'overflow-hidden' : '', frameH)}
        style={compact && !thumb ? { aspectRatio: `${canvas.w} / ${canvas.h}` } : undefined}
      >
      <svg
        viewBox={`${-padL} ${-padT} ${canvas.w + padL + padR} ${canvas.h + padT + padB}`}
        preserveAspectRatio="xMidYMid meet"
        className={cn('block w-full', frameH)}
        overflow="visible"
        role="img"
        aria-label={`${cellCount}구 스티로폼 박스 ${formatCellPack()} ${formatTraySize(cellCount)}`}
      >
        <defs>
          <linearGradient id={foam} x1="0" y1="0" x2="0.12" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#f6f3ea" />
            <stop offset="100%" stopColor="#ebe6d8" />
          </linearGradient>
          <linearGradient id={well} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#cfc8b8" />
            <stop offset="55%" stopColor="#e4dece" />
            <stop offset="100%" stopColor="#ddd6c6" />
          </linearGradient>
          <filter id={grain} x="-2%" y="-2%" width="104%" height="104%">
            <feTurbulence type="fractalNoise" baseFrequency="1.35" numOctaves="2" seed="3" stitchTiles="stitch" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.92  0 0 0 0 0.9  0 0 0 0 0.84  0 0 0 0.18 0" />
          </filter>
          {boxes.map((box) => (
            <clipPath key={box.cellNo} id={`${rawId}-c${box.cellNo}`}>
              <rect x={box.x + 5} y={box.y + 5} width={box.w - 10} height={box.h - 10} rx={WELL_RX} />
            </clipPath>
          ))}
        </defs>

        <rect x={ox + 3} y={oy + 5} width={local.w - 4} height={local.h - 6} rx={BOX_RX} fill="#c8c2b3" />
        <rect x={ox + 1} y={oy + 1} width={local.w - 4} height={local.h - 5} rx={BOX_RX} fill={`url(#${foam})`} />
        <rect x={ox + 1} y={oy + 1} width={local.w - 4} height={local.h - 5} rx={BOX_RX} filter={`url(#${grain})`} />
        <rect x={ox + 1} y={oy + 1} width={local.w - 4} height={local.h - 5} rx={BOX_RX} fill="none" stroke="#d2ccbe" strokeWidth="1.4" />
        <rect x={ox + 5} y={oy + 5} width={local.w - 12} height={local.h - 13} rx={BOX_RX - 1} fill="none" stroke="#e8e3d6" strokeWidth="2.2" />

        {boxes.map((box) => {
          const fill = byCell.get(box.cellNo);
          const active = selectedCell === box.cellNo;
          const label = fill ? (compact ? fill.label : `${fill.label} ${GIFT_CELL_GRAMS}g`) : '';
          return (
            <g
              key={box.cellNo}
              role={interactive ? 'button' : undefined}
              tabIndex={interactive ? 0 : undefined}
              onClick={() => onSelectCell?.(box.cellNo)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectCell?.(box.cellNo);
                }
              }}
              className={interactive ? 'cursor-pointer' : undefined}
            >
              <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={WELL_RX + 1} fill="#bdb6a6" />
              <rect x={box.x + 2} y={box.y + 2} width={box.w - 4} height={box.h - 4} rx={WELL_RX} fill={`url(#${well})`} />
              <rect
                x={box.x + 5}
                y={box.y + 5}
                width={box.w - 10}
                height={box.h - 10}
                rx={WELL_RX}
                fill="#e4dece"
                stroke={active ? '#1a1a1a' : '#c4bdad'}
                strokeWidth={active ? 2 : 0.8}
              />
              {fill?.image ? (
                <image
                  href={fill.image}
                  x={box.x + 6}
                  y={box.y + 6}
                  width={box.w - 12}
                  height={label ? box.h - 30 : box.h - 12}
                  preserveAspectRatio="xMidYMid meet"
                  clipPath={`url(#${rawId}-c${box.cellNo})`}
                  style={{ mixBlendMode: 'darken' }}
                />
              ) : null}
              {label ? (
                <>
                  <rect x={box.x + 5} y={box.y + box.h - 22} width={box.w - 10} height="17" fill="rgba(40,36,28,0.5)" clipPath={`url(#${rawId}-c${box.cellNo})`} />
                  <text x={box.x + box.w / 2} y={box.y + box.h - 10} textAnchor="middle" fill="#fff" fontSize={compact ? 9 : 11} fontWeight="700">
                    {label}
                  </text>
                </>
              ) : (
                <text x={box.x + box.w / 2} y={box.y + box.h / 2 + 4} textAnchor="middle" fill="#a89f8d" fontSize={compact ? 10 : 12} fontWeight="600">
                  {compact ? box.cellNo : `${box.cellNo}칸`}
                </text>
              )}
            </g>
          );
        })}
        {showSize ? (
          <g fill="#3f3a32" fontSize="13" fontWeight="700">
            <line x1={ox + 1} y1={oy - 10} x2={ox + local.w - 3} y2={oy - 10} stroke="#6b6558" strokeWidth="1.2" />
            <line x1={ox + 1} y1={oy - 15} x2={ox + 1} y2={oy - 5} stroke="#6b6558" strokeWidth="1.2" />
            <line x1={ox + local.w - 3} y1={oy - 15} x2={ox + local.w - 3} y2={oy - 5} stroke="#6b6558" strokeWidth="1.2" />
            <text x={ox + local.w / 2} y={oy - 16} textAnchor="middle">
              가로 {formatCm(boxCm.w)}cm
            </text>
            <line x1={ox - 10} y1={oy + 1} x2={ox - 10} y2={oy + local.h - 5} stroke="#6b6558" strokeWidth="1.2" />
            <line x1={ox - 15} y1={oy + 1} x2={ox - 5} y2={oy + 1} stroke="#6b6558" strokeWidth="1.2" />
            <line x1={ox - 15} y1={oy + local.h - 5} x2={ox - 5} y2={oy + local.h - 5} stroke="#6b6558" strokeWidth="1.2" />
            <text x={ox - 18} y={oy + local.h / 2} textAnchor="middle" transform={`rotate(-90 ${ox - 18} ${oy + local.h / 2})`}>
              세로 {formatCm(boxCm.h)}cm
            </text>
          </g>
        ) : null}
      </svg>
      </div>
      {showSize ? (
        <p className="mt-2 text-center text-[12px] font-semibold tabular-nums text-content-soft">
          칸 {formatCm(GIFT_CELL_PACK_CM.w)}×{formatCm(GIFT_CELL_PACK_CM.h)}cm
        </p>
      ) : null}
      {interactive && !compact ? (
        <p className="mt-1 flex items-center justify-center gap-1 text-[12.5px] text-content-faint">
          <Plus className="h-3.5 w-3.5 shrink-0" />
          빈 칸을 눌러 부위를 담으세요
        </p>
      ) : null}
    </div>
  );
}
