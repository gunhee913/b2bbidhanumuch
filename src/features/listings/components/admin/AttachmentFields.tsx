'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { FileText, Loader2, Plus, RefreshCw, SlidersHorizontal, Star, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { uploadImages } from '@/lib/upload';
import { PhotoEditorDialog } from '@/features/photo-edit/components/PhotoEditorDialog';
import type { CertificateData } from '../../types';
import { moveToCover, uploadPhotoFiles } from '../../lib/listingPhotos';
import { isPdfCertificate } from '../../lib/listingView';

export type CertKind = 'slaughterCert' | 'gradeCert';
export const CERT_KINDS: CertKind[] = ['slaughterCert', 'gradeCert'];
export const CERT_LABEL: Record<CertKind, string> = { slaughterCert: '도축검사증명서', gradeCert: '등급판정확인서' };
const CERT_ACCEPT = 'image/*,application/pdf';
/** 증명서 파일 상한 · 사진 한 장 기준 */
const CERT_MAX_BYTES = 5 * 1024 * 1024;

const THUMB = 'relative h-16 w-16 shrink-0 overflow-hidden border bg-white';
const OVERLAY_BUTTON =
  'absolute flex h-5 w-5 items-center justify-center bg-slate-900/80 text-white opacity-0 transition-opacity hover:bg-slate-900 group-hover:opacity-100 focus-visible:opacity-100';
export const COVER_BADGE = 'pointer-events-none absolute bottom-0 left-0 bg-slate-900/85 px-1 py-px text-[8px] font-semibold leading-none text-white';

type StripSize = 'md' | 'lg' | 'sm';
/** md 는 부위 사진 모달 전용 · 모달 안은 자리가 넉넉해 더 크게 */
const STRIP_THUMB: Record<StripSize, string> = { md: 'h-24 w-24', lg: 'h-16 w-16', sm: 'h-10 w-10' };

interface PhotoStripProps {
  images: string[];
  max: number;
  /** 올리는 중인 장수 · 그만큼 자리표시자 */
  pending: number;
  disabled: boolean;
  size: StripSize;
  /** 첫 장 배지 글자 · 없으면 첫 장도 보통 썸네일 */
  coverBadge?: string;
  coverTitle: string;
  addTitle: string;
  onChange: (images: string[]) => void;
  onFiles: (files: File[]) => void;
  /** 썸네일을 눌렀을 때 · 없으면 썸네일은 보이기만 한다 */
  onView?: (src: string) => void;
  /** 호버에 보정(✂) 단추 · 편집기는 안에서 띄우고 결과 URL 을 같은 자리에 끼운다 */
  editable?: boolean;
  /** 편집기 제목에 붙는 묶음 이름 · 「안심 · 사진 2」 */
  editTitle?: string;
}

/**
 * 사진 묶음 하나 · 썸네일 + 올리는 중 자리 + 추가 칸.
 * 첫 장이 그 묶음의 대표(메인 사진·부위 사진 모두 `images[0]`)라 별(★)로 맨 앞으로 옮긴다.
 */
