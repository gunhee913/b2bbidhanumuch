'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { useBidStore } from '@/stores/bidStore';

/**
 * bidStore의 isDarkMode 상태와 next-themes를 동기화하는 컴포넌트
 * 설정 페이지에서 다크모드 토글 시 실제 테마가 변경됨
 */
export default function DarkModeSync() {
  const { isDarkMode } = useBidStore();
  const { setTheme } = useTheme();
  const isInitialMount = useRef(true);

  // isDarkMode 상태가 변경되면 next-themes 테마도 변경
  useEffect(() => {
    // 초기 마운트 시에도 상태에 따라 테마 설정
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }
    
    setTheme(isDarkMode ? 'dark' : 'light');
  }, [isDarkMode, setTheme]);

  return null;
}
