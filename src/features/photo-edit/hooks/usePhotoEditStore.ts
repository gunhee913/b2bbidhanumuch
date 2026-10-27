import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Rotation, ToneParams } from '../types';

/** 「최근 설정 적용」 이 가져가는 것 · 자르기 좌표는 사진마다 달라 빼고, 색·방향만 */
export interface RecentEdit extends ToneParams {
  rotation: Rotation;
  flip: boolean;
}

interface PhotoEditState {
  recent: RecentEdit | null;
  setRecent: (recent: RecentEdit) => void;
}

/**
 * 마지막으로 적용한 보정값 · 같은 카메라·같은 조명이면 밝기·색온도는 매번 같다.
 * 자동 적용은 하지 않는다 — 안 보고 올라간 사진이 경매장에 나가면 곤란하다. 버튼 한 번으로 가져온다.
 * localStorage 에 남겨 새로고침해도 유지.
 */
export const usePhotoEditStore = create<PhotoEditState>()(
  persist(
    (set) => ({
      recent: null,
      setRecent: (recent) => set({ recent }),
    }),
    { name: 'photo-edit-recent' },
  ),
);
