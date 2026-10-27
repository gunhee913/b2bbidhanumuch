"use client";

import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Loader2,
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
  type FormPhotoSource,
} from "../lib/listingPhotos";
import { PhotoStrip, uploadPhotosInto } from "./admin/AttachmentFields";

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
  /** 비워 뒀을 때 화면에 나갈 사진 · 「지금 이게 나간다」 를 모달 안에서 보여 준다 */
  fallback: PartPhotoFallback;
  onChange: (images: string[]) => void;
  /** 썸네일을 눌렀을 때 크게 보기 · 없으면 보이기만 한다 */
  onView?: (src: string) => void;
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
 *
 * 개체 사진(등심 단면)을 골라 붙이는 칸은 두지 않는다 · 등심 부위는 라이브 화면이 알아서
 * 개체 사진을 세우고(`collectPartPhotos`), 다른 부위에 등심 단면을 붙이면 대표이미지를
 * 밀어내고 엉뚱한 사진이 그 부위 이름으로 나간다.
 */
export function PartPhotoDialog({
  open,
  partName,
  listingPartNo,
  images,
  fallback,
  onChange,
  onView,
  onPrev,
  onNext,
  onClose,
}: PartPhotoDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(0);
  const [dragging, setDragging] = useState(false);
  const uploading = pending > 0;
  const canAdd = images.length + pending < MAX_PART_PHOTOS;
  const isEmpty = images.length === 0 && pending === 0;

  const addFiles = (files: File[]) => {
    if (files.length === 0 || !canAdd || uploading) return;
    void uploadPhotosInto(files, images, MAX_PART_PHOTOS, setPending, (urls) =>
      onChange([...images, ...urls].slice(0, MAX_PART_PHOTOS)),
    );
  };

  const handleFiles = (e: ChangeEvent<HTMLInputElement>) => {
    /* `FileList` 는 살아 있는 객체 · 입력칸을 비우면 같이 비므로 먼저 배열로 떠 둔다 */
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    addFiles(files);
  };

  const handleDragOver = (e: DragEvent<HTMLElement>) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    if (!dragging) setDragging(true);
  };

  const handleDrop = (e: DragEvent<HTMLElement>) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
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

        <section
          onDragOver={handleDragOver}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "px-5 pb-5 pt-4 transition-colors",
            dragging && "bg-gray-100",
          )}
        >
          <div className="flex items-baseline justify-between">
            <SectionHead>
              이 부위 사진{" "}
              <span className="font-normal text-gray-400">
                ({images.length}/{MAX_PART_PHOTOS})
              </span>
            </SectionHead>
            {!isEmpty && canAdd ? (
              <span className="text-[11px] text-gray-400">
                사진을 끌어다 놓아도 올라갑니다
              </span>
            ) : null}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFiles}
            className="hidden"
          />
          {isEmpty ? (
            /*
             * 비어 있을 때는 작은 타일 대신 넓은 영역 하나 · 「여기에 놓으면 된다」 가 바로 보이고,
             * 지금 대신 나가는 사진(fallback)을 그 안에 같이 세워 올릴지 말지 바로 가늠한다.
             */
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className={cn(
                "mt-2 flex w-full flex-col items-center justify-center gap-2 border border-dashed bg-white px-4 py-7 text-gray-500 transition-colors hover:border-gray-500 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50",
                dragging ? "border-gray-700 text-gray-700" : "border-gray-300",
              )}
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Upload className="h-5 w-5" strokeWidth={1.75} />
              )}
              <span className="text-[12.5px] font-medium">
                {uploading
                  ? "올리는 중…"
                  : `사진을 끌어다 놓거나 눌러서 올리기 · 최대 ${MAX_PART_PHOTOS}장`}
              </span>
              <span className="text-[11px] text-gray-400">
                첫 장이 이 부위의 대표 사진이 됩니다
              </span>
            </button>
          ) : null}
          {!isEmpty ? (
            /* 메인 사진 칸과 같은 묶음 컴포넌트 · 손이 닿으면 ★(대표로)·휴지통이 사진 위에 뜬다 */
            <div className="mt-2">
              <PhotoStrip
                images={images}
                max={MAX_PART_PHOTOS}
                pending={pending}
                disabled={uploading}
                size="md"
                coverBadge="대표"
                coverTitle={`${partName} 대표 사진`}
                addTitle="부위 사진 추가"
                onChange={onChange}
                onFiles={addFiles}
                onView={onView}
                editable
                editTitle={partName}
              />
            </div>
          ) : null}
          {isEmpty ? (
            /* 비어 있을 때 실제로 나갈 사진을 세운다 · 「대표이미지 사용」 이 무엇을 뜻하는지 눈으로 확인 */
            <div className="mt-3 flex items-center gap-3 border border-gray-200 bg-gray-50 p-2">
              <div className="relative aspect-[4/3] w-20 shrink-0 overflow-hidden bg-gray-100">
                {fallback.src ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={fallback.src}
                    alt={FORM_PHOTO_SOURCE_LABEL[fallback.source]}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-gray-300">
                    <Camera className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                )}
              </div>
              <div className="min-w-0 text-[11.5px] leading-relaxed text-gray-500">
                <p>
                  {fallback.source === "none"
                    ? "지금은 사진 없이 나갑니다."
                    : "지금은 이 사진이 대신 나갑니다."}
                </p>
                {fallback.source !== "none" ? (
                  <p className="font-semibold text-gray-700">
                    {FORM_PHOTO_SOURCE_LABEL[fallback.source]}
                  </p>
                ) : null}
                {fallback.source === "listing" ? (
                  <p className="text-gray-400">
                    업체 부위 대표이미지를 등록해 두면 그것이 먼저 나갑니다.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
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
