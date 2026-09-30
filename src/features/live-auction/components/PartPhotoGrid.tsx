"use client";

import Image from "next/image";
import NumberFlow from "@number-flow/react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PartPhotoCardData {
  group: string;
  count: number;
  settledCount: number;
  settledAmount: number;
  hasMyBid: boolean;
  /** 관리자 등록 대표이미지 · 없으면 null */
  imageUrl: string | null;
}

export interface PartPhotoGridProps {
  items: PartPhotoCardData[];
  selectedGroup: string | null;
  onSelect: (group: string) => void;
}

/**
 * 부위별 사이드바의 `사진` 모드 · 2열 카드 그리드.
 *
 * 부위마다 관리자가 등록한 대표이미지(`part_group_images`)를 보여준다.
 * 개체 사진(등심 단면)은 부위와 무관하므로 쓰지 않는다.
 *
 * 카드 · [4:3 대표이미지] / 부위명 / 상장 N건 · 낙찰 M건 · 우측 낙찰대금(있을 때만)
 * 목록 모드와 선택·필터 상태 공유 · 선택 카드만 ink 링.
 */
export function PartPhotoGrid({
  items,
  selectedGroup,
  onSelect,
}: PartPhotoGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2 p-2">
      {items.map((item) => (
        <PartPhotoCard
          key={item.group}
          item={item}
          isActive={item.group === selectedGroup}
          onClick={() => onSelect(item.group)}
        />
      ))}
    </div>
  );
}

function PartPhotoCard({
  item,
  isActive,
  onClick,
}: {
  item: PartPhotoCardData;
  isActive: boolean;
  onClick: () => void;
}) {
  const { group, count, settledCount, settledAmount, hasMyBid, imageUrl } =
    item;
  const allSettled = count > 0 && settledCount >= count;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        "group/card flex flex-col overflow-hidden border text-left transition-colors",
        isActive
          ? "border-inverse bg-surface-muted ring-1 ring-ink"
          : "border-line bg-surface hover:border-line hover:bg-surface-muted",
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-accent">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={`${group} 대표이미지`}
            fill
            sizes="200px"
            className={cn(
              "object-cover transition-transform duration-300 group-hover/card:scale-[1.03]",
              allSettled && "opacity-70",
            )}
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-content-ghost">
            <ImageOff className="h-6 w-6" strokeWidth={1.5} />
          </div>
        )}
      </div>

      <div className="flex flex-col px-2 pb-2 pt-1.5 leading-none">
        <span className="flex min-w-0 items-center gap-1.5">
          {hasMyBid ? (
            <span
              className="h-1 w-1 shrink-0 rounded-full bg-inverse"
              aria-label="내 입찰 있음"
            />
          ) : null}
          <span
            className={cn(
              "truncate text-[12.5px] font-bold -tracking-[0.01em]",
              "text-content",
            )}
          >
            {group}
          </span>
        </span>

        <span className="mt-1.5 flex items-baseline justify-between gap-1 whitespace-nowrap text-cap tabular-nums -tracking-[0.02em]">
          <span className="text-content-soft">
            상장 <span className="font-semibold text-content-mid">{count}</span>
            건
            <span className="mx-[3px] text-content-ghost" aria-hidden>
              ·
            </span>
            낙찰{" "}
            <span
              className={cn(
                "font-semibold",
                settledCount > 0 ? "text-content-mid" : "text-content-faint",
              )}
            >
              {settledCount}
            </span>
            건
          </span>
          {settledAmount > 0 ? (
            <span className="font-semibold text-content-mid">
              <NumberFlow
                value={settledAmount}
                locales="ko-KR"
                format={{ notation: "compact", maximumFractionDigits: 1 }}
                willChange
              />
            </span>
          ) : null}
        </span>
      </div>
    </button>
  );
}
