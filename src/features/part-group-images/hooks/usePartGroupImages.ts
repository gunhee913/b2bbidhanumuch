"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deletePartGroupImage,
  fetchPartGroupImages,
  upsertPartGroupImage,
} from "../api";
import type { PartGroupImageMap } from "../types";

export const PART_GROUP_IMAGES_QUERY_KEY = ["part-group-images"] as const;

/** 부위 대표이미지 전체 · 라이브 사이드바와 관리자 페이지가 같은 캐시를 공유 */
export function usePartGroupImages() {
  return useQuery({
    queryKey: PART_GROUP_IMAGES_QUERY_KEY,
    queryFn: fetchPartGroupImages,
    staleTime: 5 * 60 * 1000,
  });
}

/** groupName → imageUrl 맵 · 사이드바 카드에서 O(1) 조회 */
export function usePartGroupImageMap(): PartGroupImageMap {
  const { data } = usePartGroupImages();
  return useMemo(() => {
    const map: PartGroupImageMap = {};
    for (const img of data?.images ?? []) map[img.groupName] = img.imageUrl;
    return map;
  }, [data]);
}

export function useUpsertPartGroupImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: upsertPartGroupImage,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PART_GROUP_IMAGES_QUERY_KEY });
    },
  });
}

export function useDeletePartGroupImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deletePartGroupImage,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PART_GROUP_IMAGES_QUERY_KEY });
    },
  });
}
