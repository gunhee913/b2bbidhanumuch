'use client';

import { useEffect, useRef, useState } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import { useQuery } from '@tanstack/react-query';
import { Eye, FlipHorizontal2, History, Loader2, RotateCcw, RotateCw, Undo2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { ADMIN_BUTTON } from '@/components/admin/buttonStyles';
import { cn } from '@/lib/utils';
import { uploadImage } from '@/lib/upload';
import { fetchImageEdit, saveImageEdit } from '../api';
import { usePhotoEditStore, type RecentEdit } from '../hooks/usePhotoEditStore';
import {
  applyTone,
  blobToDataUrl,
  canvasToBlob,
  cssToneFilter,
  DEFAULT_TONE,
  drawOriented,
  EDIT_ASPECT,
  loadImage,
  PREVIEW_MAX_EDGE,
  renderEditedPhoto,
  rotateBy,
  scaleArea,
  suggestTone,
  TONE_LIMITS,
} from '../lib/photoEdit';
import type { PhotoEditParams, Rotation, ToneParams } from '../types';

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
/** animationend 가 끝내 안 올 때의 보험 · 사진 준비로 메인 스레드가 바쁘면 열림 애니메이션(200ms)이 한참 늦게 시작하므로 넉넉히 */
const OPEN_ANIMATION_FALLBACK_MS = 1500;

export interface PhotoEditorDialogProps {
  /** 지금 화면에 걸린 사진 URL · 보정 결과면 기록을 찾아 원본 위에서 다시 연다 */
  src: string;
  title: string;
  /** 새 결과 URL (또는 「원본으로」 면 원본 URL) · 부르는 쪽이 배열의 같은 자리에 끼운다 */
  onApply: (url: string) => void;
  onClose: () => void;
}

interface PreviewBase {
  /** 반전만 구운 축소본 · 색 보정 전 · 추천값 계산과 미리보기 둘 다 여기서 시작 */
  data: ImageData;
  /** 원본 픽셀 → 축소본 픽셀 배율 */
  scale: number;
}

/**
 * 사진 편집기 · 자르기(4:3) · 회전 90° · 좌우반전 · 확대 · 밝기 · 대비 · 색온도 · 추천 · 전/후.
 *
 * 비파괴 · 결과는 새 파일로 올리고 `image_edits` 에 「원본 + 값」 을 남긴다. 다시 열면 원본 위에
 * 슬라이더가 전 자리에 와 있고, 「원본으로」 는 업로드 없이 원본 URL 로 되돌린다.
 *
 * 미리보기 · 반전과 색온도는 축소본에 직접 굽고(CSS 에 없다), 밝기·대비는 CSS 필터로 즉시.
 * 저장은 같은 식의 LUT 를 쓰므로 본 것과 올라가는 것이 같다. 크로퍼에는 축소본을 주고
 * 잘라낸 좌표를 원본 배율로 되돌려 저장한다.
 */
export function PhotoEditorDialog({ src, title, onApply, onClose }: PhotoEditorDialogProps) {
  const { recent, setRecent } = usePhotoEditStore();
  const editQuery = useQuery({ queryKey: ['image-edit', src], queryFn: () => fetchImageEdit(src), staleTime: 60_000 });
  const edit = editQuery.data ?? null;
  const baseSrc = edit?.originalUrl ?? src;

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tone, setTone] = useState<ToneParams>(DEFAULT_TONE);
  const [rotation, setRotation] = useState<Rotation>(0);
  const [flip, setFlip] = useState(false);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPx, setAreaPx] = useState<Area | null>(null);
  /** 저장된 자르기 좌표 · 첫 로드에만 넘기고 비운다 (크로퍼가 그림이 바뀔 때마다 다시 적용해 버린다) */
  const [initialArea, setInitialArea] = useState<Area | undefined>(undefined);
  const [preview, setPreview] = useState<PreviewBase | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [plainUrl, setPlainUrl] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);
  const [saving, setSaving] = useState(false);
  /** 다이얼로그 열림 애니메이션(scale 0.95→1)이 끝난 뒤에 크로퍼를 올린다 · 축소된 상태에서 재면 자르기 틀이 작게 잡힌다 */
  const [settled, setSettled] = useState(false);
  const paramsSeeded = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(true), OPEN_ANIMATION_FALLBACK_MS);
    return () => window.clearTimeout(timer);
  }, []);

  // 1) 기록이 오면 슬라이더·방향을 그 값으로 (한 번만)
  useEffect(() => {
    if (editQuery.isPending || paramsSeeded.current) return;
    paramsSeeded.current = true;
    if (!edit) return;
    const { area, rotation: r, flip: f, ...t } = edit.params;
    setTone(t);
    setRotation(r);
    setFlip(f);
    setInitialArea(area);
  }, [edit, editQuery.isPending]);

  // 2) 원본 로드
  useEffect(() => {
    if (editQuery.isPending) return;
    let cancelled = false;
    setImg(null);
    setLoadError(null);
    loadImage(baseSrc)
      .then((loaded) => {
        if (!cancelled) setImg(loaded);
      })
      .catch((error: Error) => {
        if (!cancelled) setLoadError(error.message);
      });
    return () => {
      cancelled = true;
    };
  }, [baseSrc, editQuery.isPending]);

  // 3) 반전만 구운 축소본 · 반전이 바뀌면 다시
  useEffect(() => {
    if (!img) return;
    const { canvas, scale } = drawOriented(img, flip, 0, PREVIEW_MAX_EDGE);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setPreview({ data: ctx.getImageData(0, 0, canvas.width, canvas.height), scale });
    // 저장된 자르기 좌표는 원본 배율 → 축소본 배율로
    setInitialArea((prev) => (prev ? scaleArea(prev, scale) : prev));
  }, [img, flip]);

  // 4) 전/후 비교용 · 색 보정 없는 축소본 URL
  useEffect(() => {
    if (!preview) return;
    let url: string | null = null;
    let cancelled = false;
    void imageDataToUrl(preview.data).then((made) => {
      if (cancelled) {
        URL.revokeObjectURL(made);
        return;
      }
      url = made;
      setPlainUrl(made);
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [preview]);

  // 5) 색온도만 구운 미리보기 URL · 슬라이더가 멈추면 60ms 뒤에
  useEffect(() => {
    if (!preview) return;
    let url: string | null = null;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const copy = new ImageData(new Uint8ClampedArray(preview.data.data), preview.data.width, preview.data.height);
      applyTone(copy.data, { ...DEFAULT_TONE, temperature: tone.temperature });
      void imageDataToUrl(copy).then((made) => {
        if (cancelled) {
          URL.revokeObjectURL(made);
          return;
        }
        url = made;
        setPreviewUrl(made);
      });
    }, 60);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (url) URL.revokeObjectURL(url);
    };
  }, [preview, tone.temperature]);

  const isReady = settled && !!previewUrl && !!plainUrl && !loadError;
  const cropperImage = (comparing ? plainUrl : previewUrl) ?? undefined;

  const setToneValue = (key: keyof ToneParams) => (value: number) => setTone((prev) => ({ ...prev, [key]: value }));

  const handleFlip = () => {
    setFlip((prev) => !prev);
    setCrop((prev) => ({ x: -prev.x, y: prev.y }));
  };

  const handleAuto = () => {
    if (!preview) return;
    setTone(suggestTone(preview.data.data));
  };

  const handleRecent = () => {
    if (!recent) return;
    const { rotation: r, flip: f, ...t } = recent;
    setTone(t);
    setRotation(r);
    if (f !== flip) handleFlip();
  };

  const handleReset = () => {
    setTone(DEFAULT_TONE);
    setRotation(0);
    setFlip(false);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleApply = async () => {
    if (!preview || !areaPx) return;
    setSaving(true);
    try {
      const params: PhotoEditParams = { ...tone, rotation, flip, area: scaleArea(areaPx, 1 / preview.scale) };
      const blob = await renderEditedPhoto(baseSrc, params);
      const url = await uploadImage(await blobToDataUrl(blob), 'listings');
      if (!url) throw new Error('보정한 사진을 올리지 못했습니다.');
      // 기록 저장이 실패해도 사진은 이미 올라갔다 · 되돌리기만 못 하게 되므로 알리고 진행
      try {
        await saveImageEdit({ editedUrl: url, originalUrl: baseSrc, params });
      } catch (error) {
        console.error('보정 기록 저장 실패:', error);
        toast.warning('보정 기록을 저장하지 못해 이 사진은 「원본으로 되돌리기」 가 되지 않습니다.');
      }
      setRecent({ ...tone, rotation, flip });
      onApply(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '보정을 적용하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent
        className="max-w-[760px] gap-0 overflow-hidden rounded-[2px] p-0 text-slate-900"
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) setSettled(true);
        }}
      >
        <div className="border-b border-slate-200 px-5 py-3 pr-12">
          <DialogTitle className="text-[15px] font-bold leading-tight">{title}</DialogTitle>
          <DialogDescription className="mt-0.5 text-[11.5px] text-slate-500">
            드래그로 위치 · 휠/핀치로 확대 · 보정 범위는 실물이 달라 보이지 않는 선에서 제한됩니다
            {edit ? ' · 원본 위에서 다시 열었습니다' : ''}
          </DialogDescription>
        </div>

        <div className="relative h-[400px] bg-slate-950">
          {isReady ? (
            <Cropper
              image={cropperImage}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={EDIT_ASPECT}
              minZoom={MIN_ZOOM}
              maxZoom={MAX_ZOOM}
              showGrid={false}
              initialCroppedAreaPixels={initialArea}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setAreaPx(pixels)}
              onMediaLoaded={() => setInitialArea(undefined)}
              style={{
                containerStyle: { background: '#020617' },
                mediaStyle: { filter: comparing ? 'none' : cssToneFilter(tone), transition: 'filter 80ms' },
                cropAreaStyle: { border: '1px solid rgba(255,255,255,0.85)', boxShadow: '0 0 0 9999em rgba(2,6,23,0.72)' },
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[12px] text-slate-400">
              {loadError ?? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> 사진 불러오는 중
                </span>
              )}
            </div>
          )}
          {comparing && (
            <span className="pointer-events-none absolute left-3 top-3 rounded-[2px] bg-white/90 px-1.5 py-0.5 text-[10.5px] font-semibold text-slate-900">
              보정 전
            </span>
          )}
        </div>

        <div className="space-y-3 px-5 py-3">
          <div className="flex items-center gap-1.5">
            <ToolButton icon={RotateCcw} label="왼쪽으로 90°" onClick={() => setRotation((r) => rotateBy(r, -90))} disabled={!isReady} />
            <ToolButton icon={RotateCw} label="오른쪽으로 90°" onClick={() => setRotation((r) => rotateBy(r, 90))} disabled={!isReady} />
            <ToolButton icon={FlipHorizontal2} label="좌우 반전" onClick={handleFlip} disabled={!isReady} active={flip} />
            <label className="ml-2 flex items-center gap-2 text-[11.5px] text-slate-500">
              확대
              <input
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.01}
                value={zoom}
                disabled={!isReady}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="h-1 w-28 cursor-pointer accent-slate-900"
                aria-label="확대"
              />
              <span className="w-8 tabular-nums text-slate-700">{zoom.toFixed(1)}×</span>
            </label>
            <div className="flex-1" />
            <button
              type="button"
              onClick={handleAuto}
              disabled={!isReady}
              title="추천값 제안 · 어두운 사진을 밝히고 조명 색을 중립으로 · 밝은 사진은 거의 건드리지 않습니다"
              className={ADMIN_BUTTON.secondary}
            >
              <Wand2 className="h-3.5 w-3.5" /> 추천
            </button>
            <button type="button" onClick={handleRecent} disabled={!isReady || !recent} title={recent ? recentSummary(recent) : '아직 적용한 설정이 없습니다'} className={ADMIN_BUTTON.secondary}>
              <History className="h-3.5 w-3.5" /> 최근 설정
            </button>
            <button type="button" onClick={handleReset} disabled={!isReady} className={ADMIN_BUTTON.secondary}>
              <Undo2 className="h-3.5 w-3.5" /> 초기화
            </button>
            <button
              type="button"
              disabled={!isReady}
              onPointerDown={() => setComparing(true)}
              onPointerUp={() => setComparing(false)}
              onPointerLeave={() => setComparing(false)}
              onPointerCancel={() => setComparing(false)}
              onKeyDown={(e) => e.key === ' ' && setComparing(true)}
              onKeyUp={(e) => e.key === ' ' && setComparing(false)}
              title="누르고 있는 동안 보정 전 사진"
              className={cn(ADMIN_BUTTON.secondary, 'select-none', comparing && 'border-slate-900 bg-slate-100')}
            >
              <Eye className="h-3.5 w-3.5" /> 보정 전
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <ToneSlider label="밝기" value={tone.brightness} limit={TONE_LIMITS.brightness} disabled={!isReady} onChange={setToneValue('brightness')} />
            <ToneSlider label="대비" value={tone.contrast} limit={TONE_LIMITS.contrast} disabled={!isReady} onChange={setToneValue('contrast')} />
            <ToneSlider label="색온도" value={tone.temperature} limit={TONE_LIMITS.temperature} disabled={!isReady} onChange={setToneValue('temperature')} ends={['차갑게', '따뜻하게']} />
          </div>
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <div>
            {edit ? (
              <button type="button" onClick={() => onApply(edit.originalUrl)} disabled={saving} className="text-[11.5px] font-medium text-slate-600 underline-offset-2 hover:underline disabled:text-slate-300">
                원본으로 되돌리기
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} disabled={saving} className={ADMIN_BUTTON.secondary}>
              취소
            </button>
            <button type="button" onClick={() => void handleApply()} disabled={!isReady || !areaPx || saving} className={ADMIN_BUTTON.primary}>
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> 올리는 중
                </>
              ) : (
                '적용'
              )}
            </button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

