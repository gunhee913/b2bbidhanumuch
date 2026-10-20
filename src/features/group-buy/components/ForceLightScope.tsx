'use client';

import { useEffect } from 'react';

/**
 * 다이얼로그·팝오버는 body 로 포털되어 레이아웃 밖이다.
 * `<html>` 에 같은 클래스를 붙여 그 포털도 라이트 토큰을 받게 한다.
 * 경매장 테마 저장값은 바꾸지 않고, 이 화면을 벗어나면 클래스만 걷는다.
 */
export function ForceLightScope() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('force-light');
    return () => root.classList.remove('force-light');
  }, []);

  return null;
}
