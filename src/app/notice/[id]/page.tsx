'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import BottomNav from '@/components/BottomNav';

interface Notice {
  id: string;
  title: string;
  content: string;
  category: string;
  isPinned: boolean;
  target: string;
  createdAt: string;
}

export default function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data: notice, isLoading, error } = useQuery<Notice>({
    queryKey: ['notice-detail', id],
    queryFn: async () => {
      const res = await fetch(`/api/notices/${id}`);
      if (!res.ok) throw new Error('조회 실패');
      return res.json();
    },
  });

  const isHTML = (str: string) => /<[a-z][\s\S]*>/i.test(str);

  return (
    <div className="fixed inset-0 bg-white flex justify-center items-center z-[9999] overflow-hidden">
      <div className="w-full md:flex md:justify-center md:items-center bg-white">
        <div
          className="w-full md:max-w-md md:w-[500px] bg-white md:shadow-2xl relative overflow-hidden flex flex-col"
          style={{ height: '100dvh' }}
        >
          {/* 상단 바 */}
          <div className="flex-shrink-0 bg-white border-b">
            <div className="px-4 h-12 flex items-center">
              <button onClick={() => router.back()} className="mr-3">
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="font-bold text-base">공지사항</h1>
            </div>
          </div>

          {/* 본문 */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-white">
            {isLoading ? (
              <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
                로딩 중...
              </div>
            ) : error || !notice ? (
              <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
                공지사항을 찾을 수 없습니다.
              </div>
            ) : (
              <div className="px-4 py-4">
                <div className="border-b pb-3 mb-4">
                  <h2 className="text-lg font-bold text-gray-900">{notice.title}</h2>
                  <div className="text-xs text-gray-400 mt-1.5">
                    {format(new Date(notice.createdAt), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}
                  </div>
                </div>

                {isHTML(notice.content) ? (
                  <div
                    className="text-sm text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: notice.content }}
                  />
                ) : (
                  <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {notice.content}
                  </div>
                )}
              </div>
            )}
          </div>

          <BottomNav />
        </div>
      </div>
    </div>
  );
}
