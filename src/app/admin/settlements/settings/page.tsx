'use client';

import { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Save, Plus, Trash2 } from 'lucide-react';

interface DeductionItem {
  id: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  enabled: boolean;
}

export default function SettlementSettingsPage() {
  const [listingFeeRate, setListingFeeRate] = useState(2); // 상장수수료율 (%)
  const [deductionItems, setDeductionItems] = useState<DeductionItem[]>([
    { id: '1', name: '물류비', type: 'fixed', value: 21000, enabled: true },
    { id: '2', name: '상차비', type: 'fixed', value: 20000, enabled: true },
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', type: 'fixed' as 'percentage' | 'fixed', value: 0 });

  const handleSave = async () => {
    setIsSaving(true);
    // 실제로는 API 호출로 저장
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSaving(false);
    alert('설정이 저장되었습니다.');
  };

  const handleAddItem = () => {
    if (!newItem.name.trim()) {
      alert('공제금 제목을 입력해주세요.');
      return;
    }
    const newDeductionItem: DeductionItem = {
      id: String(Date.now()),
      name: newItem.name,
      type: newItem.type,
      value: newItem.value,
      enabled: true,
    };
    setDeductionItems([...deductionItems, newDeductionItem]);
    setNewItem({ name: '', type: 'fixed', value: 0 });
    setShowAddModal(false);
  };

  const handleDeleteItem = (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      setDeductionItems(deductionItems.filter(item => item.id !== id));
    }
  };

  const handleUpdateItem = (id: string, field: keyof DeductionItem, value: string | number | boolean) => {
    setDeductionItems(deductionItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">정산 설정</h1>
        <p className="text-sm text-gray-500 mt-1">상장수수료율 및 공제금 항목을 설정합니다.</p>
      </div>

      <div className="space-y-6">
        {/* 상장수수료율 설정 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">상장수수료율</h2>
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-600">수수료율</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={listingFeeRate}
                onChange={(e) => setListingFeeRate(Number(e.target.value))}
                className="w-24 px-3 py-2 border border-gray-200 rounded text-sm outline-none focus:border-blue-500 text-center"
                min={0}
                max={100}
                step={0.1}
              />
              <span className="text-sm text-gray-600">%</span>
            </div>
            <p className="text-xs text-gray-400 ml-4">※ 판매금액에서 해당 비율만큼 상장수수료로 공제됩니다.</p>
          </div>
        </div>

        {/* 공제금 항목 설정 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">공제금 항목 (두당)</h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
            >
              <Plus className="w-3.5 h-3.5" />
              항목 추가
            </button>
          </div>
          
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200 text-center w-12">사용</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200 text-center">공제금 제목</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200 text-center w-32">유형</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200 text-center w-40">금액 (두당)</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200 text-center w-20">삭제</th>
              </tr>
            </thead>
            <tbody>
              {deductionItems.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-2 border border-gray-200 text-center">
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={(e) => handleUpdateItem(item.id, 'enabled', e.target.checked)}
                      className="w-4 h-4 appearance-none bg-white border border-gray-200 rounded checked:bg-red-600 checked:border-red-600 relative checked:after:content-['✓'] checked:after:text-white checked:after:text-xs checked:after:absolute checked:after:top-0 checked:after:left-0.5"
                    />
                  </td>
                  <td className="px-3 py-2 border border-gray-200">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-sm outline-none focus:border-blue-500"
                    />
                  </td>
                  <td className="px-3 py-2 border border-gray-200 text-center">
                    <select
                      value={item.type}
                      onChange={(e) => handleUpdateItem(item.id, 'type', e.target.value as 'percentage' | 'fixed')}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-sm outline-none focus:border-blue-500 bg-white"
                    >
                      <option value="fixed">고정금액</option>
                      <option value="percentage">비율(%)</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 border border-gray-200">
                    <div className="flex items-center gap-2 justify-center">
                      <input
                        type="number"
                        value={item.value}
                        onChange={(e) => handleUpdateItem(item.id, 'value', Number(e.target.value))}
                        className="w-28 px-2 py-1 border border-gray-200 rounded text-sm outline-none focus:border-blue-500 text-right"
                      />
                      <span className="text-sm text-gray-600 w-8">
                        {item.type === 'percentage' ? '%' : '원'}
                      </span>
                    </div>
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
              {deductionItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 border border-gray-200 text-center text-gray-400 text-sm">
                    등록된 공제금 항목이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-500">
            <p>※ 고정금액: 두당 고정된 금액이 공제됩니다. (예: 물류비 21,000원/두)</p>
            <p>※ 비율(%): 판매금액에서 해당 비율만큼 공제됩니다.</p>
          </div>
        </div>

        {/* 저장 버튼 */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? '저장 중...' : '설정 저장'}
          </button>
        </div>
      </div>

      {/* 항목 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[400px]">
            <h3 className="text-lg font-semibold mb-4">공제금 항목 추가</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">공제금 제목</label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="예: 자조금"
                  className="w-full px-3 py-2 border border-gray-200 rounded text-sm outline-none focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-1">유형</label>
                <select
                  value={newItem.type}
                  onChange={(e) => setNewItem({ ...newItem, type: e.target.value as 'percentage' | 'fixed' })}
                  className="w-full px-3 py-2 border border-gray-200 rounded text-sm outline-none focus:border-blue-500 bg-white"
                >
                  <option value="fixed">고정금액</option>
                  <option value="percentage">비율(%)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  금액 (두당) {newItem.type === 'percentage' ? '(%)' : '(원)'}
                </label>
                <input
                  type="number"
                  value={newItem.value}
                  onChange={(e) => setNewItem({ ...newItem, value: Number(e.target.value) })}
                  placeholder={newItem.type === 'percentage' ? '0' : '0'}
                  className="w-full px-3 py-2 border border-gray-200 rounded text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded text-sm hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleAddItem}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
