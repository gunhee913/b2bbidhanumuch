'use client';

import { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Plus, Trash2 } from 'lucide-react';

const DAYS_OF_WEEK = [
  { value: 'mon', label: '월' },
  { value: 'tue', label: '화' },
  { value: 'wed', label: '수' },
  { value: 'thu', label: '목' },
  { value: 'fri', label: '금' },
  { value: 'sat', label: '토' },
  { value: 'sun', label: '일' },
];

interface AuctionTimeSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  enabled: boolean;
}

export default function AuctionTimeSettingsPage() {
  const [timeSlots, setTimeSlots] = useState<AuctionTimeSlot[]>([
    { id: '1', name: '1차 경매', startTime: '08:00', endTime: '09:00', enabled: true },
    { id: '2', name: '2차 경매', startTime: '10:30', endTime: '12:00', enabled: false },
  ]);
  const [operatingDays, setOperatingDays] = useState(['mon', 'tue', 'wed', 'thu', 'fri']);
  const [isSaving, setIsSaving] = useState(false);

  const handleDayToggle = (day: string) => {
    setOperatingDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleAddTimeSlot = () => {
    const newSlot: AuctionTimeSlot = {
      id: String(Date.now()),
      name: `${timeSlots.length + 1}차 경매`,
      startTime: '14:00',
      endTime: '15:00',
      enabled: true,
    };
    setTimeSlots([...timeSlots, newSlot]);
  };

  const handleRemoveTimeSlot = (id: string) => {
    if (timeSlots.length <= 1) return;
    setTimeSlots(timeSlots.filter(slot => slot.id !== id));
  };

  const handleUpdateTimeSlot = (id: string, field: keyof AuctionTimeSlot, value: string | boolean) => {
    setTimeSlots(timeSlots.map(slot =>
      slot.id === id ? { ...slot, [field]: value } : slot
    ));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSaving(false);
    alert('설정이 저장되었습니다.');
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">경매시간 설정</h1>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-1.5 bg-gray-900 text-white text-xs hover:bg-gray-800 disabled:opacity-50"
        >
          {isSaving ? '저장 중...' : '저장'}
        </button>
      </div>

      <div className="space-y-6">
        {/* 경매 시간대 */}
        <div className="bg-white border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-800">경매 시간</h2>
            <button
              onClick={handleAddTimeSlot}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-gray-700 text-xs hover:bg-gray-50"
            >
              <Plus className="w-3 h-3" />
              시간대 추가
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="w-16 px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">사용</th>
                  <th className="w-32 px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">구분</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">경매 시간</th>
                  <th className="w-16 px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">삭제</th>
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((slot) => (
                  <tr key={slot.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 border border-gray-200 text-center">
                      <button
                        onClick={() => handleUpdateTimeSlot(slot.id, 'enabled', !slot.enabled)}
                        className={`w-10 h-5 rounded-full relative transition-colors ${
                          slot.enabled ? 'bg-gray-700' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                            slot.enabled ? 'right-0.5' : 'left-0.5'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-3 py-2 border border-gray-200">
                      <input
                        type="text"
                        value={slot.name}
                        onChange={(e) => handleUpdateTimeSlot(slot.id, 'name', e.target.value)}
                        className="w-full px-2 py-1 bg-gray-50 border-0 text-xs outline-none text-center focus:bg-white focus:ring-1 focus:ring-gray-300"
                      />
                    </td>
                    <td className="px-3 py-2 border border-gray-200">
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => handleUpdateTimeSlot(slot.id, 'startTime', e.target.value)}
                          className="px-2 py-1 bg-gray-50 border-0 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-gray-300"
                        />
                        <span className="text-xs text-gray-500">~</span>
                        <input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) => handleUpdateTimeSlot(slot.id, 'endTime', e.target.value)}
                          className="px-2 py-1 bg-gray-50 border-0 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-gray-300"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2 border border-gray-200 text-center">
                      <button
                        onClick={() => handleRemoveTimeSlot(slot.id)}
                        disabled={timeSlots.length <= 1}
                        className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
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

        {/* 운영 요일 */}
        <div className="bg-white border border-gray-200 p-6">
          <h2 className="text-sm font-bold text-gray-800 mb-4">운영 요일</h2>
          <div className="flex items-center gap-2">
            {DAYS_OF_WEEK.map(day => (
              <button
                key={day.value}
                onClick={() => handleDayToggle(day.value)}
                className={`w-10 h-10 text-xs font-medium rounded-full transition-colors ${
                  operatingDays.includes(day.value)
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
