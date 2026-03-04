'use client';

import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import BottomNav from '@/components/BottomNav';

interface GradeTableRow {
  label: string;
  values: number[];
}

interface GradeTable {
  cols: string[];
  rows: GradeTableRow[];
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
  metadata?: { gradeTable?: GradeTable } & Record<string, any>;
}

export default function NotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications');
      if (!res.ok) return [];
      return res.json();
    },
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await fetch('/api/notifications/read-all', { method: 'PATCH' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      await fetch('/api/notifications/clear', { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteMutation.mutate(id);
  };

  return (
    <div className="fixed inset-0 bg-white flex justify-center items-center z-[9999] overflow-hidden">
      <div className="w-full md:flex md:justify-center md:items-center bg-white">
        <div
          className="w-full md:max-w-md md:w-[500px] bg-white md:shadow-2xl relative overflow-hidden flex flex-col"
          style={{ height: '100dvh' }}
        >
          <div className="flex-shrink-0 px-4 py-3 bg-white border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="p-1 rounded hover:bg-gray-100 mr-3"
              >
                <ArrowLeft className="h-5 w-5 text-gray-700" />
              </button>
              <h1 className="text-base font-bold text-gray-900">알림</h1>
              {unreadCount > 0 && (
                <span className="ml-2 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full leading-none">
                  {unreadCount}
                </span>
              )}
            </div>
            {notifications.length > 0 && (
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllReadMutation.mutate()}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    전체 읽음
                  </button>
                )}
                <button
                  onClick={() => clearAllMutation.mutate()}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  전체 삭제
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                로딩 중...
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                알림이 없습니다
              </div>
            ) : (
              <div className="p-3 space-y-2.5">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 rounded-lg bg-white border cursor-pointer transition-colors ${
                      notification.isRead
                        ? 'border-gray-200'
                        : 'border-gray-300 bg-gray-50'
                    }`}
                  >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          {!notification.isRead && (
                            <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                          )}
                          <p className={`text-[15px] ${notification.isRead ? 'text-gray-700' : 'text-gray-900 font-semibold'}`}>
                            {notification.title}
                          </p>
                        </div>
                        <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-line">
                          {notification.message}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDelete(e, notification.id)}
                        className="text-[11px] text-gray-400 hover:text-gray-600 flex-shrink-0 pt-0.5"
                      >
                        삭제
                      </button>
                    </div>
                    {notification.metadata?.gradeTable && (
                      <div className="mt-2 mb-1">
                        <table className="w-full text-[11px] border-collapse table-fixed">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="py-1.5 text-center font-medium text-gray-500 border border-gray-200">성별</th>
                              {notification.metadata.gradeTable.cols.map((col: string) => (
                                <th key={col} className="py-1.5 text-center font-medium text-gray-500 border border-gray-200">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {notification.metadata.gradeTable.rows.map((row: GradeTableRow, idx: number) => (
                              <tr key={row.label} className={idx === notification.metadata!.gradeTable!.rows.length - 1 ? 'bg-gray-50 font-semibold' : ''}>
                                <td className="py-1.5 text-center text-gray-600 border border-gray-200">{row.label}</td>
                                {row.values.map((val: number, i: number) => (
                                  <td key={i} className={`py-1.5 text-center border border-gray-200 ${i === row.values.length - 1 ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                    {val}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <p className="text-[12px] text-gray-400 mt-2.5">
                      {format(new Date(notification.createdAt), 'MM.dd(EEE) HH:mm', { locale: ko })}
                    </p>
                  </div>
                  </div>
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
