'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { Save } from 'lucide-react';

interface CompanyInfo {
  id: string;
  name: string;
  representative: string;
  phone: string;
  fax: string;
  email: string;
  businessNumber: string;
  ecommerceNumber: string;
  address: string;
  businessHours: string;
  updatedAt: string;
}

export default function CompanyInfoPage() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    name: '',
    representative: '',
    phone: '',
    fax: '',
    email: '',
    businessNumber: '',
    ecommerceNumber: '',
    address: '',
    businessHours: '',
  });

  const { data, isLoading } = useQuery<CompanyInfo>({
    queryKey: ['admin-company-info'],
    queryFn: async () => {
      const res = await fetch('/api/admin/company-info');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  useEffect(() => {
    if (data) {
      setForm({
        name: data.name || '',
        representative: data.representative || '',
        phone: data.phone || '',
        fax: data.fax || '',
        email: data.email || '',
        businessNumber: data.businessNumber || '',
        ecommerceNumber: data.ecommerceNumber || '',
        address: data.address || '',
        businessHours: data.businessHours || '',
      });
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async (formData: typeof form) => {
      const res = await fetch('/api/admin/company-info', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-company-info'] });
      setIsEditing(false);
      alert('저장되었습니다.');
    },
    onError: () => {
      alert('저장에 실패했습니다.');
    },
  });

  const handleSave = () => {
    updateMutation.mutate(form);
  };

  const handleCancel = () => {
    if (data) {
      setForm({
        name: data.name || '',
        representative: data.representative || '',
        phone: data.phone || '',
        fax: data.fax || '',
        email: data.email || '',
        businessNumber: data.businessNumber || '',
        ecommerceNumber: data.ecommerceNumber || '',
        address: data.address || '',
        businessHours: data.businessHours || '',
      });
    }
    setIsEditing(false);
  };

  const fields = [
    { key: 'name', label: '상호' },
    { key: 'representative', label: '대표' },
    { key: 'address', label: '주소' },
    { key: 'businessNumber', label: '사업자등록번호' },
    { key: 'ecommerceNumber', label: '통신판매번호' },
    { key: 'phone', label: '전화번호' },
    { key: 'fax', label: '팩스번호' },
    { key: 'email', label: '이메일' },
    { key: 'businessHours', label: '운영시간' },
  ] as const;

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">사업장 정보 관리</h1>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
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
          ) : (
            <div className="space-y-4">
              {data?.updatedAt && !isEditing && (
                <p className="text-xs text-gray-400">
                  최종 수정: {new Date(data.updatedAt).toLocaleString('ko-KR')}
                </p>
              )}
              <table className="w-full max-w-2xl">
                <tbody>
                  {fields.map(({ key, label }) => (
                    <tr key={key} className="border-b border-gray-100">
                      <td className="py-3 pr-4 text-xs font-medium text-gray-500 whitespace-nowrap w-24">
                        {label}
                      </td>
                      <td className="py-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={form[key]}
                            onChange={(e) => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                          />
                        ) : (
                          <span className="text-sm text-gray-900">
                            {form[key] || '-'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!isEditing && (
                <div className="mt-6 p-4 bg-gray-50 rounded border border-gray-200">
                  <p className="text-xs font-medium text-gray-600 mb-2">미리보기 (모바일 앱 표시)</p>
                  <div className="flex flex-col items-center gap-1 text-sm text-gray-700">
                    <span className="font-semibold">{form.name || '상호'}</span>
                    {form.representative && <span>대표 {form.representative}</span>}
                    {form.address && <span>{form.address}</span>}
                    {form.businessNumber && <span>사업자등록번호 {form.businessNumber}</span>}
                    {form.ecommerceNumber && <span>통신판매번호 {form.ecommerceNumber}</span>}
                    <span>전화 {form.phone || '-'}</span>
                    <span>팩스 {form.fax || '-'}</span>
                    {form.email && <span>이메일 {form.email}</span>}
                    {form.businessHours && <span>{form.businessHours}</span>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
