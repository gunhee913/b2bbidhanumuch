"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export type AppTheme = "light" | "dark";

/**
 * 지금 화면의 명암 · 헤더 토글(`bidStore.isDarkMode` → next-themes)이 정하는 값.
 *
 * 서버 렌더에는 테마가 없어 `resolvedTheme` 이 첫 렌더에 `undefined` 다. 그대로 쓰면
 * 캔버스에 색을 직접 칠하는 lightweight-charts 가 라이트로 한 번 그려졌다가 깜빡이므로,
 * 마운트 전에는 `light` 로 고정하고 마운트 후에만 실제 값을 넘긴다
 * (CSS 변수로 칠하는 나머지 UI 는 이 훅 없이도 `.dark` 클래스만으로 바로 맞는다).
 */
export function useAppTheme(): AppTheme {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return "light";
  return resolvedTheme === "dark" ? "dark" : "light";
}
