'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { Save } from 'lucide-react';

export default function PrivacyPage() {
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const { data, isLoading } = useQuery<{ id: string; title: string; content: string; updatedAt: string }>({
    queryKey: ['admin-site-content', 'privacy'],
    queryFn: async () => {
      const res = await fetch('/api/admin/site-contents/privacy');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  useEffect(() => {
    if (data) {
      setContent(data.content);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async (newContent: string) => {
      const res = await fetch('/api/admin/site-contents/privacy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent }),
      });
      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-site-content', 'privacy'] });
      setIsEditing(false);
      alert('저장되었습니다.');
    },
    onError: () => {
      alert('저장에 실패했습니다.');
    },
  });

  const handleSave = () => {
    updateMutation.mutate(content);
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">개인정보처리방침 관리</h1>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => {
                    setContent(data?.content || '');
                    setIsEditing(false);
                  }}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-gray-900 rounded hover:bg-gray-800 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {updateMutation.isPending ? '저장 중...' : '저장'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 text-xs text-white bg-gray-900 rounded hover:bg-gray-800"
              >
                수정
              </button>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-4">
          {isLoading ? (
            <div className="text-center py-10 text-gray-400 text-sm">불러오는 중...</div>
          ) : isEditing ? (
            <div className="space-y-3">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-[600px] p-3 text-xs border border-gray-300 rounded resize-none focus:outline-none focus:ring-1 focus:ring-gray-400 font-mono"
                placeholder="개인정보처리방침 내용을 입력하세요..."
              />
            </div>
          ) : (
            <div className="space-y-2">
              {data?.updatedAt && (
                <p className="text-xs text-gray-400">
                  최종 수정: {new Date(data.updatedAt).toLocaleString('ko-KR')}
                </p>
              )}
              {content ? (
                <div
                  className="text-sm leading-relaxed whitespace-pre-wrap text-gray-700 min-h-[200px]"
                >
                  {content}
                </div>
              ) : (
                <div className="text-center py-20 text-gray-400 text-sm">
                  등록된 개인정보처리방침이 없습니다. [수정] 버튼을 눌러 작성해주세요.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
