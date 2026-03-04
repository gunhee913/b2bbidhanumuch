'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Pin } from 'lucide-react';
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

export default function NoticePage() {
  const router = useRouter();

  const { data: notices = [], isLoading } = useQuery<Notice[]>({
    queryKey: ['notices'],
    queryFn: async () => {
      const res = await fetch('/api/notices?target=dealer');
      if (!res.ok) throw new Error('조회 실패');
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
          {/* 상단 바 */}
          <div className="flex-shrink-0 bg-white border-b">
            <div className="px-4 h-12 flex items-center">
              <button onClick={() => router.back()} className="mr-3">
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="font-bold text-base">공지사항</h1>
            </div>
          </div>

          {/* 목록 */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50">
            {isLoading ? (
              <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
                로딩 중...
              </div>
            ) : notices.length === 0 ? (
              <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
                등록된 공지사항이 없습니다.
              </div>
            ) : (
              <div className="divide-y bg-white">
                {notices.map(notice => (
                  <Link
                    key={notice.id}
                    href={`/notice/${notice.id}`}
                    className="flex items-start px-4 py-3.5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {notice.isPinned && (
                          <Pin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        )}
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {notice.title}
                        </span>
                        {(Date.now() - new Date(notice.createdAt).getTime()) < 3 * 24 * 60 * 60 * 1000 && (
                          <span className="text-[10px] font-bold text-red-500 flex-shrink-0">New</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {format(new Date(notice.createdAt), 'MM.dd(EEE)', { locale: ko })}
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-gray-300 rotate-180 flex-shrink-0 mt-1" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          <BottomNav />
        </div>
      </div>
    </div>
  );
}
