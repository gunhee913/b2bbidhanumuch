'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { usePathname } from 'next/navigation';
import { useBidStore } from '@/stores/bidStore';

/**
 * bidStore의 isDarkMode 상태와 next-themes를 동기화하는 컴포넌트
 * 설정 페이지에서 다크모드 토글 시 실제 테마가 변경됨
 * admin, company 경로에서는 항상 라이트모드 유지.
 * group-buy 는 테마를 바꾸지 않는다. 경매장 다크 설정을 지우면 나갈 때 다시 입혀지면서 화면이 깜빡인다.
 */
export default function DarkModeSync() {
  const { isDarkMode } = useBidStore();
  const { setTheme } = useTheme();
  const pathname = usePathname();

  const isGroupBuyPath = pathname?.startsWith('/group-buy');
  const isAdminOrCompanyPath = pathname?.startsWith('/admin') || pathname?.startsWith('/company');

  // isDarkMode 상태가 변경되면 next-themes 테마도 변경
  useEffect(() => {
    if (isGroupBuyPath) return;

    // admin, company 경로에서는 항상 라이트모드
    if (isAdminOrCompanyPath) {
      setTheme('light');
      return;
    }
    
    setTheme(isDarkMode ? 'dark' : 'light');
  }, [isDarkMode, setTheme, isAdminOrCompanyPath, isGroupBuyPath]);

  return null;
}
