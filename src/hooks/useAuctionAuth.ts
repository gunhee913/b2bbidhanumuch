'use client';

import { useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';

interface UseAuctionAuthReturn {
  isVerified: boolean;
  isVerifying: boolean;
  error: string | null;
  verifyAuctionPassword: (password: string) => Promise<boolean>;
  requireAuctionAuth: (onSuccess: () => void) => void;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  pendingAction: (() => void) | null;
}

// 오늘 날짜를 YYYY-MM-DD 형식으로 반환
function getTodayDateString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function useAuctionAuth(): UseAuctionAuthReturn {
  const { data: session, update } = useSession();
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // 인증 날짜가 오늘인지 확인 (당일 자정까지만 유효)
  const isVerified = useMemo(() => {
    const verifiedDate = session?.auctionVerifiedDate;
    if (!verifiedDate) return false;
    return verifiedDate === getTodayDateString();
  }, [session?.auctionVerifiedDate]);

  const verifyAuctionPassword = useCallback(async (password: string): Promise<boolean> => {
    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/verify-auction-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auctionPassword: password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '인증에 실패했습니다.');
        return false;
      }

      // 세션 업데이트 (오늘 날짜 저장)
      await update({ auctionVerifiedDate: getTodayDateString() });
      
      // 대기 중인 액션 실행
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
      
      setShowModal(false);
      return true;
    } catch {
      setError('인증 처리 중 오류가 발생했습니다.');
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, [update, pendingAction]);

  const requireAuctionAuth = useCallback((onSuccess: () => void) => {
    if (isVerified) {
      // 이미 인증됨 - 바로 실행
      onSuccess();
    } else {
      // 인증 필요 - 모달 표시
      setPendingAction(() => onSuccess);
      setShowModal(true);
    }
  }, [isVerified]);

  return {
    isVerified,
    isVerifying,
    error,
    verifyAuctionPassword,
    requireAuctionAuth,
    showModal,
    setShowModal,
    pendingAction,
  };
}
