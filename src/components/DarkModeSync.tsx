'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { usePathname } from 'next/navigation';
import { useBidStore } from '@/stores/bidStore';

/**
 * bidStore의 isDarkMode 상태와 next-themes를 동기화하는 컴포넌트
 * 설정 페이지에서 다크모드 토글 시 실제 테마가 변경됨
 * admin, company 경로에서는 항상 라이트모드 유지
 */
export default function DarkModeSync() {
  const { isDarkMode } = useBidStore();
  const { setTheme } = useTheme();
  const pathname = usePathname();
  const isInitialMount = useRef(true);

  // admin, company 경로 체크
  const isAdminOrCompanyPath = pathname?.startsWith('/admin') || pathname?.startsWith('/company');

  // isDarkMode 상태가 변경되면 next-themes 테마도 변경
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }
    
    // admin, company 경로에서는 항상 라이트모드
    if (isAdminOrCompanyPath) {
      setTheme('light');
      return;
    }
    
    setTheme(isDarkMode ? 'dark' : 'light');
  }, [isDarkMode, setTheme, isAdminOrCompanyPath]);

  return null;
}
