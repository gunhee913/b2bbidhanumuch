'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** 예전 견적받기 주소 · 선물세트로 보낸다 */
export default function GroupBuyQuoteRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/group-buy/gift');
  }, [router]);
  return null;
}
