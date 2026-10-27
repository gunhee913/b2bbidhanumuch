'use client';

import { useCallback, useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ADMIN_BUTTON } from '@/components/admin/buttonStyles';
import { usePartGroupImageLookup } from '@/features/part-group-images/hooks/usePartGroupImages';
import type { CertificateData } from '../../types';
import { resolveFormPartCover } from '../../lib/listingPhotos';
import { isPdfCertificate, type ListingView, type PartView } from '../../lib/listingView';
import { isPartPhotoShown, PartsTable, partNoLabel, type PartCover } from './PartsTable';
import { ListingEditForm, type EditMode } from './ListingEditForm';
import { AttachmentEditor, type AttachmentUpdates } from './AttachmentEditor';
import { ImageLightbox, type LightboxItem } from './ImageLightbox';

interface ListingDetailProps {
  listing: ListingView;
  /** null 이면 조회, 값이 있으면 그 모드의 수정 폼을 펼친 행 안에 보여 준다 */
  editMode: EditMode | null;
  onStartEdit: (mode: EditMode) => void;
  onCancelEdit: () => void;
  onSaved: () => void;
  onSaveAttachments: (updates: AttachmentUpdates) => Promise<void>;
  onRevertApproval: () => void;
  onDelete: () => void;
  isBusy: boolean;
}

interface LightboxState {
  items: LightboxItem[];
  index: number;
}

/** 펼친 행이 길어지지 않게 첨부는 한 줄(40px)로 · 라벨은 썸네일 왼쪽에 세로 두 줄까지 */
const THUMB = 'relative h-10 w-10 shrink-0 overflow-hidden border bg-white';
const THUMB_BUTTON = 'block focus:outline-none focus-visible:ring-1 focus-visible:ring-slate-900 disabled:cursor-default';

/** 사진 한 장 · 누르면 확대 뷰어 */
function Thumb({ src, alt, badge, onClick, disabled }: { src: string; alt: string; badge?: string; onClick: () => void; disabled: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={alt} className={cn(THUMB, THUMB_BUTTON, 'border-slate-200 hover:border-slate-900')}>
      {/* eslint-disable-next-line @next/next/no-img-element -- 업로드 원본 그대로 */}
      <img src={src} alt={alt} className="h-full w-full object-cover" />
      {badge && <span className="pointer-events-none absolute bottom-0 left-0 bg-slate-900/85 px-1 py-px text-[8px] font-semibold leading-none text-white">{badge}</span>}
    </button>
  );
}

/** PDF 증명서 · 새 탭으로 연다 */
function PdfThumb({ cert, label }: { cert: CertificateData; label: string }) {
  return (
    <a
      href={cert.fileData}
      target="_blank"
      rel="noreferrer"
      title={`${label} · ${cert.fileName}`}
      className={cn(THUMB, 'flex flex-col items-center justify-center gap-0.5 border-slate-200 text-slate-500 hover:border-slate-900 hover:text-slate-900')}
    >
      <FileText className="h-4 w-4" />
      <span className="text-[8px] font-semibold">PDF</span>
    </a>
  );
}

/** 자리만 있는 빈 썸네일 · 없다는 사실이 보이도록 점선 + 붉은 라벨 */
function EmptyThumb({ label }: { label: string }) {
  return (
    <span title={`${label} 없음`} className={cn(THUMB, 'flex items-center justify-center border-dashed border-rose-300 bg-rose-50/40')}>
      <span className="text-[9px] font-medium text-rose-500">없음</span>
    </span>
  );
}

/** 작은 동작 버튼 · 그 묶음(첨부·부위) 안의 것만 고친다 */
const SMALL_ACTION = cn(ADMIN_BUTTON.secondary, 'h-6 px-2 text-[11px]');

