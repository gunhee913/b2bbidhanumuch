'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Plus, Pin, PinOff, Eye, EyeOff, Pencil, Trash2, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isWeekend, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Notice {
  id: string;
  title: string;
  content: string;
  category: string;
  isPinned: boolean;
  isPublished: boolean;
  target: string;
  authorId: string | null;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = ['일반', '경매일정', '휴무', '시스템'];
const TARGETS = [
  { value: 'all', label: '전체' },
  { value: 'dealer', label: '중도매인' },
  { value: 'company', label: '상장업체' },
];

function generateCalendarHTML(year: number, month: number, auctionDays: Set<number>, holidays: Set<number>) {
  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(monthStart);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const weeks: Date[][] = [];
  let current = calStart;
  while (current <= calEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(current);
      current = addDays(current, 1);
    }
    weeks.push(week);
  }

  let html = `<div style="max-width:500px;margin:0 auto;">`;
  html += `<h3 style="text-align:center;font-size:18px;font-weight:bold;margin-bottom:12px;">${year}년 ${month}월 경매 일정 안내</h3>`;
  html += `<table style="width:100%;border-collapse:collapse;text-align:center;font-size:14px;">`;
  html += `<thead><tr>`;
  ['일', '월', '화', '수', '목', '금', '토'].forEach((d, i) => {
    const color = i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : '#374151';
    html += `<th style="padding:6px;border:1px solid #e5e7eb;background:#f9fafb;color:${color};font-weight:600;">${d}</th>`;
  });
  html += `</tr></thead><tbody>`;

  weeks.forEach(week => {
    html += `<tr>`;
    week.forEach(day => {
      const inMonth = isSameMonth(day, monthStart);
      const dayNum = day.getDate();
      const dayOfWeek = getDay(day);

      let bgColor = '#ffffff';
      let badge = '';

      if (inMonth) {
        if (auctionDays.has(dayNum)) {
          bgColor = '#eff6ff';
          badge = `<div style="font-size:10px;color:#2563eb;font-weight:600;margin-top:2px;">경매</div>`;
        } else if (holidays.has(dayNum)) {
          bgColor = '#fef2f2';
          badge = `<div style="font-size:10px;color:#ef4444;font-weight:600;margin-top:2px;">휴무</div>`;
        }
      }

      const textColor = !inMonth ? '#d1d5db' : dayOfWeek === 0 ? '#ef4444' : dayOfWeek === 6 ? '#3b82f6' : '#374151';

      html += `<td style="padding:4px;border:1px solid #e5e7eb;height:48px;vertical-align:top;background:${bgColor};">`;
      html += `<div style="color:${textColor};font-weight:${inMonth ? '500' : '300'};">${dayNum}</div>`;
      html += badge;
      html += `</td>`;
    });
    html += `</tr>`;
  });

  html += `</tbody></table>`;
  html += `<div style="margin-top:8px;font-size:12px;color:#6b7280;display:flex;gap:12px;justify-content:center;">`;
  html += `<span>🔵 경매일</span><span>🔴 휴무일</span>`;
  html += `</div></div>`;

  return html;
}

