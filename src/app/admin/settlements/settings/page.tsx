'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface SettingItem {
  id: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  enabled: boolean;
  sortOrder: number;
  updatedAt: string;
  updatedBy: string;
}

export default function SettlementSettingsPage() {
  const { data: session } = useSession();
  const currentAdmin = (session as any)?.user?.name || '관리자';

  const [settingItems, setSettingItems] = useState<SettingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingValue, setEditingValue] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/settlements/settings');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSettingItems(data.items || []);
    } catch {
      alert('설정을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  const handleSave = async () => {
    const hasEmptyName = settingItems.some(item => !item.name.trim());
    if (hasEmptyName) {
      alert('항목명을 입력해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/settlements/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: settingItems.map((item, idx) => ({
            id: item.id,
            name: item.name,
            type: item.type,
            value: item.value,
            enabled: item.enabled,
            sortOrder: idx,
          })),
          updatedBy: currentAdmin,
        }),
      });

      if (!res.ok) throw new Error();
      const data = await res.json();
      setSettingItems(data.items || []);
      alert('설정이 저장되었습니다.');
    } catch {
      alert('설정 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddItem = () => {
    const newItem: SettingItem = {
      id: `new-${Date.now()}`,
      name: '',
      type: 'fixed',
      value: 0,
      enabled: true,
      sortOrder: settingItems.length,
      updatedAt: new Date().toISOString(),
      updatedBy: currentAdmin,
    };
    setSettingItems([...settingItems, newItem]);
  };

  const handleDeleteItem = (id: string) => {
    setSettingItems(settingItems.filter(item => item.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof SettingItem, value: string | number | boolean) => {
    setSettingItems(settingItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">정산 설정</h1>
      </div>

      <div className="space-y-6">
        <div className="bg-white border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-800">정산 항목</h2>
            <div className="flex gap-2">
              <button
                onClick={handleAddItem}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50"
              >
                <Plus className="w-3 h-3" />
                항목 추가
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || isLoading}
                className="px-4 py-1.5 bg-gray-900 text-white text-xs hover:bg-gray-800 disabled:opacity-50"
              >
                {isSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="w-16 px-2 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50 whitespace-nowrap">사용</th>
                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50 whitespace-nowrap">항목명</th>
                  <th className="w-28 px-2 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50 whitespace-nowrap">유형</th>
                  <th className="w-36 px-2 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50 whitespace-nowrap">값</th>
                  <th className="w-40 px-2 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50 whitespace-nowrap">수정일시</th>
                  <th className="w-20 px-2 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50 whitespace-nowrap">수정자</th>
                  <th className="w-16 px-2 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50 whitespace-nowrap">삭제</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        설정을 불러오는 중...
                      </div>
                    </td>
                  </tr>
                ) : settingItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      설정된 항목이 없습니다. 항목을 추가해주세요.
                    </td>
                  </tr>
                ) : (
                  settingItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-2 py-2 border border-gray-200 text-center whitespace-nowrap">
                        <div className="relative inline-flex items-center justify-center w-4 h-4 overflow-hidden">
                          <input
                            type="checkbox"
                            checked={item.enabled}
                            onChange={(e) => handleUpdateItem(item.id, 'enabled', e.target.checked)}
                            className="w-4 h-4 rounded appearance-none bg-white border border-gray-300 checked:bg-gray-700 checked:border-gray-700"
                          />
                          {item.enabled && (
                            <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold pointer-events-none">✓</span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2 border border-gray-200 whitespace-nowrap">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                          placeholder="항목명 입력"
                          className="w-full px-2 py-1 bg-gray-50 border-0 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-gray-300 placeholder:text-gray-400"
                        />
                      </td>
                      <td className="px-2 py-2 border border-gray-200 text-center whitespace-nowrap">
                        <select
                          value={item.type}
                          onChange={(e) => handleUpdateItem(item.id, 'type', e.target.value as 'percentage' | 'fixed')}
                          className="w-full px-2 py-1 bg-gray-50 border-0 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-gray-300"
                        >
                          <option value="fixed">고정금액</option>
                          <option value="percentage">비율</option>
                        </select>
                      </td>
                      <td className="px-2 py-2 border border-gray-200 whitespace-nowrap">
                        <div className="flex items-center gap-1 justify-center">
                          <input
                            type="text"
                            value={editingValue[item.id] !== undefined
                              ? editingValue[item.id]
                              : (item.value === 0 ? '' : (item.type === 'percentage' ? String(item.value) : item.value.toLocaleString()))
                            }
                            onFocus={() => {
                              setEditingValue(prev => ({
                                ...prev,
                                [item.id]: item.value === 0 ? '' : (item.type === 'percentage' ? String(item.value) : item.value.toLocaleString()),
                              }));
                            }}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (item.type === 'percentage') {
                                if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
                                  setEditingValue(prev => ({ ...prev, [item.id]: raw }));
                                }
                              } else {
                                const cleaned = raw.replace(/,/g, '');
                                if (cleaned === '' || /^\d+$/.test(cleaned)) {
                                  setEditingValue(prev => ({ ...prev, [item.id]: raw }));
                                }
                              }
                            }}
                            onBlur={() => {
                              const raw = editingValue[item.id] ?? '';
                              const numValue = Number(raw.replace(/,/g, ''));
                              if (!isNaN(numValue)) {
                                handleUpdateItem(item.id, 'value', numValue);
                              }
                              setEditingValue(prev => {
                                const next = { ...prev };
                                delete next[item.id];
                                return next;
                              });
                            }}
                            placeholder="0"
                            className="w-24 px-2 py-1 bg-gray-50 border-0 text-xs outline-none text-right focus:bg-white focus:ring-1 focus:ring-gray-300 placeholder:text-gray-400"
                          />
                          <span className="text-xs text-gray-500 w-6">
                            {item.type === 'percentage' ? '%' : '원'}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-2 border border-gray-200 text-center whitespace-nowrap">
                        <span className="text-xs text-gray-500">{formatDateTime(item.updatedAt)}</span>
                      </td>
                      <td className="px-2 py-2 border border-gray-200 text-center whitespace-nowrap">
                        <span className="text-xs text-gray-700">{item.updatedBy}</span>
                      </td>
                      <td className="px-2 py-2 border border-gray-200 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
