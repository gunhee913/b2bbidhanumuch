'use client';

import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ADMIN_BUTTON } from '@/components/admin/buttonStyles';
import { cn } from '@/lib/utils';
import type { CertificateData } from '../../types';
import { MAX_LISTING_PHOTOS, MAX_PART_PHOTOS } from '../../lib/listingPhotos';
import { splitPartsIntoColumns, type ListingView, type PartView } from '../../lib/listingView';
import { PARTS_GRID, partNoLabel } from './PartsTable';
import { CERT_KINDS, CertificateField, PhotoStrip, uploadPhotosInto, type CertKind } from './AttachmentFields';

export interface AttachmentUpdates {
  images: string[];
  slaughterCert: CertificateData | null;
  gradeCert: CertificateData | null;
  /** 바뀐 부위만 · partId → 사진 목록 */
  partImages: Record<string, string[]>;
}

interface AttachmentEditorProps {
  listing: ListingView;
  onCancel: () => void;
  onSave: (updates: AttachmentUpdates) => Promise<void>;
}

const toPartImages = (parts: PartView[]): Record<string, string[]> => Object.fromEntries(parts.map((part) => [part.id, part.images]));
const sameImages = (a: string[], b: string[]) => a.length === b.length && a.every((src, i) => src === b[i]);

const sameCert = (a: CertificateData | null, b: CertificateData | null) => (a?.fileData ?? null) === (b?.fileData ?? null);

/**
 * 펼친 행 안에서 사진·증명서를 바로 고치는 편집기 · 상장 수정 폼과 같은 자리에서 열린다.
 * 첫 장이 중도매인 화면의 대표 사진이라 별(★)로 맨 앞으로 옮길 수 있다.
 */
