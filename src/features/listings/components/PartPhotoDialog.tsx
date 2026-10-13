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
  FORM_PHOTO_SOURCE_LABEL,
  MAX_PART_PHOTOS,
  moveToCover,
  uploadPhotoFiles,
  type FormPhotoSource,
} from "../lib/listingPhotos";

/** 부위 사진이 없을 때 대신 나갈 사진 · `resolveFormPartCover` 의 결과 */
export interface PartPhotoFallback {
  src: string | null;
  source: FormPhotoSource;
}

export interface PartPhotoDialogProps {
  open: boolean;
  partName: string;
  listingPartNo: string;
  /** 이 부위 사진 */
  images: string[];
  /** 개체 사진 · 다시 올리지 않고 골라 붙일 수 있는 풀 */
  listingImages: string[];
  /** 비워 뒀을 때 화면에 나갈 사진 · 「지금 이게 나간다」 를 모달 안에서 보여 준다 */
  fallback: PartPhotoFallback;
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
 * 비워 두는 것이 기본이다 — 비어 있으면 화면은 업체 부위 대표이미지, 그것도 없으면
 * 개체 대표 사진을 보여 준다(`fallback`).
 */
export function PartPhotoDialog({
  open,
  partName,
  listingPartNo,
  images,
  listingImages,
  fallback,
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
    /* `FileList` 는 살아 있는 객체 · 입력칸을 비우면 같이 비므로 먼저 배열로 떠 둔다 */
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0 || !canAdd) return;
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
              비워 두면 업체 부위 대표이미지 → 개체 대표 사진 순으로 보입니다 ·
              ←/→ 로 다른 부위
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
                {/*
                 * 아이콘만 · 글자를 붙이면 96px 안에 셋이 못 서서 두 줄로 꺾였다.
                 * 뜻은 `title`(마우스) 과 `aria-label`(읽기) 이 말한다. 첫 장은 사진 위
                 * 「대표」 띠가 이미 말하므로 그 자리는 비워 둔다.
                 */}
                <figcaption className="mt-1 flex items-center justify-between">
                  {index === 0 ? (
                    <span className="h-6 w-6" aria-hidden />
                  ) : (
                    <ThumbAction
                      icon={Star}
                      label="이 부위 대표로"
                      onClick={() => onChange(moveToCover(images, index))}
                    />
                  )}
                  <ThumbAction
                    icon={Crown}
                    label="개체 대표 사진으로"
                    onClick={() => onSetListingCover(src)}
                  />
                  <ThumbAction
                    icon={Trash2}
                    label="삭제"
                    danger
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
            /* 비어 있을 때 실제로 나갈 사진을 옆에 세운다 · 「대표 사용」 이 무엇을 뜻하는지 눈으로 확인 */
            <div className="mt-3 flex items-center gap-3 border border-dashed border-gray-200 bg-gray-50 p-2">
              <div className="relative aspect-[4/3] w-20 shrink-0 overflow-hidden bg-gray-100">
                {fallback.src ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={fallback.src}
                    alt={FORM_PHOTO_SOURCE_LABEL[fallback.source]}
                    className="h-full w-full object-cover opacity-80"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-gray-300">
                    <Camera className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                )}
              </div>
              <p className="text-[11.5px] leading-relaxed text-gray-500">
                부위 사진이 없어 지금은{" "}
                <span className="font-semibold text-gray-700">
                  {FORM_PHOTO_SOURCE_LABEL[fallback.source]}
                </span>
                {fallback.source === "none"
                  ? " 상태로 나갑니다."
                  : "이 대신 나갑니다."}
                {fallback.source === "listing"
                  ? " 업체 부위 대표이미지를 등록해 두면 그것이 먼저 나갑니다."
                  : null}
              </p>
            </div>
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
            부위 사진 비우기 (대표이미지 사용)
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
 * 부위 표 칸의 작은 사진 · 누르면 부위 사진 모달이 열린다.
 *
 * 카메라 아이콘만 두었을 때는 「이 부위에 어떤 사진이 걸릴지」 를 모달을 열어야 알았다.
 * 라이브 화면과 같은 순서(`resolveFormPartCover`)로 고른 한 장을 36×27 로 미리 보여 주고,
 * 부위 사진이면 장수 배지, 대표이미지가 대신 나가는 것이면 「대표」 띠를 붙여 가른다.
 * 미상장(체크 해제) 부위는 누를 수 없다.
 */
export function PartPhotoThumb({
  cover,
  count,
  disabled,
  onClick,
}: {
  cover: PartPhotoFallback;
  /** 이 부위에 올린 사진 수 */
  count: number;
  disabled?: boolean;
  onClick: () => void;
}) {
  const title =
    count > 0
      ? `부위 사진 ${count}장 · 눌러서 고치기`
      : `부위 사진 없음 · ${FORM_PHOTO_SOURCE_LABEL[cover.source]}${cover.source === "none" ? "" : " 사용"} · 눌러서 올리기`;
  const isSubstitute = count === 0 && !!cover.src;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={cn(
        "relative h-[27px] w-9 shrink-0 overflow-hidden rounded-[3px] bg-gray-100 ring-1 ring-gray-200 transition-opacity hover:ring-gray-500",
        disabled && "cursor-not-allowed opacity-30 hover:ring-gray-200",
      )}
    >
      {cover.src ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={cover.src}
          alt=""
          className={cn(
            "h-full w-full object-cover",
            isSubstitute && "opacity-60",
          )}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-gray-300">
          <Camera className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
      )}
      {count > 0 ? (
        <span className="absolute right-0 top-0 flex h-3.5 min-w-[14px] items-center justify-center rounded-bl-[3px] bg-gray-700 px-0.5 text-[8.5px] font-bold leading-none text-white">
          {count}
        </span>
      ) : isSubstitute ? (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/55 text-center text-[7.5px] font-semibold leading-[10px] text-white">
          대표
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

/** 썸네일 아래 아이콘 단추 · 24px 정사각 · 뜻은 title/aria-label 로 */
function ThumbAction({
  icon: Icon,
  label,
  danger,
  onClick,
}: {
  icon: typeof Star;
  label: string;
  /** 삭제처럼 되돌리기 어려운 일 · 손이 닿을 때만 붉게 */
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex h-6 w-6 items-center justify-center rounded-sm text-gray-400 transition-colors hover:bg-gray-100",
        danger ? "hover:text-red-600" : "hover:text-gray-900",
      )}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
    </button>
  );
}
