'use client';

import { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';

interface NotificationSetting {
  id: string;
  name: string;
  description: string;
  category: 'auction' | 'payment';
  enabled: boolean;
}

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState<NotificationSetting[]>([
    { id: '1', name: '경매 시작', description: '당일 경매가 시작될 때 알림', category: 'auction', enabled: true },
    { id: '2', name: '최고가 갱신', description: '입찰한 물건의 최고가가 갱신될 때 알림', category: 'auction', enabled: true },
    { id: '3', name: '일일 경매 결과', description: '경매 종료 후 금일 경매 결과 알림', category: 'auction', enabled: true },
    { id: '4', name: '잔고 안내', description: '예치금 잔고 현황 안내 알림', category: 'payment', enabled: true },
    { id: '5', name: '입금 확인', description: '예치금 입금이 확인되었을 때 알림', category: 'payment', enabled: true },
    { id: '6', name: '정산 완료', description: '상장업체 정산이 완료되었을 때 알림', category: 'payment', enabled: true },
  ]);

  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = (id: string) => {
    setSettings(settings.map(setting =>
      setting.id === id ? { ...setting, enabled: !setting.enabled } : setting
    ));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSaving(false);
    alert('설정이 저장되었습니다.');
  };

  const auctionSettings = settings.filter(s => s.category === 'auction');
  const paymentSettings = settings.filter(s => s.category === 'payment');

  const renderSettingsTable = (items: NotificationSetting[], title: string) => (
    <div className="bg-white border border-gray-200 p-6">
      <h2 className="text-sm font-bold text-gray-800 mb-4">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-16 px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">사용</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">알림 항목</th>
            </tr>
          </thead>
          <tbody>
            {items.map((setting) => (
              <tr key={setting.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 border border-gray-200 text-center">
                  <button
                    onClick={() => handleToggle(setting.id)}
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
                </td>
                <td className="px-3 py-2 border border-gray-200">
                  <div>
                    <span className="text-xs font-medium text-gray-800">{setting.name}</span>
                    <p className="text-xs text-gray-400 mt-0.5">{setting.description}</p>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">문자/알림 설정</h1>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-1.5 bg-gray-900 text-white text-xs hover:bg-gray-800 disabled:opacity-50"
        >
          {isSaving ? '저장 중...' : '저장'}
        </button>
      </div>

      <div className="space-y-6">
        {renderSettingsTable(auctionSettings, '경매 알림')}
        {renderSettingsTable(paymentSettings, '결제/정산 알림')}
      </div>
    </AdminLayout>
  );
}
