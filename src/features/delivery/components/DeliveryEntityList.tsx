"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { formatKrw } from "@/features/live-auction/lib/masking";
import {
  ImageLightbox,
  type GalleryItem,
} from "@/features/live-auction/components/ListingImageGallery";
import type { AssignmentInfo, Partner, WinningPart } from "../types";
import {
  computeEntityProgress,
  groupEntitiesByDay,
  groupPartsByEntity,
  type DeliveryEntity,
} from "../lib/groupByEntity";
import { DeliveryEntityCard } from "./DeliveryEntityCard";

export interface DeliveryEntityListProps {
  parts: WinningPart[];
  partners: Partner[];
  savedAssignments: Record<string, AssignmentInfo>;
  dirtyAssignments: Record<string, string | null>;
  partFilter: string;
  /** 배정 완료 개체 숨기기 */
  hideDone: boolean;
  isLoading: boolean;
  onChangePart: (partId: string, partnerId: string | null) => void;
  onApplyAll: (partIds: string[], partnerId: string) => void;
}

/**
 * 배송지시 · 날짜 그룹 → 개체 카드 목록.
 *
 * - 날짜 그룹 헤더: `9.17 (목) · 농협 음성 · 10두 · 28건 · 19,506,082원` + 그 날 진행률
 * - 데이터가 처음 오면 미배정이 남은 개체만 펼친 상태로 시작 · 이후는 사용자가 토글
 * - 사진 클릭 → 전체화면 뷰어
 */
export function DeliveryEntityList({
  parts,
  partners,
  savedAssignments,
  dirtyAssignments,
  partFilter,
  hideDone,
  isLoading,
  onChangePart,
  onApplyAll,
}: DeliveryEntityListProps) {
  const entities = useMemo(() => groupPartsByEntity(parts), [parts]);
  const days = useMemo(() => groupEntitiesByDay(entities), [entities]);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const initializedFor = useRef<string | null>(null);

  // 처음 로드된 데이터 기준으로 · 아직 저장 안 된 부위가 있는 개체만 펼친다
  useEffect(() => {
    if (isLoading || entities.length === 0) return;
    const signature = entities.map((e) => e.listingId).join("|");
    if (initializedFor.current === signature) return;
    initializedFor.current = signature;
    setExpanded(
      new Set(
        entities
          .filter((e) => !computeEntityProgress(e, savedAssignments, {}).done)
          .map((e) => e.listingId),
      ),
    );
  }, [isLoading, entities, savedAssignments]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const [lightbox, setLightbox] = useState<DeliveryEntity | null>(null);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const lightboxItems = useMemo<GalleryItem[]>(
    () => (lightbox?.images ?? []).map((src) => ({ kind: "photo", src, label: null })),
    [lightbox],
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse border border-line bg-surface-muted" />
        ))}
      </div>
    );
  }

  if (entities.length === 0) {
    return (
      <div className="border border-line bg-surface px-4 py-16 text-center text-[13px] text-content-faint">
        조회기간 내 낙찰 부위가 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {days.map((day) => {
        const visibleEntities = day.entities.filter((e) => {
          if (partFilter && !e.parts.some((p) => p.partName === partFilter)) return false;
          if (hideDone && computeEntityProgress(e, savedAssignments, dirtyAssignments).done) return false;
          return true;
        });
        const doneCount = day.entities.filter(
          (e) => computeEntityProgress(e, savedAssignments, dirtyAssignments).done,
        ).length;

        return (
          <section key={day.key}>
            <header className="mb-2 flex items-baseline justify-between gap-3 px-1">
              <div className="flex items-baseline gap-2">
                <span className="text-[13px] font-extrabold tabular-nums text-content">
                  {format(new Date(day.date), "M.d (EEE)", { locale: ko })}
                </span>
                {day.slaughterHouse ? (
                  <span className="text-[12px] font-semibold text-content-mid">{day.slaughterHouse}</span>
                ) : null}
                <span className="text-[11.5px] tabular-nums text-content-soft">
                  {day.entities.length}두
                  <span className="mx-1 text-content-ghost">·</span>
                  {day.partCount}건
                  <span className="mx-1 text-content-ghost">·</span>
                  {formatKrw(day.totalAmount)}원
                </span>
              </div>
              <span
                className={cn(
                  "text-[11.5px] tabular-nums",
                  doneCount === day.entities.length ? "font-bold text-sky-700" : "text-content-soft",
                )}
              >
                배정 완료 {doneCount} / {day.entities.length}두
              </span>
            </header>

            {visibleEntities.length === 0 ? (
              <div className="border border-dashed border-line px-4 py-6 text-center text-[12px] text-content-faint">
                {hideDone ? "이 날은 모두 배정이 끝났습니다." : "필터에 해당하는 개체가 없습니다."}
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {visibleEntities.map((entity) => (
                  <DeliveryEntityCard
                    key={entity.listingId}
                    entity={entity}
                    partners={partners}
                    savedAssignments={savedAssignments}
                    dirtyAssignments={dirtyAssignments}
                    partFilter={partFilter}
                    open={expanded.has(entity.listingId)}
                    onToggle={() => toggle(entity.listingId)}
                    onChangePart={onChangePart}
                    onApplyAll={onApplyAll}
                    onOpenPhotos={() => {
                      setLightboxIdx(0);
                      setLightbox(entity);
                    }}
                  />
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {lightbox && lightboxItems.length > 0 ? (
        <ImageLightbox
          items={lightboxItems}
          activeIdx={lightboxIdx}
          onActiveIdxChange={setLightboxIdx}
          listingNo={lightbox.listingNo}
          isSample={false}
          onClose={() => setLightbox(null)}
        />
      ) : null}
    </div>
  );
}
