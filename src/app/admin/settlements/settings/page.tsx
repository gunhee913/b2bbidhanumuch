'use client';

import { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Plus, Trash2 } from 'lucide-react';

interface SettingItem {
  id: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  enabled: boolean;
  updatedAt: string;
  updatedBy: string;
}

export default function SettlementSettingsPage() {
  // 현재 로그인한 관리자 (실제로는 세션에서 가져옴)
  const currentAdmin = '홍길동';

  const [settingItems, setSettingItems] = useState<SettingItem[]>([
    { id: 'fee', name: '상장수수료', type: 'percentage', value: 2, enabled: true, updatedAt: '2026-01-20 14:30', updatedBy: '홍길동' },
    { id: '1', name: '물류비', type: 'fixed', value: 21000, enabled: true, updatedAt: '2026-01-18 09:15', updatedBy: '김관리' },
    { id: '2', name: '상차비', type: 'fixed', value: 20000, enabled: true, updatedAt: '2026-01-15 11:45', updatedBy: '이매니저' },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSaving(false);
    alert('설정이 저장되었습니다.');
  };

  const handleAddItem = () => {
    const newSettingItem: SettingItem = {
      id: String(Date.now()),
      name: '',
      type: 'fixed',
      value: 0,
      enabled: true,
      updatedAt: getCurrentDateTime(),
      updatedBy: currentAdmin,
    };
    setSettingItems([...settingItems, newSettingItem]);
  };

  const handleDeleteItem = (id: string) => {
    setSettingItems(settingItems.filter(item => item.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof SettingItem, value: string | number | boolean) => {
    setSettingItems(settingItems.map(item => 
      item.id === id ? { 
        ...item, 
        [field]: value,
        updatedAt: getCurrentDateTime(),
        updatedBy: currentAdmin,
      } : item
    ));
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">정산 설정</h1>
      </div>

      <div className="space-y-6">
        {/* 정산 항목 설정 */}
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
                disabled={isSaving}
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
                  <th className="w-16 px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">사용</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">항목명</th>
                  <th className="w-28 px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">유형</th>
                  <th className="w-36 px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">값</th>
                  <th className="w-40 px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">수정일시</th>
                  <th className="w-20 px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">수정자</th>
                  <th className="w-16 px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">삭제</th>
                </tr>
              </thead>
              <tbody>
                {settingItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 border border-gray-200 text-center">
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
                    <td className="px-3 py-2 border border-gray-200">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                        placeholder="항목명 입력"
                        className="w-full px-2 py-1 bg-gray-50 border-0 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-gray-300 placeholder:text-gray-400"
                      />
                    </td>
                    <td className="px-3 py-2 border border-gray-200 text-center">
                      <select
                        value={item.type}
                        onChange={(e) => handleUpdateItem(item.id, 'type', e.target.value as 'percentage' | 'fixed')}
                        className="w-full px-2 py-1 bg-gray-50 border-0 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-gray-300"
                      >
                        <option value="fixed">고정금액</option>
                        <option value="percentage">비율</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 border border-gray-200">
                      <div className="flex items-center gap-1 justify-center">
                        <input
                          type="text"
                          value={item.value === 0 ? '' : item.value.toLocaleString()}
                          onChange={(e) => {
                            const numValue = Number(e.target.value.replace(/,/g, ''));
                            if (!isNaN(numValue)) {
                              handleUpdateItem(item.id, 'value', numValue);
                            }
                          }}
                          placeholder="0"
                          className="w-24 px-2 py-1 bg-gray-50 border-0 text-xs outline-none text-right focus:bg-white focus:ring-1 focus:ring-gray-300 placeholder:text-gray-400"
                        />
                        <span className="text-xs text-gray-500 w-6">
                          {item.type === 'percentage' ? '%' : '원'}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 border border-gray-200 text-center">
                      <span className="text-xs text-gray-500">{item.updatedAt}</span>
                    </td>
                    <td className="px-3 py-2 border border-gray-200 text-center">
                      <span className="text-xs text-gray-700">{item.updatedBy}</span>
                    </td>
                    <td className="px-3 py-2 border border-gray-200 text-center">
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
