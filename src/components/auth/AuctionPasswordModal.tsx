'use client';

import { useState } from 'react';
import { X, Lock, Loader2 } from 'lucide-react';

interface AuctionPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (password: string) => Promise<boolean>;
  isVerifying: boolean;
  error: string | null;
}

export function AuctionPasswordModal({
  isOpen,
  onClose,
  onVerify,
  isVerifying,
  error,
}: AuctionPasswordModalProps) {
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onVerify(password);
    if (success) {
      setPassword('');
    }
  };

  const handleClose = () => {
    setPassword('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={handleClose}
      />
      <div className="relative bg-white w-full max-w-sm mx-4 p-6">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">경매 비밀번호 확인</h3>
          <p className="text-sm text-gray-500 mt-1">
            입찰을 진행하려면 경매 비밀번호를 입력하세요.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="경매 비밀번호"
            className="w-full px-4 py-3 border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 mb-4"
            autoFocus
          />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3 border border-gray-200 text-gray-700 font-medium hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!password || isVerifying}
              className="flex-1 py-3 bg-gray-900 text-white font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  확인 중...
                </>
              ) : (
                '확인'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
