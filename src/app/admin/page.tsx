'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  Gavel,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  RefreshCw
} from 'lucide-react';

// 통계 카드 컴포넌트
interface StatCardProps {
  title: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: React.ReactNode;
  iconBg: string;
}

function StatCard({ title, value, change, changeLabel, icon, iconBg }: StatCardProps) {
  const isPositive = change >= 0;
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
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
        </div>
        <div className={`p-3 rounded-xl ${iconBg}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// 최근 입찰 테이블 컴포넌트
function RecentBidsTable() {
  const recentBids = [
    { id: '260119-001-0001', bidder: '김하누(72)', part: '등심(좌)', amount: 152000, time: '2분 전', status: '최고가' },
    { id: '260119-001-0002', bidder: '박소고(45)', part: '등심(우)', amount: 148000, time: '5분 전', status: '차순위' },
    { id: '260119-002-0001', bidder: '이한우(33)', part: '안심', amount: 195000, time: '8분 전', status: '최고가' },
    { id: '260119-001-0003', bidder: '최육우(28)', part: '채끝', amount: 138000, time: '12분 전', status: '차순위' },
    { id: '260119-003-0001', bidder: '정도매(51)', part: '갈비(좌)', amount: 125000, time: '15분 전', status: '최고가' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">최근 입찰 내역</h3>
        <button className="text-sm text-red-600 hover:text-red-700 font-medium">
          전체보기
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">상장번호</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">입찰자</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">부위</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">입찰가</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">상태</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">시간</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {recentBids.map((bid) => (
              <tr key={bid.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-blue-600">{bid.id}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{bid.bidder}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{bid.part}</td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                  {bid.amount.toLocaleString()}원
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    bid.status === '최고가' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    {bid.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 text-right">{bid.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 오늘의 경매 현황 컴포넌트
function TodayAuctionStatus() {
  const auctions = [
    { company: '건화', total: 3, bidded: 2, rate: 67 },
    { company: '대진엠에스', total: 4, bidded: 3, rate: 75 },
    { company: '안심엘피씨', total: 4, bidded: 4, rate: 100 },
    { company: '정직한고기', total: 3, bidded: 2, rate: 67 },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">업체별 경매 현황</h3>
        <button className="p-1 text-gray-400 hover:text-gray-600">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      <div className="p-6 space-y-4">
        {auctions.map((auction) => (
          <div key={auction.company} className="flex items-center gap-4">
            <div className="w-24 text-sm font-medium text-gray-700">{auction.company}</div>
            <div className="flex-1">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 rounded-full transition-all duration-500"
                  style={{ width: `${auction.rate}%` }}
                />
              </div>
            </div>
            <div className="w-20 text-right">
              <span className="text-sm font-medium text-gray-900">{auction.bidded}/{auction.total}두</span>
              <span className="text-xs text-gray-500 ml-1">({auction.rate}%)</span>
            </div>
          </div>
        ))}
      </div>
      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">총 경매 두수</span>
          <span className="text-lg font-bold text-gray-900">14두</span>
        </div>
      </div>
    </div>
  );
}

// 등급별 분포 컴포넌트
function GradeDistribution() {
  const grades = [
    { grade: '1++', count: 5, color: 'bg-red-500' },
    { grade: '1+', count: 5, color: 'bg-orange-500' },
    { grade: '1', count: 3, color: 'bg-yellow-500' },
    { grade: '2', count: 1, color: 'bg-gray-400' },
  ];
  const total = grades.reduce((sum, g) => sum + g.count, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">등급별 분포</h3>
      </div>
      <div className="p-6">
        {/* 도넛 차트 시뮬레이션 */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative w-40 h-40">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {grades.reduce((acc, grade, index) => {
                const percentage = (grade.count / total) * 100;
                const prevPercentage = grades.slice(0, index).reduce((sum, g) => sum + (g.count / total) * 100, 0);
                const strokeDasharray = `${percentage * 2.51} ${251 - percentage * 2.51}`;
                const strokeDashoffset = -prevPercentage * 2.51;
                
                acc.push(
                  <circle
                    key={grade.grade}
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={grade.color.replace('bg-', '').includes('red') ? '#ef4444' : 
                           grade.color.includes('orange') ? '#f97316' : 
                           grade.color.includes('yellow') ? '#eab308' : '#9ca3af'}
                    strokeWidth="20"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                  />
                );
                return acc;
              }, [] as React.ReactElement[])}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{total}</p>
                <p className="text-xs text-gray-500">총 두수</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* 범례 */}
        <div className="grid grid-cols-2 gap-3">
          {grades.map((grade) => (
            <div key={grade.grade} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${grade.color}`}></div>
              <span className="text-sm text-gray-600">{grade.grade}등급</span>
              <span className="text-sm font-medium text-gray-900 ml-auto">{grade.count}두</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <AdminLayout>
      {/* 페이지 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="text-gray-500 mt-1">오늘의 경매 현황을 한눈에 확인하세요.</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="오늘 경매 두수"
          value="14두"
          change={16.7}
          changeLabel="전일 대비"
          icon={<Package className="w-6 h-6 text-blue-600" />}
          iconBg="bg-blue-100"
        />
        <StatCard
          title="총 입찰 건수"
          value="47건"
          change={23.5}
          changeLabel="전일 대비"
          icon={<Gavel className="w-6 h-6 text-green-600" />}
          iconBg="bg-green-100"
        />
        <StatCard
          title="참여 중도매인"
          value="12명"
          change={-8.3}
          changeLabel="전일 대비"
          icon={<Users className="w-6 h-6 text-purple-600" />}
          iconBg="bg-purple-100"
        />
        <StatCard
          title="예상 거래액"
          value="1.2억"
          change={12.1}
          changeLabel="전일 대비"
          icon={<DollarSign className="w-6 h-6 text-red-600" />}
          iconBg="bg-red-100"
        />
      </div>

      {/* 메인 콘텐츠 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 최근 입찰 내역 (2/3) */}
        <div className="lg:col-span-2">
          <RecentBidsTable />
        </div>

        {/* 오른쪽 사이드바 (1/3) */}
        <div className="space-y-6">
          <TodayAuctionStatus />
          <GradeDistribution />
        </div>
      </div>
    </AdminLayout>
  );
}
