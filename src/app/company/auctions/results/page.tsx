'use client';

import CompanyLayout from '@/components/company/CompanyLayout';
import { Search, Download } from 'lucide-react';

export default function CompanyAuctionResultsPage() {
  return (
    <CompanyLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">낙찰조회</h1>
        <p className="text-sm text-gray-500 mt-1">내 업체의 낙찰 내역을 조회합니다</p>
      </div>

      {/* 검색 필터 */}
      <div className="bg-white border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="date"
            className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
          />
          <span className="text-gray-400">~</span>
          <input
            type="date"
            className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
          />
          <button className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white hover:bg-blue-700 text-xs font-medium">
            <Search className="w-3.5 h-3.5" />
            검색
          </button>
          <button className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-gray-300 hover:bg-gray-50 text-xs font-medium text-gray-700 bg-white ml-auto">
            <Download className="w-3.5 h-3.5" />
            엑셀
          </button>
        </div>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white border border-gray-200 p-4">
          <p className="text-sm text-gray-500">총 낙찰건수</p>
          <p className="text-2xl font-bold text-gray-900">0건</p>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <p className="text-sm text-gray-500">총 낙찰금액</p>
          <p className="text-2xl font-bold text-gray-900">0원</p>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <p className="text-sm text-gray-500">낙찰률</p>
          <p className="text-2xl font-bold text-gray-900">0%</p>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">낙찰일</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">품목</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">품종</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">부위</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">등급</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">중량(kg)</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">낙찰가(원/kg)</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">낙찰총액</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500 border border-gray-200">
                  낙찰 내역이 없습니다.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </CompanyLayout>
  );
}
