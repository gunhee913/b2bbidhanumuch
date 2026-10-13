"use client";

import { useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  Loader2,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  MAX_PART_PHOTOS,
  moveToCover,
  uploadPhotoFiles,
} from "../lib/listingPhotos";

export interface PartPhotoDialogProps {
  open: boolean;
  partName: string;
  listingPartNo: string;
  /** 이 부위 사진 */
  images: string[];
  /** 개체 사진 · 다시 올리지 않고 골라 붙일 수 있는 풀 */
  listingImages: string[];
  onChange: (images: string[]) => void;
  /** 부위 사진 한 장을 개체 대표로 세운다 (개체 사진 맨 앞에 넣는다) */
  onSetListingCover: (src: string) => void;
  /** ←/→ · 모달을 닫지 않고 이웃 부위로 간다 · 끝이면 비워 둔다 */
  onPrev?: () => void;
  onNext?: () => void;
  onClose: () => void;
}

/**
 * 부위 사진 모달 · 상장등록 폼의 부위 칸 카메라 아이콘이 연다.
 *
 * 표 안에 썸네일을 직접 깔지 않는 까닭 · 10두 × 20부위 = 200칸이라 표가 세로로 두세 배
 * 길어지고 엑셀 업로드 흐름이 무너진다. 모달 하나를 ←/→ 로 옮겨 가며 채운다.
 *
 * 비워 두는 것이 기본이다 — 비어 있으면 화면은 개체 대표 사진을 보여 준다.
 */
