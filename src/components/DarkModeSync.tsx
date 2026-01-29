'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useBidStore } from '@/stores/bidStore';

/**
 * bidStore의 isDarkMode 상태와 next-themes를 동기화하는 컴포넌트
 * 설정 페이지에서 다크모드 토글 시 실제 테마가 변경됨
 */
export default function DarkModeSync() {
  const { isDarkMode } = useBidStore();
  const { setTheme, resolvedTheme } = useTheme();

  // isDarkMode 상태가 변경되면 next-themes 테마도 변경
  useEffect(() => {
    if (isDarkMode) {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  }, [isDarkMode, setTheme]);

  // 초기 로드 시 next-themes 테마에 따라 isDarkMode 상태 동기화
  useEffect(() => {
    const { setIsDarkMode } = useBidStore.getState();
    if (resolvedTheme === 'dark' && !isDarkMode) {
      setIsDarkMode(true);
    } else if (resolvedTheme === 'light' && isDarkMode) {
      setIsDarkMode(false);
    }
  }, [resolvedTheme]);

  return null;
}
