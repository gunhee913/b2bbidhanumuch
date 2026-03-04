'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

export default function TermsPage() {
  const router = useRouter();

  const { data, isLoading } = useQuery<{ title: string; content: string }>({
    queryKey: ['site-content', 'terms'],
    queryFn: async () => {
      const res = await fetch('/api/site-contents/terms');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  return (
    <div className="fixed inset-0 bg-white flex justify-center items-center z-[9999] overflow-hidden">
      <div className="w-full md:flex md:justify-center md:items-center bg-white">
        <div
          className="w-full md:max-w-md md:w-[500px] bg-white md:shadow-2xl relative overflow-hidden flex flex-col"
          style={{ height: '100dvh' }}
        >
          <div className="flex-shrink-0 bg-white border-b">
            <div className="px-4 h-12 flex items-center">
              <button onClick={() => router.back()} className="mr-3">
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="font-bold text-base">이용약관</h1>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto bg-white">
            {isLoading ? (
              <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
                로딩 중...
              </div>
            ) : !data?.content ? (
              <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
                등록된 이용약관이 없습니다.
              </div>
            ) : (
              <div className="px-4 py-4">
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {data.content}
                </div>
              </div>
            )}
          </div>

          <BottomNav />
        </div>
      </div>
    </div>
  );
}