function CalendarTemplateModal({ onApply, onClose }: { onApply: (title: string, content: string) => void; onClose: () => void }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [auctionDays, setAuctionDays] = useState<Set<number>>(new Set());
  const [holidays, setHolidays] = useState<Set<number>>(new Set());

  const monthStart = useMemo(() => startOfMonth(new Date(year, month - 1)), [year, month]);
  const monthEnd = useMemo(() => endOfMonth(monthStart), [monthStart]);
  const calStart = useMemo(() => startOfWeek(monthStart, { weekStartsOn: 0 }), [monthStart]);
  const calEnd = useMemo(() => endOfWeek(monthEnd, { weekStartsOn: 0 }), [monthEnd]);

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    let current = calStart;
    while (current <= calEnd) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(current);
        current = addDays(current, 1);
      }
      result.push(week);
    }
    return result;
  }, [calStart, calEnd]);

  const autoFillWeekdays = () => {
    const newAuction = new Set<number>();
    let d = new Date(year, month - 1, 1);
    while (d.getMonth() === month - 1) {
      if (!isWeekend(d) && !holidays.has(d.getDate())) {
        newAuction.add(d.getDate());
      }
      d = addDays(d, 1);
    }
    setAuctionDays(newAuction);
  };

  const clearAll = () => {
    setAuctionDays(new Set());
    setHolidays(new Set());
  };

  const toggleDay = (dayNum: number, type: 'auction' | 'holiday') => {
    if (type === 'auction') {
      const next = new Set(auctionDays);
      if (next.has(dayNum)) {
        next.delete(dayNum);
      } else {
        next.add(dayNum);
        const hNext = new Set(holidays);
        hNext.delete(dayNum);
        setHolidays(hNext);
      }
      setAuctionDays(next);
    } else {
      const next = new Set(holidays);
      if (next.has(dayNum)) {
        next.delete(dayNum);
      } else {
        next.add(dayNum);
        const aNext = new Set(auctionDays);
        aNext.delete(dayNum);
        setAuctionDays(aNext);
      }
      setHolidays(next);
    }
  };

  const handleApply = () => {
    const title = `${year}년 ${month}월 경매 일정 안내`;
    const content = generateCalendarHTML(year, month, auctionDays, holidays);
    onApply(title, content);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b">
          <h3 className="text-sm font-bold">경매 일정 달력 템플릿</h3>
          <p className="text-xs text-gray-500 mt-1">날짜를 클릭하여 경매일/휴무일을 지정하세요</p>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="border border-gray-200 px-2 py-1 text-xs outline-none"
            >
              {[2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              className="border border-gray-200 px-2 py-1 text-xs outline-none"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{m}월</option>
              ))}
            </select>
            <button
              onClick={autoFillWeekdays}
              className="text-xs bg-blue-50 text-blue-600 px-2 py-1 hover:bg-blue-100"
            >
              평일 자동채우기
            </button>
            <button
              onClick={clearAll}
              className="text-xs bg-gray-50 text-gray-600 px-2 py-1 hover:bg-gray-100"
            >
              초기화
            </button>
          </div>

          <div className="text-xs text-gray-500 mb-2 flex gap-3">
            <span>좌클릭: <span className="text-blue-600 font-medium">경매일</span></span>
            <span>우클릭: <span className="text-red-500 font-medium">휴무일</span></span>
          </div>

          <table className="w-full border-collapse text-center text-xs">
            <thead>
              <tr>
                {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                  <th key={d} className={`py-1.5 border text-xs font-semibold ${
                    i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-700'
                  } bg-gray-50`}>
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, wi) => (
                <tr key={wi}>
                  {week.map((day, di) => {
                    const inMonth = isSameMonth(day, monthStart);
                    const dayNum = day.getDate();
                    const dayOfWeek = getDay(day);
                    const isAuction = inMonth && auctionDays.has(dayNum);
                    const isHoliday = inMonth && holidays.has(dayNum);

                    return (
                      <td
                        key={di}
                        className={`border h-12 relative cursor-pointer transition-colors ${
                          !inMonth ? 'bg-gray-50 text-gray-300' :
                          isAuction ? 'bg-blue-50' :
                          isHoliday ? 'bg-red-50' :
                          'hover:bg-gray-100'
                        }`}
                        onClick={() => inMonth && toggleDay(dayNum, 'auction')}
                        onContextMenu={e => {
                          e.preventDefault();
                          if (inMonth) toggleDay(dayNum, 'holiday');
                        }}
                      >
                        <div className={`text-xs ${
                          !inMonth ? '' :
                          dayOfWeek === 0 ? 'text-red-500' :
                          dayOfWeek === 6 ? 'text-blue-500' :
                          'text-gray-700'
                        }`}>
                          {dayNum}
                        </div>
                        {isAuction && <div className="text-[9px] text-blue-600 font-semibold">경매</div>}
                        {isHoliday && <div className="text-[9px] text-red-500 font-semibold">휴무</div>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-3 text-xs text-gray-500">
            경매일: {auctionDays.size}일 / 휴무일: {holidays.size}일
          </div>
        </div>

        <div className="p-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-1.5 border border-gray-300 hover:bg-gray-50 text-xs font-medium text-gray-700 bg-white">
            취소
          </button>
          <button
            onClick={handleApply}
            disabled={auctionDays.size === 0 && holidays.size === 0}
            className="px-4 py-1.5 bg-gray-700 text-white hover:bg-gray-800 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            적용
          </button>
        </div>
      </div>
    </div>
  );
}

const formatDateTime = (dateStr: string | null) => {
  if (!dateStr) return '-';
  return format(new Date(dateStr), 'yyyy-MM-dd HH:mm', { locale: ko });
};

export default function AdminNoticesPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCalendarTemplate, setShowCalendarTemplate] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '일반',
    isPinned: false,
    isPublished: true,
    target: 'all',
  });
  const [filterCategory, setFilterCategory] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: notices = [], isLoading } = useQuery<Notice[]>({
    queryKey: ['admin-notices'],
    queryFn: async () => {
      const res = await fetch('/api/admin/notices');
      if (!res.ok) throw new Error('조회 실패');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/admin/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('등록 실패');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notices'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/admin/notices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('수정 실패');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notices'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/notices/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('삭제 실패');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notices'] });
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      const res = await fetch(`/api/admin/notices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned }),
      });
      if (!res.ok) throw new Error('수정 실패');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notices'] });
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, isPublished }: { id: string; isPublished: boolean }) => {
      const res = await fetch(`/api/admin/notices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished }),
      });
      if (!res.ok) throw new Error('수정 실패');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notices'] });
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setExpandedId(null);
    setFormData({ title: '', content: '', category: '일반', isPinned: false, isPublished: true, target: 'all' });
  };

  const handleRowClick = (notice: Notice) => {
    if (expandedId === notice.id) {
      setExpandedId(null);
      setEditingId(null);
    } else {
      setExpandedId(notice.id);
      setEditingId(null);
      setShowForm(false);
    }
  };

  const handleStartEdit = (notice: Notice) => {
    setEditingId(notice.id);
    setExpandedId(notice.id);
    setShowForm(false);
    setFormData({
      title: notice.title,
      content: notice.content,
      category: notice.category,
      isPinned: notice.isPinned,
      isPublished: notice.isPublished,
      target: notice.target,
    });
  };

  const handleSave = () => {
    const adminSession = session as any;
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate({
        ...formData,
        authorId: adminSession?.admin?.id || null,
        authorName: adminSession?.admin?.name || null,
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCalendarApply = (title: string, content: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      content,
      category: '경매일정',
    }));
    setShowCalendarTemplate(false);
    if (!editingId) {
      setShowForm(true);
    }
  };

  const filteredNotices = useMemo(() => {
    return notices.filter(n => {
      if (filterCategory !== '전체' && n.category !== filterCategory) return false;
      if (searchQuery && !n.title.includes(searchQuery)) return false;
      return true;
    });
  }, [notices, filterCategory, searchQuery]);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">공지사항 관리</h1>
      </div>

      {/* 필터 + 버튼 영역 */}
      <div className="bg-white border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
          >
            <option value="전체">전체 분류</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="제목 검색..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-64 px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
          />
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setShowCalendarTemplate(true)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-gray-300 hover:bg-gray-50 text-xs font-medium text-gray-700 bg-white"
            >
              <Calendar className="w-3.5 h-3.5" />
              달력 템플릿
            </button>
            <button
              onClick={() => { resetForm(); setShowForm(true); setExpandedId(null); }}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gray-700 text-white hover:bg-gray-800 text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              공지 등록
            </button>
          </div>
        </div>
      </div>

      {/* 등록/수정 폼 */}
      {showForm && (
        <div className="bg-white border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-gray-900">공지사항 등록</h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-3">
            <div>
              <label className="text-[11px] text-gray-500 block mb-1">분류</label>
              <select
                value={formData.category}
                onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-200 text-xs outline-none bg-white"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-gray-500 block mb-1">대상</label>
              <select
                value={formData.target}
                onChange={e => setFormData(prev => ({ ...prev, target: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-200 text-xs outline-none bg-white"
              >
                {TARGETS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isPinned}
                  onChange={e => setFormData(prev => ({ ...prev, isPinned: e.target.checked }))}
                />
                상단 고정
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isPublished}
                  onChange={e => setFormData(prev => ({ ...prev, isPublished: e.target.checked }))}
                />
                바로 게시
              </label>
            </div>
          </div>

          <div className="mb-3">
            <label className="text-[11px] text-gray-500 block mb-1">제목</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="공지사항 제목을 입력하세요"
              className="w-full px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
            />
          </div>

          <div className="mb-3">
            <label className="text-[11px] text-gray-500 block mb-1">내용</label>
            {formData.content && formData.category === '경매일정' ? (
              <div>
                <div
                  className="border border-gray-200 p-3 bg-gray-50 text-xs"
                  dangerouslySetInnerHTML={{ __html: formData.content }}
                />
                <button
                  onClick={() => setShowCalendarTemplate(true)}
                  className="mt-1 text-xs text-blue-600 hover:underline"
                >
                  달력 다시 편집
                </button>
              </div>
            ) : (
              <textarea
                value={formData.content}
                onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="공지사항 내용을 입력하세요"
                rows={6}
                className="w-full px-3 py-2 border border-gray-200 text-xs outline-none bg-white resize-y"
              />
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={resetForm} className="px-4 py-1.5 border border-gray-300 hover:bg-gray-50 text-xs font-medium text-gray-700 bg-white">
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={!formData.title || !formData.content || createMutation.isPending}
              className="px-4 py-1.5 bg-gray-700 text-white hover:bg-gray-800 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              등록
            </button>
          </div>
        </div>
      )}

      {/* 목록 테이블 */}
      <div className="bg-white border border-gray-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2 text-left font-medium text-gray-600" style={{ width: 50 }}>고정</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap" style={{ width: 80 }}>분류</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">제목</th>
              <th className="px-3 py-2 text-center font-medium text-gray-600" style={{ width: 60 }}>대상</th>
              <th className="px-3 py-2 text-center font-medium text-gray-600" style={{ width: 50 }}>상태</th>
              <th className="px-3 py-2 text-center font-medium text-gray-600" style={{ width: 70 }}>작성자</th>
              <th className="px-3 py-2 text-center font-medium text-gray-600" style={{ width: 120 }}>등록일</th>
              <th className="px-3 py-2 text-center font-medium text-gray-600" style={{ width: 80 }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-gray-400">로딩 중...</td>
              </tr>
            ) : filteredNotices.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-gray-400">등록된 공지사항이 없습니다.</td>
              </tr>
            ) : (
              filteredNotices.map(notice => {
                const isExpanded = expandedId === notice.id;
                const isEditing = editingId === notice.id;
                const isHTML = (str: string) => /<[a-z][\s\S]*>/i.test(str);

                return (
                  <React.Fragment key={notice.id}>
                    <tr
                      className={`border-b border-gray-200 cursor-pointer transition-colors ${isExpanded ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                      onClick={() => handleRowClick(notice)}
                    >
                      <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => togglePinMutation.mutate({ id: notice.id, isPinned: !notice.isPinned })}
                          className={notice.isPinned ? 'text-amber-500' : 'text-gray-300 hover:text-gray-500'}
                        >
                          {notice.isPinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`text-[10px] px-1.5 py-0.5 ${
                          notice.category === '경매일정' ? 'bg-blue-50 text-blue-600' :
                          notice.category === '휴무' ? 'bg-red-50 text-red-600' :
                          notice.category === '시스템' ? 'bg-purple-50 text-purple-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {notice.category}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {notice.isPinned && <span className="text-amber-500 mr-1">[고정]</span>}
                        {notice.title}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-500">
                        {TARGETS.find(t => t.value === notice.target)?.label || notice.target}
                      </td>
                      <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => togglePublishMutation.mutate({ id: notice.id, isPublished: !notice.isPublished })}
                          className={notice.isPublished ? 'text-green-500' : 'text-gray-300 hover:text-gray-500'}
                          title={notice.isPublished ? '게시중 (클릭하면 비공개)' : '비공개 (클릭하면 게시)'}
                        >
                          {notice.isPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-center text-gray-500">
                        {notice.authorName || '-'}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-500 whitespace-nowrap">
                        {formatDateTime(notice.createdAt)}
                      </td>
                      <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleStartEdit(notice)}
                            className="p-1 text-gray-400 hover:text-blue-600"
                            title="수정"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(notice.id)}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={8} className="bg-gray-50 border-b border-gray-200">
                          {isEditing ? (
                            <div className="p-4">
                              <div className="grid grid-cols-4 gap-3 mb-3">
                                <div>
                                  <label className="text-[11px] text-gray-500 block mb-1">분류</label>
                                  <select
                                    value={formData.category}
                                    onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                    className="w-full px-2 py-1.5 border border-gray-200 text-xs outline-none bg-white"
                                  >
                                    {CATEGORIES.map(c => (
                                      <option key={c} value={c}>{c}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[11px] text-gray-500 block mb-1">대상</label>
                                  <select
                                    value={formData.target}
                                    onChange={e => setFormData(prev => ({ ...prev, target: e.target.value }))}
                                    className="w-full px-2 py-1.5 border border-gray-200 text-xs outline-none bg-white"
                                  >
                                    {TARGETS.map(t => (
                                      <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="flex items-end gap-4">
                                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={formData.isPinned}
                                      onChange={e => setFormData(prev => ({ ...prev, isPinned: e.target.checked }))}
                                    />
                                    상단 고정
                                  </label>
                                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={formData.isPublished}
                                      onChange={e => setFormData(prev => ({ ...prev, isPublished: e.target.checked }))}
                                    />
                                    게시
                                  </label>
                                </div>
                              </div>
                              <div className="mb-3">
                                <label className="text-[11px] text-gray-500 block mb-1">제목</label>
                                <input
                                  type="text"
                                  value={formData.title}
                                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                  className="w-full px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
                                />
                              </div>
                              <div className="mb-3">
                                <label className="text-[11px] text-gray-500 block mb-1">내용</label>
                                {formData.content && formData.category === '경매일정' ? (
                                  <div>
                                    <div
                                      className="border border-gray-200 p-3 bg-white text-xs"
                                      dangerouslySetInnerHTML={{ __html: formData.content }}
                                    />
                                    <button
                                      onClick={() => setShowCalendarTemplate(true)}
                                      className="mt-1 text-xs text-blue-600 hover:underline"
                                    >
                                      달력 다시 편집
                                    </button>
                                  </div>
                                ) : (
                                  <textarea
                                    value={formData.content}
                                    onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                                    rows={6}
                                    className="w-full px-3 py-2 border border-gray-200 text-xs outline-none bg-white resize-y"
                                  />
                                )}
                              </div>
                              <div className="flex justify-end gap-2">
                                <button onClick={() => setEditingId(null)} className="px-4 py-1.5 border border-gray-300 hover:bg-gray-50 text-xs font-medium text-gray-700 bg-white">
                                  취소
                                </button>
                                <button
                                  onClick={handleSave}
                                  disabled={!formData.title || !formData.content || updateMutation.isPending}
                                  className="px-4 py-1.5 bg-gray-700 text-white hover:bg-gray-800 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  수정
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="p-4">
                              {isHTML(notice.content) ? (
                                <div
                                  className="text-xs text-gray-700 leading-relaxed"
                                  dangerouslySetInnerHTML={{ __html: notice.content }}
                                />
                              ) : (
                                <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                                  {notice.content}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-2 text-xs text-gray-500">
        총 {filteredNotices.length}건
      </div>

      {showCalendarTemplate && (
        <CalendarTemplateModal
          onApply={handleCalendarApply}
          onClose={() => setShowCalendarTemplate(false)}
        />
      )}
    </AdminLayout>
  );
}
