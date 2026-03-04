'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Send, Check, X, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface AdminNotifSetting {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
}

interface NotifLog {
  id: string;
  type: string;
  title: string;
  message: string;
  target: string;
  recipientCount: number;
  createdByName: string | null;
  createdAt: string;
}

interface NotifTemplate {
  id: string;
  titleTemplate: string;
  messageTemplate: string;
  availableVars: string;
  updatedAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  listing_upload: '상장 정보',
  auction_start: '경매 시작',
  auction_result: '경매 결과',
  balance: '잔고/입금',
};

export default function NotificationSettingsPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [sendType, setSendType] = useState('');
  const [sendTitle, setSendTitle] = useState('');
  const [sendMessage, setSendMessage] = useState('');
  const [logTypeFilter, setLogTypeFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const { data: settings = [] } = useQuery<AdminNotifSetting[]>({
    queryKey: ['admin-notification-settings'],
    queryFn: async () => {
      const res = await fetch('/api/admin/notification-settings');
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: templates = [] } = useQuery<NotifTemplate[]>({
    queryKey: ['admin-notification-templates'],
    queryFn: async () => {
      const res = await fetch('/api/admin/notification-templates');
      if (!res.ok) return [];
      return res.json();
    },
  });

  const templateMutation = useMutation({
    mutationFn: async (body: { id: string; titleTemplate: string; messageTemplate: string }) => {
      const res = await fetch('/api/admin/notification-templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notification-templates'] });
      setIsEditing(false);
    },
    onError: () => {
      alert('양식 수정에 실패했습니다.');
    },
  });

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setIsEditing(false);
    } else {
      setExpandedId(id);
      setIsEditing(false);
      const tpl = templates.find(t => t.id === id);
      if (tpl) {
        setEditTitle(tpl.titleTemplate);
        setEditMessage(tpl.messageTemplate);
      }
    }
  };

  const startEditing = () => {
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    const tpl = templates.find(t => t.id === expandedId);
    if (tpl) {
      setEditTitle(tpl.titleTemplate);
      setEditMessage(tpl.messageTemplate);
    }
  };

  const saveTemplate = () => {
    if (!expandedId) return;
    templateMutation.mutate({
      id: expandedId,
      titleTemplate: editTitle,
      messageTemplate: editMessage,
    });
  };

  const { data: logs = [] } = useQuery<NotifLog[]>({
    queryKey: ['admin-notification-logs', logTypeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (logTypeFilter) params.set('type', logTypeFilter);
      params.set('limit', '100');
      const res = await fetch(`/api/admin/notification-logs?${params}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const res = await fetch('/api/admin/notification-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, enabled }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notification-settings'] });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (body: { type: string; title: string; message: string }) => {
      const res = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-notification-logs'] });
      setSendType('');
      setSendTitle('');
      setSendMessage('');
      alert(`${data.recipientCount}명에게 알림을 발송했습니다.`);
    },
    onError: () => {
      alert('알림 발송에 실패했습니다.');
    },
  });

  const handleSend = () => {
    if (!sendType || !sendTitle) {
      alert('알림 타입과 제목을 입력해주세요.');
      return;
    }
    sendMutation.mutate({ type: sendType, title: sendTitle, message: sendMessage });
  };

  const listingSendMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/notifications/send-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-notification-logs'] });
      alert(`${data.recipientCount}명에게 상장 알림을 발송했습니다.`);
    },
    onError: (err: Error) => {
      alert(err.message || '알림 발송에 실패했습니다.');
    },
  });

  const handleListingSend = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('전체 중도매인에게 상장 정보 알림을 발송하시겠습니까?')) return;
    listingSendMutation.mutate();
  };

  const renderSettingsTable = () => (
    <div className="bg-white border border-gray-200 p-6">
      <h2 className="text-sm font-bold text-gray-800 mb-4">알림 설정</h2>
      <p className="text-xs text-gray-400 mb-4">
        항목을 클릭하면 알림 양식을 확인하고 편집할 수 있습니다.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-20 px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">사용</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">알림 항목</th>
            </tr>
          </thead>
          <tbody>
            {[...settings].sort((a, b) => {
              if (a.id === 'listing_upload') return 1;
              if (b.id === 'listing_upload') return -1;
              return 0;
            }).map((setting) => {
              const tpl = templates.find(t => t.id === setting.id);
              const isExpanded = expandedId === setting.id;

              return (
                <React.Fragment key={setting.id}>
                  <tr
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleExpand(setting.id)}
                  >
                    <td className="px-3 py-2 border border-gray-200 text-center">
                      {setting.id === 'listing_upload' ? (
                        <button
                          onClick={handleListingSend}
                          disabled={listingSendMutation.isPending}
                          className="flex items-center gap-1 px-2 py-1 text-[11px] text-white bg-gray-900 rounded hover:bg-gray-800 disabled:opacity-50 whitespace-nowrap"
                        >
                          <Send className="w-3 h-3" />
                          {listingSendMutation.isPending ? '발송중' : '발송'}
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMutation.mutate({ id: setting.id, enabled: !setting.enabled });
                          }}
                          className={`w-10 h-5 rounded-full relative transition-colors ${
                            setting.enabled ? 'bg-gray-700' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                              setting.enabled ? 'right-0.5' : 'left-0.5'
                            }`}
                          />
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-medium text-gray-800">{setting.name}</span>
                          <p className="text-xs text-gray-400 mt-0.5">{setting.description}</p>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ml-2 ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </td>
                  </tr>
                  {isExpanded && tpl && (
                    <tr>
                      <td colSpan={2} className="border border-gray-200 bg-gray-50 p-0">
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-600">알림 양식</span>
                            {!isEditing ? (
                              <button
                                onClick={startEditing}
                                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 border border-gray-300 rounded hover:bg-white"
                              >
                                편집
                              </button>
                            ) : (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={saveTemplate}
                                  disabled={templateMutation.isPending}
                                  className="flex items-center gap-1 text-xs text-white bg-gray-900 px-2 py-1 rounded hover:bg-gray-800 disabled:opacity-50"
                                >
                                  <Check className="w-3 h-3" />
                                  저장
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  className="flex items-center gap-1 text-xs text-gray-600 px-2 py-1 border border-gray-300 rounded hover:bg-white"
                                >
                                  <X className="w-3 h-3" />
                                  취소
                                </button>
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="block text-[11px] text-gray-500 mb-1">제목</label>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
                              />
                            ) : (
                              <p className="text-xs text-gray-800 bg-white border border-gray-200 rounded px-2.5 py-1.5">{tpl.titleTemplate}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-[11px] text-gray-500 mb-1">내용</label>
                            {isEditing ? (
                              <textarea
                                value={editMessage}
                                onChange={(e) => setEditMessage(e.target.value)}
                                rows={4}
                                className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-gray-400 resize-y"
                              />
                            ) : (
                              <p className="text-xs text-gray-800 bg-white border border-gray-200 rounded px-2.5 py-1.5 whitespace-pre-line">{tpl.messageTemplate}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-[11px] text-gray-500 mb-1">사용 가능 변수</label>
                            <div className="flex flex-wrap gap-1.5">
                              {tpl.availableVars.split(',').map(v => v.trim()).filter(Boolean).map(v => (
                                <span key={v} className="px-2 py-0.5 bg-white border border-gray-200 text-gray-600 rounded text-[11px] font-mono">
                                  {`{${v}}`}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-lg font-bold text-gray-900">문자/알림 설정</h1>
      </div>

      <div className="space-y-6">
        {settings.length > 0 && renderSettingsTable()}

        {/* 수동 알림 발송 */}
        <div className="bg-white border border-gray-200 p-6">
          <h2 className="text-sm font-bold text-gray-800 mb-4">수동 알림 발송</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">알림 타입</label>
              <select
                value={sendType}
                onChange={(e) => setSendType(e.target.value)}
                className="px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
              >
                <option value="">선택</option>
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-gray-500 mb-1">제목</label>
              <input
                type="text"
                value={sendTitle}
                onChange={(e) => setSendTitle(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                placeholder="알림 제목"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-gray-500 mb-1">내용</label>
              <input
                type="text"
                value={sendMessage}
                onChange={(e) => setSendMessage(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                placeholder="알림 내용 (선택)"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={sendMutation.isPending}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-gray-900 rounded hover:bg-gray-800 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {sendMutation.isPending ? '발송 중...' : '발송'}
            </button>
          </div>
        </div>

        {/* 발송 내역 */}
        <div className="bg-white border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-800">알림 발송 내역</h2>
            <select
              value={logTypeFilter}
              onChange={(e) => setLogTypeFilter(e.target.value)}
              className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
            >
              <option value="">전체</option>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600 border border-gray-200 bg-gray-50 whitespace-nowrap">발송일시</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600 border border-gray-200 bg-gray-50 whitespace-nowrap">타입</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600 border border-gray-200 bg-gray-50">제목</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-600 border border-gray-200 bg-gray-50 whitespace-nowrap">대상</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-600 border border-gray-200 bg-gray-50 whitespace-nowrap">수신 수</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600 border border-gray-200 bg-gray-50 whitespace-nowrap">발송자</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-gray-400 border border-gray-200">
                      발송 내역이 없습니다.
                    </td>
                  </tr>
                ) : logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 border border-gray-200 whitespace-nowrap">
                      {format(new Date(log.createdAt), 'yyyy.MM.dd HH:mm', { locale: ko })}
                    </td>
                    <td className="px-3 py-2 border border-gray-200 whitespace-nowrap">
                      {TYPE_LABELS[log.type] || log.type}
                    </td>
                    <td className="px-3 py-2 border border-gray-200">
                      {log.title}
                    </td>
                    <td className="px-3 py-2 border border-gray-200 text-center whitespace-nowrap">
                      {log.target === 'all' ? '전체' : '개별'}
                    </td>
                    <td className="px-3 py-2 border border-gray-200 text-center">
                      {log.recipientCount}명
                    </td>
                    <td className="px-3 py-2 border border-gray-200 whitespace-nowrap">
                      {log.createdByName || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
