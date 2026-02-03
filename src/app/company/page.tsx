'use client';

import CompanyLayout from '@/components/company/CompanyLayout';
import { useSession } from 'next-auth/react';
import { Package, Clock, CheckCircle, TrendingUp } from 'lucide-react';

export default function CompanyDashboardPage() {
  const { data: session } = useSession();

  return (
    <CompanyLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="text-sm text-gray-500 mt-1">
          {session?.company?.name} - {session?.companyEmployee?.name}님 환영합니다
        </p>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">오늘 상장</p>
              <p className="text-2xl font-bold text-gray-900">0건</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">경매 진행중</p>
              <p className="text-2xl font-bold text-gray-900">0건</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">오늘 낙찰</p>
              <p className="text-2xl font-bold text-gray-900">0건</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">이번달 매출</p>
              <p className="text-2xl font-bold text-gray-900">0원</p>
            </div>
          </div>
        </div>
      </div>

      {/* 최근 활동 */}
      <div className="bg-white border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">최근 활동</h2>
        <div className="text-center py-8 text-gray-500">
          최근 활동 내역이 없습니다.
        </div>
      </div>
    </CompanyLayout>
  );
}
