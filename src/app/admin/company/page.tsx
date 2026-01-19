'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  Package,
  TrendingUp,
  DollarSign,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  MoreHorizontal,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

// 통계 카드 컴포넌트
interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  iconBg: string;
}

function StatCard({ title, value, change, changeLabel, icon, iconBg }: StatCardProps) {
  const isPositive = change && change >= 0;
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {isPositive ? (
                <ArrowUpRight className="w-4 h-4 text-green-500" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-red-500" />
              )}
              <span className={`text-sm font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                {isPositive ? '+' : ''}{change}%
              </span>
              <span className="text-sm text-gray-400">{changeLabel}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${iconBg}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// 오늘의 상장 현황 테이블
function TodayListingTable() {
  const listings = [
    { id: '260119-001', grade: '1++A(9)', type: '한우거세', weight: '520kg', status: 'bidding', bids: 5, highestBid: 152000, company: '건화' },
    { id: '260119-002', grade: '1+A', type: '한우거세', weight: '498kg', status: 'bidding', bids: 3, highestBid: 138000, company: '건화' },
    { id: '260119-003', grade: '1+B', type: '한우암', weight: '465kg', status: 'pending', bids: 0, highestBid: 0, company: '건화' },
    { id: '260119-004', grade: '1++B(8)', type: '한우거세', weight: '512kg', status: 'bidding', bids: 7, highestBid: 148000, company: '대진엠에스' },
    { id: '260119-005', grade: '1+A', type: '한우거세', weight: '488kg', status: 'completed', bids: 4, highestBid: 142000, company: '대진엠에스' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'bidding':
        return <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700"><Clock className="w-3 h-3" />입찰중</span>;
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700"><CheckCircle className="w-3 h-3" />낙찰</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600"><AlertCircle className="w-3 h-3" />대기</span>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">오늘의 상장 현황</h3>
        <div className="flex items-center gap-2">
          <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="text-sm text-red-600 hover:text-red-700 font-medium">
            전체보기
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">접수번호</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">업체</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">등급</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">품종</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">상태</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">입찰수</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">최고가</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {listings.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-blue-600">{item.id}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{item.company}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.grade}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{item.type}</td>
                <td className="px-6 py-4 text-center">{getStatusBadge(item.status)}</td>
                <td className="px-6 py-4 text-sm text-gray-900 text-center font-medium">{item.bids}건</td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                  {item.highestBid > 0 ? `${item.highestBid.toLocaleString()}원` : '-'}
                </td>
                <td className="px-6 py-4 text-center">
                  <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 업체별 상장 현황 컴포넌트
function CompanyListingStatus() {
  const companies = [
    { name: '건화', total: 3, bidding: 2, completed: 0, pending: 1 },
    { name: '대진엠에스', total: 4, bidding: 2, completed: 1, pending: 1 },
    { name: '안심엘피씨', total: 4, bidding: 3, completed: 1, pending: 0 },
    { name: '정직한고기', total: 3, bidding: 2, completed: 0, pending: 1 },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">업체별 상장 현황</h3>
      </div>
      <div className="p-6 space-y-4">
        {companies.map((company) => (
          <div key={company.name} className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-gray-900">{company.name}</span>
              <span className="text-sm text-gray-500">{company.total}두</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-blue-500"
                  style={{ width: `${(company.bidding / company.total) * 100}%` }}
                />
                <div 
                  className="h-full bg-green-500"
                  style={{ width: `${(company.completed / company.total) * 100}%` }}
                />
                <div 
                  className="h-full bg-gray-400"
                  style={{ width: `${(company.pending / company.total) * 100}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                입찰중 {company.bidding}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                낙찰 {company.completed}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                대기 {company.pending}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 실시간 입찰 현황 컴포넌트
function RealtimeBidStatus() {
  const bids = [
    { time: '12:05:32', bidder: '김하누(72)', listing: '260119-001', amount: 152000 },
    { time: '12:04:18', bidder: '박소고(45)', listing: '260119-004', amount: 148000 },
    { time: '12:02:45', bidder: '이한우(33)', listing: '260119-001', amount: 150000 },
    { time: '12:01:22', bidder: '최육우(28)', listing: '260119-002', amount: 138000 },
    { time: '11:58:10', bidder: '정도매(51)', listing: '260119-004', amount: 145000 },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">실시간 입찰</h3>
          <span className="flex items-center gap-1 text-xs text-green-600">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            LIVE
          </span>
        </div>
      </div>
      <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
        {bids.map((bid, index) => (
          <div key={index} className="px-6 py-3 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{bid.bidder}</p>
                <p className="text-xs text-gray-500">{bid.listing}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-red-600">{bid.amount.toLocaleString()}원</p>
                <p className="text-xs text-gray-400">{bid.time}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CompanyDashboardPage() {
  return (
    <AdminLayout>
      {/* 페이지 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">상장사 대시보드</h1>
        <p className="text-gray-500 mt-1">상장사별 경매 현황을 모니터링합니다.</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="오늘 상장 두수"
          value="14두"
          change={16.7}
          changeLabel="전일 대비"
          icon={<Package className="w-6 h-6 text-blue-600" />}
          iconBg="bg-blue-100"
        />
        <StatCard
          title="입찰 진행중"
          value="9두"
          icon={<Clock className="w-6 h-6 text-orange-600" />}
          iconBg="bg-orange-100"
        />
        <StatCard
          title="낙찰 완료"
          value="2두"
          icon={<CheckCircle className="w-6 h-6 text-green-600" />}
          iconBg="bg-green-100"
        />
        <StatCard
          title="예상 매출액"
          value="1.2억"
          change={12.1}
          changeLabel="전일 대비"
          icon={<DollarSign className="w-6 h-6 text-red-600" />}
          iconBg="bg-red-100"
        />
      </div>

      {/* 메인 콘텐츠 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 오늘의 상장 현황 (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          <TodayListingTable />
        </div>

        {/* 오른쪽 사이드바 (1/3) */}
        <div className="space-y-6">
          <RealtimeBidStatus />
          <CompanyListingStatus />
        </div>
      </div>
    </AdminLayout>
  );
}