const recentSummary = (recent: RecentEdit) =>
  `밝기 ${signed(recent.brightness)} · 대비 ${signed(recent.contrast)} · 색온도 ${signed(recent.temperature)}${recent.rotation ? ` · 회전 ${recent.rotation}°` : ''}${recent.flip ? ' · 반전' : ''}`;

const signed = (value: number) => (value > 0 ? `+${value}` : String(value));

async function imageDataToUrl(data: ImageData): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = data.width;
  canvas.height = data.height;
  canvas.getContext('2d')?.putImageData(data, 0, 0);
  // 미리보기는 PNG · JPEG 로 두 번 압축하면 밝기 비교가 미묘하게 어긋난다
  return URL.createObjectURL(await canvasToBlob(canvas, 'image/png'));
}

function ToolButton({ icon: Icon, label, onClick, disabled, active }: { icon: typeof RotateCw; label: string; onClick: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-[2px] border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-900 hover:text-slate-900 disabled:opacity-40',
        active && 'border-slate-900 bg-slate-900 text-white hover:text-white',
      )}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
    </button>
  );
}

function ToneSlider({ label, value, limit, disabled, onChange, ends }: { label: string; value: number; limit: number; disabled?: boolean; onChange: (value: number) => void; ends?: [string, string] }) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-[11.5px] text-slate-500">
        {label}
        <button
          type="button"
          onClick={() => onChange(0)}
          disabled={disabled || value === 0}
          title="0 으로"
          className={cn('tabular-nums text-slate-700', value !== 0 && 'font-semibold hover:underline', value === 0 && 'cursor-default')}
        >
          {signed(value)}
        </button>
      </span>
      <input
        type="range"
        min={-limit}
        max={limit}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        onDoubleClick={() => onChange(0)}
        aria-label={label}
        className="mt-1 h-1 w-full cursor-pointer accent-slate-900 disabled:cursor-default"
      />
      {ends ? (
        <span className="mt-0.5 flex justify-between text-[10px] text-slate-400">
          <span>{ends[0]}</span>
          <span>{ends[1]}</span>
        </span>
      ) : null}
    </label>
  );
}