export function AttachmentEditor({ listing, onCancel, onSave }: AttachmentEditorProps) {
  const [images, setImages] = useState<string[]>(listing.images);
  const [certs, setCerts] = useState<Record<CertKind, CertificateData | null>>({
    slaughterCert: listing.slaughterCert,
    gradeCert: listing.gradeCert,
  });
  const [partImages, setPartImages] = useState<Record<string, string[]>>(() => toPartImages(listing.parts));
  /** 올리는 중인 사진 수 · 그 수만큼 자리표시자를 그린다 */
  const [pendingPhotos, setPendingPhotos] = useState(0);
  const [pendingPartPhotos, setPendingPartPhotos] = useState<Record<string, number>>({});
  const [pendingCerts, setPendingCerts] = useState<Record<CertKind, boolean>>({ slaughterCert: false, gradeCert: false });
  const [isSaving, setIsSaving] = useState(false);

  const changedPartImages = Object.fromEntries(
    listing.parts.filter((part) => !sameImages(partImages[part.id] ?? [], part.images)).map((part) => [part.id, partImages[part.id] ?? []]),
  );
  const isUploading = pendingPhotos > 0 || Object.values(pendingCerts).some(Boolean) || Object.values(pendingPartPhotos).some((n) => n > 0);
  const isDirty =
    !sameImages(images, listing.images) ||
    !sameCert(certs.slaughterCert, listing.slaughterCert) ||
    !sameCert(certs.gradeCert, listing.gradeCert) ||
    Object.keys(changedPartImages).length > 0;

  const partColumns = useMemo(() => splitPartsIntoColumns(listing.parts), [listing.parts]);

  const handlePhotoFiles = (files: File[]) =>
    uploadPhotosInto(files, images, MAX_LISTING_PHOTOS, setPendingPhotos, (urls) => setImages((prev) => [...prev, ...urls].slice(0, MAX_LISTING_PHOTOS)));

  const handlePartPhotoFiles = (part: PartView, files: File[]) =>
    uploadPhotosInto(
      files,
      partImages[part.id] ?? [],
      MAX_PART_PHOTOS,
      (n) => setPendingPartPhotos((prev) => ({ ...prev, [part.id]: n })),
      (urls) => setPartImages((prev) => ({ ...prev, [part.id]: [...(prev[part.id] ?? []), ...urls].slice(0, MAX_PART_PHOTOS) })),
    );

  const setPartPhotos = (part: PartView, next: string[]) => setPartImages((prev) => ({ ...prev, [part.id]: next }));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ images, slaughterCert: certs.slaughterCert, gradeCert: certs.gradeCert, partImages: changedPartImages });
    } catch (error) {
      console.error('첨부 저장 실패:', error);
      toast.error('첨부 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mb-4 border border-slate-900 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-semibold text-slate-900">첨부 편집</span>
          <span className="text-[12px] text-slate-500">첫 번째 사진이 중도매인 화면의 메인 사진입니다 · 별을 누르면 그 사진이 맨 앞으로 갑니다.</span>
        </div>
      </div>

      <div className="flex items-start gap-8 px-4 py-4">
        <section>
          <h4 className="mb-2 text-[12px] font-medium text-slate-500">
            메인 사진 <span className="tabular-nums text-slate-400">{images.length}/{MAX_LISTING_PHOTOS}</span>
          </h4>
          <PhotoStrip
            images={images}
            max={MAX_LISTING_PHOTOS}
            pending={pendingPhotos}
            disabled={isUploading}
            size="lg"
            coverBadge="메인"
            coverTitle="메인 사진으로"
            addTitle="사진 추가"
            onChange={setImages}
            onFiles={handlePhotoFiles}
            editable
            editTitle="메인 사진"
          />
        </section>

        <div className="mt-6 h-16 w-px bg-slate-200" aria-hidden />

        {CERT_KINDS.map((kind) => (
          <CertificateField
            key={kind}
            kind={kind}
            cert={certs[kind]}
            disabled={isUploading}
            onChange={(cert) => setCerts((prev) => ({ ...prev, [kind]: cert }))}
            onPendingChange={(pending) => setPendingCerts((prev) => ({ ...prev, [kind]: pending }))}
          />
        ))}
      </div>

      <section className="border-t border-slate-200 px-4 py-3">
        <h4 className="mb-2 flex items-baseline gap-2 text-[12px] font-medium text-slate-500">
          부위별 사진
          <span className="font-normal text-slate-400">부위마다 {MAX_PART_PHOTOS}장까지 · 비워 두면 경매장은 대표사진(설정)으로 대신합니다</span>
        </h4>
        <div className={PARTS_GRID}>
          {partColumns.map((column, columnIndex) => (
            <ul key={columnIndex} className="divide-y divide-slate-100 border border-slate-200 bg-white">
              {column.map((part) => (
                <li key={part.id} className="flex h-12 items-center gap-3 px-3">
                  <span className="w-5 shrink-0 text-[12px] tabular-nums text-slate-400">{partNoLabel(part.partNo)}</span>
                  <span className={cn('w-14 shrink-0 text-[13px]', part.isIncluded ? 'text-slate-900' : 'text-slate-400 line-through')}>{part.name}</span>
                  <PhotoStrip
                    images={partImages[part.id] ?? []}
                    max={MAX_PART_PHOTOS}
                    pending={pendingPartPhotos[part.id] ?? 0}
                    disabled={isUploading}
                    size="sm"
                    coverTitle={`${part.name} 첫 장으로`}
                    addTitle={`${part.name} 사진 추가`}
                    onChange={(next) => setPartPhotos(part, next)}
                    onFiles={(files) => void handlePartPhotoFiles(part, files)}
                    editable
                    editTitle={part.name}
                  />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </section>

      <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
        <span className="text-[12px] text-slate-500">
          {isUploading ? '업로드 중…' : isDirty ? '저장하지 않은 변경이 있습니다.' : ''}
        </span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onCancel} disabled={isSaving} className={ADMIN_BUTTON.secondary}>
            취소
          </button>
          <button type="button" onClick={handleSave} disabled={!isDirty || isSaving || isUploading} className={ADMIN_BUTTON.primary}>
            {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            저장
          </button>
        </div>
      </footer>
    </div>
  );
}