export function PhotoStrip({ images, max, pending, disabled, size, coverBadge, coverTitle, addTitle, onChange, onFiles, onView, editable, editTitle }: PhotoStripProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<{ src: string; index: number } | null>(null);
  const thumb = cn('relative shrink-0 overflow-hidden border bg-white', STRIP_THUMB[size]);
  const remaining = max - images.length - pending;

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length > 0) onFiles(files);
  };

  const applyEdited = (url: string) => {
    if (editing) onChange(images.map((src, i) => (i === editing.index ? url : src)));
    setEditing(null);
  };

  return (
    <div className="flex items-center gap-1.5">
      {editing ? (
        <PhotoEditorDialog
          src={editing.src}
          title={`${editTitle ?? '사진'} · ${editing.index === 0 ? '대표' : `사진 ${editing.index + 1}`}`}
          onApply={applyEdited}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {images.map((src, index) => {
        const isCover = index === 0;
        const alt = isCover ? coverTitle : `사진 ${index + 1}`;
        return (
          <div key={`${src}-${index}`} className={cn(thumb, 'group', isCover && coverBadge ? 'border-slate-900' : 'border-slate-200')}>
            {onView ? (
              <button type="button" onClick={() => onView(src)} title="크게 보기" className="block h-full w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={alt} className="h-full w-full object-cover" />
              </button>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={src} alt={alt} className="h-full w-full object-cover" />
            )}
            {isCover ? (
              coverBadge && <span className={COVER_BADGE}>{coverBadge}</span>
            ) : (
              <button type="button" onClick={() => onChange(moveToCover(images, index))} title={coverTitle} className={cn(OVERLAY_BUTTON, 'bottom-0 left-0')}>
                <Star className="h-3 w-3" strokeWidth={2.5} />
              </button>
            )}
            <button
              type="button"
              onClick={() => onChange(images.filter((_, i) => i !== index))}
              title="삭제"
              className={cn(OVERLAY_BUTTON, 'right-0 top-0 hover:bg-rose-600')}
            >
              <Trash2 className="h-3 w-3" />
            </button>
            {editable ? (
              <button type="button" onClick={() => setEditing({ src, index })} disabled={disabled} title="보정 · 자르기·회전·밝기" className={cn(OVERLAY_BUTTON, 'bottom-0 right-0')}>
                <SlidersHorizontal className="h-3 w-3" />
              </button>
            ) : null}
          </div>
        );
      })}

      {Array.from({ length: pending }).map((_, index) => (
        <div key={`pending-${index}`} className={cn(thumb, 'flex animate-pulse items-center justify-center border-slate-200 bg-slate-50')}>
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        </div>
      ))}

      {remaining > 0 && (
        <>
          <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            title={addTitle}
            className={cn(
              thumb,
              'flex flex-col items-center justify-center border-dashed border-slate-300 text-slate-400 hover:border-slate-900 hover:text-slate-900 disabled:opacity-40',
            )}
          >
            <Plus className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
            {size !== 'sm' && <span className="mt-0.5 text-[10px]">추가</span>}
          </button>
        </>
      )}
    </div>
  );
}

/** 파일 → data URL · 업로드 API 가 base64 를 받는다 */
const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

/** 증명서 한 장 업로드 · 사진이든 PDF 든 저장소 URL 을 CertificateData 로 감싼다 */
export const uploadCertificate = async (file: File): Promise<CertificateData | null> => {
  const { url } = await uploadImages(await readAsDataUrl(file), 'certificates');
  if (!url) return null;
  return { fileName: file.name, fileData: url, fileType: file.type };
};

/**
 * 파일을 올려 묶음에 붙인다 · 한도를 넘는 장수는 미리 알리고 버린다.
 * 사진 묶음(메인·부위)이 전부 같은 흐름이라 한 군데서 토스트까지 처리한다.
 */
export const uploadPhotosInto = async (
  files: File[],
  current: string[],
  max: number,
  setPending: (n: number) => void,
  append: (urls: string[]) => void,
) => {
  const remaining = max - current.length;
  if (remaining <= 0) return;
  if (files.length > remaining) toast.warning(`사진은 ${max}장까지 · 앞의 ${remaining}장만 올립니다.`);

  setPending(Math.min(files.length, remaining));
  try {
    const { urls, skipped } = await uploadPhotoFiles(files, remaining);
    if (urls.length > 0) append(urls);
    if (skipped > 0) toast.error(`${skipped}장은 이미지가 아니거나 올리지 못했습니다.`);
  } finally {
    setPending(0);
  }
};

interface CertificateFieldProps {
  kind: CertKind;
  cert: CertificateData | null;
  disabled: boolean;
  onChange: (cert: CertificateData | null) => void;
  /** 올리기 시작·끝 · 부모가 「업로드 중」 을 모아 저장 버튼을 잠근다 */
  onPendingChange?: (pending: boolean) => void;
  /** 사진 증명서를 눌렀을 때 · 없으면 썸네일은 보이기만 한다 (PDF 는 늘 새 탭) */
  onView?: (src: string) => void;
}

/**
 * 증명서 칸 하나 · 라벨 + 64px 썸네일. 없으면 붉은 점선으로 「없음」 이 보이게,
 * 있으면 교체·삭제가 손이 닿을 때 뜬다. 업로드는 안에서 끝내고 결과만 돌려준다.
 */
export function CertificateField({ kind, cert, disabled, onChange, onPendingChange, onView }: CertificateFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, setIsPending] = useState(false);
  const label = CERT_LABEL[kind];

  const setPending = (next: boolean) => {
    setIsPending(next);
    onPendingChange?.(next);
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > CERT_MAX_BYTES) {
      toast.error(`${label}은 5MB 이하 파일만 올릴 수 있습니다.`);
      return;
    }

    setPending(true);
    try {
      const uploaded = await uploadCertificate(file);
      if (!uploaded) {
        toast.error(`${label} 업로드에 실패했습니다.`);
        return;
      }
      onChange(uploaded);
    } catch (error) {
      console.error('증명서 업로드 실패:', error);
      toast.error(`${label} 업로드에 실패했습니다.`);
    } finally {
      setPending(false);
    }
  };

  const thumbnail = (() => {
    if (isPending) {
      return (
        <div className={cn(THUMB, 'flex animate-pulse items-center justify-center border-slate-200 bg-slate-50')}>
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        </div>
      );
    }
    if (!cert) {
      return (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          title={`${label} 올리기 (사진 또는 PDF)`}
          className={cn(THUMB, 'flex flex-col items-center justify-center border-dashed border-rose-300 bg-rose-50/40 text-rose-500 hover:border-rose-600 disabled:opacity-40')}
        >
          <Upload className="h-4 w-4" />
          <span className="mt-0.5 text-[10px]">올리기</span>
        </button>
      );
    }
    const isPdf = isPdfCertificate(cert);
    return (
      <div className={cn(THUMB, 'group border-slate-200')}>
        {isPdf ? (
          <a href={cert.fileData} target="_blank" rel="noreferrer" title={cert.fileName} className="flex h-full w-full flex-col items-center justify-center gap-0.5 text-slate-500 hover:text-slate-900">
            <FileText className="h-5 w-5" />
            <span className="text-[9px] font-semibold">PDF</span>
          </a>
        ) : onView ? (
          <button type="button" onClick={() => onView(cert.fileData)} title="크게 보기" className="block h-full w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cert.fileData} alt={label} className="h-full w-full object-cover" />
          </button>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={cert.fileData} alt={label} className="h-full w-full object-cover" />
        )}
        <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled} title="교체" className={cn(OVERLAY_BUTTON, 'bottom-0 left-0')}>
          <RefreshCw className="h-3 w-3" />
        </button>
        <button type="button" onClick={() => onChange(null)} disabled={disabled} title="삭제" className={cn(OVERLAY_BUTTON, 'right-0 top-0 hover:bg-rose-600')}>
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    );
  })();

  return (
    <section>
      <h4 className={cn('mb-2 text-[12px] font-medium', cert ? 'text-slate-500' : 'text-rose-600')}>{label}</h4>
      <input ref={inputRef} type="file" accept={CERT_ACCEPT} className="hidden" onChange={(event) => void handleFile(event)} />
      {thumbnail}
    </section>
  );
}