/** 라벨을 썸네일 왼쪽에 · 줄바꿈 위치를 라벨 문자열의 `\n` 으로 정해 「도축검사 / 증명서」처럼 뜻 단위로 접는다 */
function ThumbGroup({ label, missing, children }: { label: string; missing?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn('whitespace-pre-line text-right text-[11px] leading-[14px]', missing ? 'font-medium text-rose-600' : 'text-slate-500')}>{label}</span>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  );
}

/** 상장 사진 + 이미지 증명서를 뷰어 순서대로 · PDF 는 뷰어에 못 띄우므로 뺀다 */
const listingLightboxItems = (listing: ListingView): LightboxItem[] => [
  ...listing.images.map((src, index) => ({ src, label: index === 0 ? '사진 1 (메인)' : `사진 ${index + 1}`, kind: 'listing' as const })),
  ...(listing.slaughterCert && !isPdfCertificate(listing.slaughterCert) ? [{ src: listing.slaughterCert.fileData, label: '도축검사증명서', kind: 'cert' as const }] : []),
  ...(listing.gradeCert && !isPdfCertificate(listing.gradeCert) ? [{ src: listing.gradeCert.fileData, label: '등급판정확인서', kind: 'cert' as const }] : []),
];

/** 펼친 행 · 첨부 썸네일, 부위 표(또는 수정 폼), 행 동작 */
export function ListingDetail({
  listing,
  editMode,
  onStartEdit,
  onCancelEdit,
  onSaved,
  onSaveAttachments,
  onRevertApproval,
  onDelete,
  isBusy,
}: ListingDetailProps) {
  const [isEditingAttachments, setIsEditingAttachments] = useState(false);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);

  const isPending = listing.status === '대기';
  const isApproved = listing.status === '승인';
  const isAuction = listing.status === '경매중';
  const isEditingForm = editMode !== null;
  const isLocked = isEditingForm || isEditingAttachments;
  // 상장 부위가 전부 낙찰됐으면 고칠 최저가가 없다
  const hasUnsoldPart = listing.parts.some((part) => part.isIncluded && !part.bidPrice);
  const photoCount = listing.images.length;

  // 경매장과 같은 순서로 부위 사진을 정한다 · 부위 사진 → 업체 부위 대표이미지 → 개체 대표 사진
  const groupImage = usePartGroupImageLookup();
  const resolvePartCover = useCallback(
    (part: PartView): PartCover =>
      resolveFormPartCover({
        partImages: part.images,
        listingImages: listing.images,
        companyId: listing.companyId,
        partName: part.name,
        lookup: groupImage,
      }),
    [groupImage, listing.companyId, listing.images],
  );

  // 이 개체의 사진을 전부 한 줄로 · 상장 사진 → 증명서 → 부위 순서. 어디서 열어도 ←/→ 로 끝까지 넘겨 본다
  const gallery = useMemo(() => {
    const items = listingLightboxItems(listing);
    const firstIndexByPartNo = new Map<number, number>();
    listing.parts.forEach((part) => {
      const cover = resolvePartCover(part);
      if (!cover.src || !isPartPhotoShown(cover.source)) return;
      firstIndexByPartNo.set(part.partNo, items.length);
      const prefix = `${partNoLabel(part.partNo)} ${part.name}`;
      if (cover.source === 'part') {
        part.images.forEach((src, n) => items.push({ src, label: `${prefix} · ${n + 1}/${part.images.length}`, kind: 'part' }));
        return;
      }
      items.push({ src: cover.src, label: prefix, kind: 'partGroup' });
    });
    return { items, firstIndexByPartNo };
  }, [listing, resolvePartCover]);

  const openListingLightbox = (src: string) => {
    setLightbox({ items: gallery.items, index: Math.max(0, gallery.items.findIndex((item) => item.kind !== 'part' && item.src === src)) });
  };

  const openPartLightbox = (part: PartView) => {
    const index = gallery.firstIndexByPartNo.get(part.partNo);
    if (index === undefined) return;
    setLightbox({ items: gallery.items, index });
  };

  const handleSaveAttachments = async (updates: AttachmentUpdates) => {
    await onSaveAttachments(updates);
    setIsEditingAttachments(false);
  };

  return (
    <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
      {isEditingForm ? (
        <ListingEditForm key={listing.id} listing={listing} mode={editMode} onCancel={onCancelEdit} onSaved={onSaved} />
      ) : (
        <PartsTable
          listingNo={listing.listingNo}
          parts={listing.parts}
          resolveCover={resolvePartCover}
          onOpenPartPhotos={isEditingAttachments ? undefined : openPartLightbox}
          footerAction={
            isAuction && hasUnsoldPart ? (
              <button type="button" onClick={() => onStartEdit('minPrice')} disabled={isLocked || isBusy} className={SMALL_ACTION}>
                최저가격 수정
              </button>
            ) : null
          }
        />
      )}

      {/* 첨부는 부위 표 아래 · 등록 화면과 같은 순서(개체 정보 → 부위 → 메인 사진·증명서) */}
      {isEditingAttachments ? (
        <div className="mt-3">
          <AttachmentEditor listing={listing} onCancel={() => setIsEditingAttachments(false)} onSave={handleSaveAttachments} />
        </div>
      ) : (
        <div className="mt-3 flex h-10 items-center justify-between">
          <div className="flex items-center gap-4">
            <ThumbGroup label={photoCount > 0 ? `메인 사진\n${photoCount}장` : '메인 사진\n없음'} missing={photoCount === 0}>
              {photoCount > 0 ? (
                listing.images.map((src, index) => (
                  <Thumb
                    key={`${src}-${index}`}
                    src={src}
                    alt={index === 0 ? '메인 사진 1 (메인)' : `메인 사진 ${index + 1}`}
                    badge={index === 0 ? '메인' : undefined}
                    onClick={() => openListingLightbox(src)}
                    disabled={isLocked}
                  />
                ))
              ) : (
                <EmptyThumb label="메인 사진" />
              )}
            </ThumbGroup>

            <div className="h-8 w-px bg-slate-200" aria-hidden />

            {(
              [
                ['slaughterCert', '도축검사증명서', '도축검사\n증명서'],
                ['gradeCert', '등급판정확인서', '등급판정\n확인서'],
              ] as const
            ).map(([key, label, wrappedLabel]) => {
              const cert = listing[key];
              return (
                <ThumbGroup key={key} label={wrappedLabel} missing={!cert}>
                  {!cert ? (
                    <EmptyThumb label={label} />
                  ) : isPdfCertificate(cert) ? (
                    <PdfThumb cert={cert} label={label} />
                  ) : (
                    <Thumb src={cert.fileData} alt={label} onClick={() => openListingLightbox(cert.fileData)} disabled={isLocked} />
                  )}
                </ThumbGroup>
              );
            })}

            <button type="button" onClick={() => setIsEditingAttachments(true)} disabled={isLocked || isBusy} className={SMALL_ACTION}>
              첨부 편집
            </button>
          </div>

          {!isEditingForm && (
            <div className="flex items-center gap-2">
              {isPending && (
                <button type="button" onClick={() => onStartEdit('full')} disabled={isBusy} className={ADMIN_BUTTON.secondary}>
                  수정
                </button>
              )}
              {isApproved && (
                <button type="button" onClick={onRevertApproval} disabled={isBusy} className={ADMIN_BUTTON.secondary}>
                  승인 취소
                </button>
              )}
              {isPending && (
                <button type="button" onClick={onDelete} disabled={isBusy} className={ADMIN_BUTTON.danger}>
                  삭제
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {lightbox && (
        <ImageLightbox
          title={listing.listingNo}
          items={lightbox.items}
          index={lightbox.index}
          onIndexChange={(index) => setLightbox((prev) => (prev ? { ...prev, index } : prev))}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
