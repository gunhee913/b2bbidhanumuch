'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Printer, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/** 이 사진이 어디서 왔는가 · 색과 표시 문구가 여기에 따라 갈린다 */
export type LightboxKind = 'listing' | 'cert' | 'part' | 'partGroup';

export interface LightboxItem {
  src: string;
  /** 「사진 2」 「도축검사증명서」 「01 등심(좌) · 1/2」 처럼 그 장이 무엇인지 */
  label: string;
  kind: LightboxKind;
}

interface KindStyle {
  tag: string;
  /** 썸네일 구석에 들어갈 짧은 글자 */
  short: string;
  /** 한 줄 설명 · 실제 사진인지 대체 사진인지 */
  hint: string;
  chip: string;
}

/** 배지 색 · 채도를 낮춘 짙은 톤에 반투명, 사진 위에서 튀지 않게 */
export const LIGHTBOX_KIND_STYLE: Record<LightboxKind, KindStyle> = {
  listing: { tag: '메인 사진', short: '메인', hint: '상장 등록 때 올린 이 개체의 실제 사진', chip: 'bg-slate-700/85 text-slate-50' },
  cert: { tag: '증명서', short: '증명서', hint: '첨부 서류', chip: 'bg-slate-600/85 text-slate-50' },
  part: { tag: '실제 사진', short: '실제사진', hint: '업체가 이 부위를 직접 찍어 올린 사진', chip: 'bg-emerald-800/85 text-emerald-50' },
  partGroup: {
    tag: '대표사진',
    short: '대표사진',
    hint: '올린 사진이 없어 「부위 대표이미지 설정」의 사진으로 대신 나간다 · 이 개체 사진이 아님',
    chip: 'bg-amber-700/85 text-amber-50',
  },
};

interface ImageLightboxProps {
  /** 상장 접수번호 · 위쪽 제목 */
  title: string;
  items: LightboxItem[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

/** 아래 썸네일 줄에서 띄어 보여주는 묶음 · 상장 사진·증명서 / 부위별 */
const SECTION_OF: Record<LightboxKind, 'listing' | 'parts'> = {
  listing: 'listing',
  cert: 'listing',
  part: 'parts',
  partGroup: 'parts',
};

/** 사진 오른쪽 아래에 붙는 출처 배지 */
function KindBadge({ kind, size }: { kind: LightboxKind; size: 'thumb' | 'main' }) {
  const style = LIGHTBOX_KIND_STYLE[kind];
  return (
    <span
      className={cn(
        'pointer-events-none absolute bottom-0 right-0 font-bold leading-none',
        size === 'thumb' && 'px-1 py-[3px] text-[8px]',
        size === 'main' && 'rounded-tl-[2px] px-2 py-1.5 text-[12px]',
        style.chip,
      )}
    >
      {size === 'thumb' ? style.short : style.tag}
    </span>
  );
}

const ICON_BUTTON =
  'flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 disabled:opacity-20 disabled:hover:bg-white/10';

/** 이미지 한 장을 새 창에 그려 인쇄 · 팝업이 막히면 false */
const printImage = (src: string, title: string): boolean => {
  const win = window.open('', '_blank');
  if (!win) return false;
  win.document.write(`<!doctype html><html><head><title>${title}</title>
    <style>@page{size:A4;margin:10mm}body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh}img{max-width:100%;max-height:100vh;object-fit:contain}</style>
    </head><body><img src="${src}" onload="window.print();window.close()" /></body></html>`);
  win.document.close();
  return true;
};

/**
 * 썸네일을 눌렀을 때 바로 뜨는 확대 뷰어 · 검정 배경, ←/→ 로 같은 상장의 다른 첨부로 이동.
 * 표 안 어디서 열어도 화면 전체를 덮도록 body 에 포털로 그린다.
 */
export function ImageLightbox({ title, items, index, onIndexChange, onClose }: ImageLightboxProps) {
  const current = items[index];
  const hasPrev = index > 0;
  const hasNext = index < items.length - 1;
  const style = current ? LIGHTBOX_KIND_STYLE[current.kind] : null;

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && hasPrev) onIndexChange(index - 1);
      if (event.key === 'ArrowRight' && hasNext) onIndexChange(index + 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [hasNext, hasPrev, index, onClose, onIndexChange]);

  if (!current || !style || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal
      aria-label={`${title} ${current.label}`}
      className="fixed inset-0 z-[70] flex flex-col bg-black/90"
      onClick={onClose}
    >
      <header className="flex h-14 shrink-0 items-center justify-between px-5 text-white" onClick={(event) => event.stopPropagation()}>
        <div className="flex min-w-0 items-center gap-3">
          <span className="shrink-0 text-[15px] font-semibold">{title}</span>
          <span className="shrink-0 text-[13px] text-white/90">{current.label}</span>
          <span className="truncate text-[12px] text-white/50">{style.hint}</span>
          <span className="shrink-0 text-[13px] tabular-nums text-white/50">
            {index + 1} / {items.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => printImage(current.src, `${title} ${current.label}`)} title="인쇄" className={ICON_BUTTON}>
            <Printer className="h-4 w-4" />
          </button>
          <button type="button" onClick={onClose} title="닫기 (Esc)" className={ICON_BUTTON}>
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-20 pb-6">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onIndexChange(index - 1);
          }}
          disabled={!hasPrev}
          title="이전 (←)"
          className={cn(ICON_BUTTON, 'absolute left-5 top-1/2 h-11 w-11 -translate-y-1/2')}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <figure className="relative max-h-full max-w-full" onClick={(event) => event.stopPropagation()}>
          {/* eslint-disable-next-line @next/next/no-img-element -- 업로드 원본 그대로 */}
          <img src={current.src} alt={current.label} className="max-h-[calc(100vh-11rem)] max-w-full select-none object-contain shadow-2xl" />
          <KindBadge kind={current.kind} size="main" />
        </figure>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onIndexChange(index + 1);
          }}
          disabled={!hasNext}
          title="다음 (→)"
          className={cn(ICON_BUTTON, 'absolute right-5 top-1/2 h-11 w-11 -translate-y-1/2')}
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      {items.length > 1 && (
        <nav className="flex max-w-[96vw] shrink-0 flex-wrap justify-center gap-1.5 self-center pb-5" onClick={(event) => event.stopPropagation()}>
          {items.map((item, itemIndex) => {
            const isSectionStart = itemIndex > 0 && SECTION_OF[items[itemIndex - 1].kind] !== SECTION_OF[item.kind];
            return (
              <button
                key={`${item.src}-${itemIndex}`}
                type="button"
                onClick={() => onIndexChange(itemIndex)}
                title={`${LIGHTBOX_KIND_STYLE[item.kind].tag} · ${item.label}`}
                className={cn(
                  'relative h-14 w-14 overflow-hidden border-2 transition-opacity',
                  isSectionStart && 'ml-4',
                  itemIndex === index ? 'border-white opacity-100' : 'border-transparent opacity-60 hover:opacity-100',
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.src} alt="" className="h-full w-full object-cover" />
                <KindBadge kind={item.kind} size="thumb" />
              </button>
            );
          })}
        </nav>
      )}
    </div>,
    document.body,
  );
}