export function PartPhotoDialog({
  open,
  partName,
  listingPartNo,
  images,
  listingImages,
  onChange,
  onSetListingCover,
  onPrev,
  onNext,
  onClose,
}: PartPhotoDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const remaining = MAX_PART_PHOTOS - images.length;
  const canAdd = remaining > 0;

  const handleFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    e.target.value = "";
    if (!files || files.length === 0 || !canAdd) return;
    setUploading(true);
    const { urls, skipped } = await uploadPhotoFiles(files, remaining);
    setUploading(false);
    if (urls.length > 0)
      onChange([...images, ...urls].slice(0, MAX_PART_PHOTOS));
    if (skipped > 0)
      alert(`${skipped}장은 이미지가 아니거나 올리지 못했습니다.`);
  };

  const togglePooled = (src: string) => {
    if (images.includes(src)) {
      onChange(images.filter((s) => s !== src));
      return;
    }
    if (!canAdd) return;
    onChange([...images, src]);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft" && onPrev) {
      e.preventDefault();
      onPrev();
    } else if (e.key === "ArrowRight" && onNext) {
      e.preventDefault();
      onNext();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent
        onKeyDown={handleKeyDown}
        className="max-w-[640px] gap-0 p-0 text-gray-900"
      >
        <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-3 pr-12">
          <NavButton icon={ChevronLeft} label="이전 부위" onClick={onPrev} />
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-[15px] font-bold leading-tight">
              {partName}{" "}
              <span className="ml-1 text-[12px] font-medium tabular-nums text-gray-500">
                {listingPartNo}
              </span>
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-[11.5px] text-gray-500">
              비워 두면 개체 대표 사진이 보입니다 · ←/→ 로 다른 부위
            </DialogDescription>
          </div>
          <NavButton icon={ChevronRight} label="다음 부위" onClick={onNext} />
        </div>

        <section className="px-5 pt-4">
          <SectionHead>
            이 부위 사진{" "}
            <span className="font-normal text-gray-400">
              ({images.length}/{MAX_PART_PHOTOS})
            </span>
          </SectionHead>
          <div className="mt-2 flex flex-wrap gap-3">
            {images.map((src, index) => (
              <figure key={`${src}-${index}`} className="w-24">
                <div
                  className={cn(
                    "relative aspect-[4/3] w-full overflow-hidden border bg-gray-50",
                    index === 0
                      ? "border-gray-700 ring-1 ring-gray-700"
                      : "border-gray-200",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`${partName} 사진 ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                  {index === 0 ? (
                    <span className="pointer-events-none absolute bottom-0 left-0 bg-gray-700 px-1 py-[1px] text-[9px] font-semibold leading-none text-white">
                      대표
                    </span>
                  ) : null}
                </div>
                <figcaption className="mt-1 flex items-center justify-between gap-1">
                  {index === 0 ? (
                    <span className="h-5 text-[10px] leading-5 text-gray-400">
                      첫 장
                    </span>
                  ) : (
                    <ThumbAction
                      icon={Star}
                      label="대표로"
                      onClick={() => onChange(moveToCover(images, index))}
                    />
                  )}
                  <ThumbAction
                    icon={Crown}
                    label="개체 대표"
                    title="이 사진을 개체 대표 사진으로"
                    onClick={() => onSetListingCover(src)}
                  />
                  <ThumbAction
                    icon={Trash2}
                    label="삭제"
                    onClick={() =>
                      onChange(images.filter((_, i) => i !== index))
                    }
                  />
                </figcaption>
              </figure>
            ))}
            {canAdd ? (
              <>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFiles}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={uploading}
                  className="flex aspect-[4/3] w-24 flex-col items-center justify-center self-start border border-dashed border-gray-300 bg-white text-gray-400 transition-colors hover:border-gray-500 hover:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      <span className="mt-1 text-[10px]">업로드</span>
                    </>
                  )}
                </button>
              </>
            ) : null}
          </div>
          {images.length === 0 ? (
            <p className="mt-2 text-[11.5px] text-gray-400">
              아직 없습니다 · 이 부위는 개체 대표 사진으로 보입니다.
            </p>
          ) : null}
        </section>

        <section className="px-5 pb-4 pt-5">
          <SectionHead>개체 사진에서 고르기</SectionHead>
          {listingImages.length === 0 ? (
            <p className="mt-2 text-[11.5px] text-gray-400">
              개체 사진이 없습니다 · 위에서 바로 올리거나 개체 사진을 먼저 올려
              주세요.
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-3">
              {listingImages.map((src, index) => {
                const picked = images.includes(src);
                const disabled = !picked && !canAdd;
                return (
                  <button
                    key={`${src}-${index}`}
                    type="button"
                    disabled={disabled}
                    aria-pressed={picked}
                    onClick={() => togglePooled(src)}
                    title={
                      picked
                        ? "이 부위에서 빼기"
                        : disabled
                          ? `부위 사진은 ${MAX_PART_PHOTOS}장까지`
                          : "이 부위 사진으로 붙이기"
                    }
                    className={cn(
                      "relative aspect-[4/3] w-24 overflow-hidden border bg-gray-50 transition-opacity",
                      picked
                        ? "border-gray-700 ring-1 ring-gray-700"
                        : "border-gray-200 hover:opacity-80",
                      disabled && "cursor-not-allowed opacity-40",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={
                        index === 0
                          ? "개체 대표 사진"
                          : `개체 사진 ${index + 1}`
                      }
                      className="h-full w-full object-cover"
                    />
                    {index === 0 ? (
                      <span className="pointer-events-none absolute bottom-0 left-0 bg-black/60 px-1 py-[1px] text-[9px] font-semibold leading-none text-white">
                        개체 대표
                      </span>
                    ) : null}
                    {picked ? (
                      <span className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center bg-gray-700 text-white">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <footer className="flex items-center justify-between gap-2 border-t border-gray-200 bg-gray-50 px-5 py-3">
          <button
            type="button"
            disabled={images.length === 0}
            onClick={() => onChange([])}
            className="text-[11.5px] font-medium text-gray-600 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-gray-300 disabled:no-underline"
          >
            개체 대표 사진 사용 (부위 사진 비우기)
          </button>
          <button
            type="button"
            onClick={onClose}
            className="bg-gray-700 px-4 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
          >
            완료
          </button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 부위 표 칸의 카메라 단추 · 장수 배지가 붙고, 없으면 흐리게 서서 「대표 사용」 을 알린다.
 * 미상장(체크 해제) 부위는 누를 수 없다.
 */
export function PartPhotoButton({
  count,
  hasListingCover,
  disabled,
  onClick,
}: {
  count: number;
  /** 개체 사진이 있어 비워 둬도 보여 줄 것이 있다 */
  hasListingCover: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const title =
    count > 0
      ? `부위 사진 ${count}장`
      : hasListingCover
        ? "부위 사진 없음 · 개체 대표 사진 사용"
        : "부위 사진 없음";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={cn(
        "relative inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm transition-colors",
        count > 0
          ? "text-gray-800 hover:bg-gray-200"
          : "text-gray-300 hover:bg-gray-100 hover:text-gray-500",
        disabled && "cursor-not-allowed opacity-30 hover:bg-transparent",
      )}
    >
      <Camera className="h-3.5 w-3.5" strokeWidth={2} />
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-gray-700 px-0.5 text-[8.5px] font-bold leading-none text-white">
          {count}
        </span>
      ) : null}
    </button>
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[12px] font-semibold text-gray-700">{children}</h3>
  );
}

function NavButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof ChevronLeft;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label={label}
      title={label}
      className="flex h-7 w-7 shrink-0 items-center justify-center border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
    </button>
  );
}

function ThumbAction({
  icon: Icon,
  label,
  title,
  onClick,
}: {
  icon: typeof Star;
  label: string;
  title?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? label}
      className="inline-flex h-5 items-center gap-0.5 text-[10px] text-gray-500 hover:text-gray-900"
    >
      <Icon className="h-3 w-3" strokeWidth={2} />
      {label}
    </button>
  );
}
