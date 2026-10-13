"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deletePartGroupImage,
  fetchPartGroupImages,
  upsertPartGroupImage,
  type PartGroupImageScope,
  type PartGroupImageTarget,
} from "../api";
import type { PartGroupImage, PartGroupImageLookup } from "../types";

export const PART_GROUP_IMAGES_QUERY_KEY = ["part-group-images"] as const;

/** 부위 대표이미지 전체(기본 + 업체별) · 라이브 화면과 관리자 페이지가 같은 캐시를 공유 */
export function usePartGroupImages() {
  return useQuery({
    queryKey: PART_GROUP_IMAGES_QUERY_KEY,
    queryFn: fetchPartGroupImages,
    staleTime: 5 * 60 * 1000,
  });
}

/** 전체 기본값 열쇠 · 업체 열쇠와 한 맵에 섞이지 않게 UUID 가 아닌 글자를 쓴다 */
const DEFAULT_SCOPE = "default";

function scopeKey(companyId: string | null | undefined, groupName: string) {
  return `${companyId ?? DEFAULT_SCOPE}\u0000${groupName}`;
}

/** 받은 목록을 조회 함수로 · 업체 것 → 전체 기본 → null */
export function buildPartGroupImageLookup(
  images: readonly PartGroupImage[],
): PartGroupImageLookup {
  const map = new Map<string, string>();
  for (const img of images) {
    map.set(scopeKey(img.companyId, img.groupName), img.imageUrl);
  }
  return (companyId, groupName) =>
    (companyId ? map.get(scopeKey(companyId, groupName)) : undefined) ??
    map.get(scopeKey(null, groupName)) ??
    null;
}

/**
 * 부위 대표이미지 조회 함수 · 부위 사진이 없는 줄에 대신 걸 사진을 찾는다.
 * 아직 못 받았으면 늘 null 을 돌려주는 함수 — 부르는 쪽은 없는 경우와 같이 다룬다.
 */
export function usePartGroupImageLookup(): PartGroupImageLookup {
  const { data } = usePartGroupImages();
  return useMemo(() => buildPartGroupImageLookup(data?.images ?? []), [data]);
}

export function useUpsertPartGroupImage(scope: PartGroupImageScope = "admin") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: PartGroupImageTarget & { imageUrl: string }) =>
      upsertPartGroupImage(payload, scope),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PART_GROUP_IMAGES_QUERY_KEY });
    },
  });
}

export function useDeletePartGroupImage(scope: PartGroupImageScope = "admin") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (target: PartGroupImageTarget) =>
      deletePartGroupImage(target, scope),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PART_GROUP_IMAGES_QUERY_KEY });
    },
  });
}
