'use client';

import CompanyLayout from '@/components/company/CompanyLayout';
import { RefreshCw } from 'lucide-react';

export default function CompanyAuctionLivePage() {
  return (
    <CompanyLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">경매현황(실시간)</h1>
          <p className="text-sm text-gray-500 mt-1">내 업체의 경매 진행 현황을 실시간으로 확인합니다</p>
        </div>
        <button className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-gray-300 hover:bg-gray-50 text-xs font-medium text-gray-700 bg-white">
          <RefreshCw className="w-3.5 h-3.5" />
          새로고침
        </button>
      </div>

      {/* 테이블 */}
      <div className="bg-white border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">품목</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">품종</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">부위</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">등급</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">중량(kg)</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">최소가</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">현재가</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">입찰수</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">남은시간</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-500 border border-gray-200">
                  진행중인 경매가 없습니다.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </CompanyLayout>
  );
}
