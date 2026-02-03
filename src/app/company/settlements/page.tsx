'use client';

import CompanyLayout from '@/components/company/CompanyLayout';
import { Search, Download, Printer } from 'lucide-react';

export default function CompanySettlementsPage() {
  return (
    <CompanyLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">정산서</h1>
        <p className="text-sm text-gray-500 mt-1">내 업체의 정산 내역을 조회합니다</p>
      </div>

      {/* 검색 필터 */}
      <div className="bg-white border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <select className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white">
            <option value="">전체 기간</option>
            <option value="2026-02">2026년 2월</option>
            <option value="2026-01">2026년 1월</option>
          </select>
          <button className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white hover:bg-blue-700 text-xs font-medium">
            <Search className="w-3.5 h-3.5" />
            검색
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <button className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-gray-300 hover:bg-gray-50 text-xs font-medium text-gray-700 bg-white">
              <Printer className="w-3.5 h-3.5" />
              인쇄
            </button>
            <button className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-gray-300 hover:bg-gray-50 text-xs font-medium text-gray-700 bg-white">
              <Download className="w-3.5 h-3.5" />
              엑셀
            </button>
          </div>
        </div>
      </div>

      {/* 정산 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-white border border-gray-200 p-4">
          <p className="text-sm text-gray-500">총 낙찰금액</p>
          <p className="text-xl font-bold text-gray-900">0원</p>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <p className="text-sm text-gray-500">수수료</p>
          <p className="text-xl font-bold text-red-600">-0원</p>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <p className="text-sm text-gray-500">부가세</p>
          <p className="text-xl font-bold text-red-600">-0원</p>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <p className="text-sm text-gray-500">정산금액</p>
          <p className="text-xl font-bold text-blue-600">0원</p>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">정산기간</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">낙찰건수</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">총 낙찰금액</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">수수료</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">부가세</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">정산금액</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">상태</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500 border border-gray-200">
                  정산 내역이 없습니다.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </CompanyLayout>
  );
}
