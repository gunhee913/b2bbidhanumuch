'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';

// 통계 카드 컴포넌트
interface StatCardProps {
  title: string;
  value: string;
}

function StatCard({ title, value }: StatCardProps) {
  return (
    <div className="text-center px-1">
      <p className="text-xs text-gray-500 font-medium whitespace-nowrap">{title}</p>
      <p className="text-lg font-bold text-gray-900 mt-1 whitespace-nowrap">{value}</p>
    </div>
  );
}

// 부위별 고정 데이터 (https://b2bbidhanumuch.vercel.app/auction/1 참고)
const PARTS_DATA = [
  { part: '등심(좌)', weight: '15.2', minPrice: 85000, bidPrice: 92000 },
  { part: '등심(우)', weight: '15.3', minPrice: 85000, bidPrice: 89000 },
  { part: '안심', weight: '4.5', minPrice: 95000, bidPrice: 125000 },
  { part: '채끝', weight: '8.2', minPrice: 82000, bidPrice: null },
  { part: '갈비(좌)', weight: '12.8', minPrice: 78000, bidPrice: 85000 },
  { part: '갈비(우)', weight: '12.0', minPrice: 78000, bidPrice: null },
  { part: '특수부위', weight: '3.2', minPrice: 72000, bidPrice: 78000 },
  { part: '설도(좌)', weight: '16.5', minPrice: 56000, bidPrice: 62000 },
  { part: '설도(우)', weight: '16.8', minPrice: 56000, bidPrice: null },
  { part: '앞다리', weight: '25.4', minPrice: 55000, bidPrice: 58000 },
  { part: '우둔', weight: '21.7', minPrice: 58000, bidPrice: 65000 },
  { part: '목심', weight: '14.0', minPrice: 62000, bidPrice: null },
  { part: '양지(좌)', weight: '12.2', minPrice: 52000, bidPrice: 56000 },
  { part: '양지(우)', weight: '12.4', minPrice: 52000, bidPrice: 55000 },
  { part: '사태', weight: '15.1', minPrice: 48000, bidPrice: null },
  { part: '꼬리', weight: '16.2', minPrice: 35000, bidPrice: 42000 },
  { part: '족', weight: '10.9', minPrice: 25000, bidPrice: 28000 },
  { part: '사골', weight: '3.1', minPrice: 20000, bidPrice: null },
  { part: '잡뼈', weight: '21.5', minPrice: 15000, bidPrice: 18000 },
];

// 부위별 데이터 생성 함수
const generateParts = (auctionId: string) => {
  return PARTS_DATA.map((item, index) => ({
    listingNo: `${auctionId}-${String(index + 1).padStart(2, '0')}`,
    part: item.part,
    weight: `${item.weight}kg`,
    minPrice: item.minPrice,
    bidPrice: item.bidPrice,
  }));
};

// 오늘의 경매 상장 테이블 컴포넌트
function TodayAuctionTable() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const auctions = [
    { id: '260119-001', breed: '한우', gender: '거세', grade: '1++A(9)', carcassWeight: '520', backFat: '15', eyeMuscle: '98', marbling: '9', meatColor: '5', fatColor: '3', texture: '1', maturity: '2', slaughterDate: '2026.01.16', traceNo: '002-1486-7293-1', company: '건화' },
    { id: '260119-002', breed: '한우', gender: '거세', grade: '1+A', carcassWeight: '498', backFat: '13', eyeMuscle: '92', marbling: '6', meatColor: '5', fatColor: '3', texture: '1', maturity: '2', slaughterDate: '2026.01.16', traceNo: '002-1523-8412-3', company: '건화' },
    { id: '260119-003', breed: '한우', gender: '암', grade: '1+B', carcassWeight: '465', backFat: '14', eyeMuscle: '88', marbling: '5', meatColor: '4', fatColor: '3', texture: '2', maturity: '2', slaughterDate: '2026.01.16', traceNo: '002-1498-6521-7', company: '건화' },
    { id: '260119-004', breed: '한우', gender: '거세', grade: '1++B(8)', carcassWeight: '512', backFat: '16', eyeMuscle: '95', marbling: '8', meatColor: '5', fatColor: '3', texture: '1', maturity: '2', slaughterDate: '2026.01.16', traceNo: '002-1512-9834-2', company: '대진엠에스' },
    { id: '260119-005', breed: '한우', gender: '거세', grade: '1+A', carcassWeight: '488', backFat: '12', eyeMuscle: '90', marbling: '6', meatColor: '5', fatColor: '3', texture: '1', maturity: '2', slaughterDate: '2026.01.16', traceNo: '002-1534-7126-5', company: '대진엠에스' },
    { id: '260119-006', breed: '한우', gender: '암', grade: '1++A(7)', carcassWeight: '478', backFat: '17', eyeMuscle: '94', marbling: '7', meatColor: '5', fatColor: '3', texture: '1', maturity: '2', slaughterDate: '2026.01.15', traceNo: '002-1478-3945-8', company: '대진엠에스' },
    { id: '260119-007', breed: '한우', gender: '암', grade: '1+B', carcassWeight: '455', backFat: '14', eyeMuscle: '86', marbling: '5', meatColor: '4', fatColor: '3', texture: '2', maturity: '2', slaughterDate: '2026.01.15', traceNo: '002-1501-6238-4', company: '대진엠에스' },
    { id: '260119-008', breed: '한우', gender: '거세', grade: '1+A', carcassWeight: '502', backFat: '13', eyeMuscle: '91', marbling: '6', meatColor: '5', fatColor: '3', texture: '1', maturity: '2', slaughterDate: '2026.01.16', traceNo: '002-1489-5127-6', company: '안심엘피씨' },
    { id: '260119-009', breed: '한우', gender: '거세', grade: '1A', carcassWeight: '495', backFat: '11', eyeMuscle: '85', marbling: '4', meatColor: '5', fatColor: '3', texture: '1', maturity: '2', slaughterDate: '2026.01.16', traceNo: '002-1527-8943-1', company: '안심엘피씨' },
    { id: '260119-010', breed: '한우', gender: '암', grade: '1+A', carcassWeight: '468', backFat: '15', eyeMuscle: '89', marbling: '6', meatColor: '5', fatColor: '3', texture: '1', maturity: '2', slaughterDate: '2026.01.15', traceNo: '002-1463-2715-9', company: '안심엘피씨' },
    { id: '260119-011', breed: '한우', gender: '암', grade: '1B', carcassWeight: '452', backFat: '13', eyeMuscle: '82', marbling: '4', meatColor: '4', fatColor: '3', texture: '2', maturity: '2', slaughterDate: '2026.01.15', traceNo: '002-1542-6389-3', company: '안심엘피씨' },
    { id: '260119-012', breed: '한우', gender: '거세', grade: '1++A(9)', carcassWeight: '528', backFat: '18', eyeMuscle: '99', marbling: '9', meatColor: '5', fatColor: '3', texture: '1', maturity: '2', slaughterDate: '2026.01.16', traceNo: '002-1456-9241-7', company: '정직한고기' },
    { id: '260119-013', breed: '한우', gender: '거세', grade: '2', carcassWeight: '485', backFat: '10', eyeMuscle: '78', marbling: '2', meatColor: '4', fatColor: '4', texture: '2', maturity: '3', slaughterDate: '2026.01.16', traceNo: '002-1518-4672-5', company: '정직한고기' },
    { id: '260119-014', breed: '한우', gender: '암', grade: '1+A', carcassWeight: '472', backFat: '14', eyeMuscle: '87', marbling: '6', meatColor: '5', fatColor: '3', texture: '1', maturity: '2', slaughterDate: '2026.01.15', traceNo: '002-1493-7856-2', company: '정직한고기' },
  ];

  const handleRowClick = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="bg-white shadow-sm border border-gray-100">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">오늘의 경매 상장 내역</h3>
        <Link 
          href="/admin/auctions"
          className="p-1 bg-gray-700 text-white hover:bg-gray-800 transition-colors"
          title="전체보기"
        >
          <Plus className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-8"></th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">접수번호</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">축종</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">성별</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">등급</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">도체중</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">등지방</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">등심면적</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">근내지방</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">육색</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">지방색</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">조직감</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">성숙도</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">도축일자</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">이력번호</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">상장업체</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">사진</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {auctions.map((auction) => (
              <React.Fragment key={auction.id}>
                <tr 
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleRowClick(auction.id)}
                >
                  <td className="px-4 py-4 text-center">
                    {expandedId === auction.id ? (
                      <ChevronUp className="w-4 h-4 text-gray-500 mx-auto" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500 mx-auto" />
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm font-medium text-gray-900 text-center">{auction.id}</td>
                  <td className="px-4 py-4 text-sm text-gray-900 text-center">{auction.breed}</td>
                  <td className="px-4 py-4 text-sm text-gray-900 text-center">{auction.gender}</td>
                  <td className="px-4 py-4 text-sm text-gray-900 text-center font-medium">{auction.grade}</td>
                  <td className="px-4 py-4 text-sm text-gray-600 text-center">{auction.carcassWeight}</td>
                  <td className="px-4 py-4 text-sm text-gray-600 text-center">{auction.backFat}</td>
                  <td className="px-4 py-4 text-sm text-gray-600 text-center">{auction.eyeMuscle}</td>
                  <td className="px-4 py-4 text-sm text-gray-600 text-center">{auction.marbling}</td>
                  <td className="px-4 py-4 text-sm text-gray-600 text-center">{auction.meatColor}</td>
                  <td className="px-4 py-4 text-sm text-gray-600 text-center">{auction.fatColor}</td>
                  <td className="px-4 py-4 text-sm text-gray-600 text-center">{auction.texture}</td>
                  <td className="px-4 py-4 text-sm text-gray-600 text-center">{auction.maturity}</td>
                  <td className="px-4 py-4 text-sm text-gray-600 text-center">{auction.slaughterDate}</td>
                  <td className="px-4 py-4 text-sm text-gray-500 text-center">{auction.traceNo}</td>
                  <td className="px-4 py-4 text-sm text-gray-900 text-center">{auction.company}</td>
                  <td className="px-4 py-4 text-center">
                    <button 
                      className="px-3 py-1 text-xs font-medium text-white bg-gray-600 hover:bg-gray-700 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      보기
                    </button>
                  </td>
                </tr>
                {expandedId === auction.id && (
                  <tr>
                    <td colSpan={17} className="p-0 border-t border-gray-200">
                      <div className="p-4">
                        <table className="w-full bg-white border border-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              {[1, 2, 3].map((col) => (
                                <React.Fragment key={col}>
                                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border-b border-gray-200">상장번호</th>
                                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border-b border-gray-200">부위</th>
                                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border-b border-gray-200">중량</th>
                                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border-b border-gray-200">최저가격</th>
                                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border-b border-gray-200">낙찰가격</th>
                                </React.Fragment>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {Array.from({ length: 7 }, (_, rowIdx) => {
                              const parts = generateParts(auction.id);
                              return (
                                <tr key={rowIdx} className="hover:bg-gray-50">
                                  {[0, 1, 2].map((colIdx) => {
                                    const partIdx = colIdx * 7 + rowIdx;
                                    const part = parts[partIdx];
                                    if (!part) {
                                      return (
                                        <React.Fragment key={colIdx}>
                                          <td className="px-2 py-2 text-center border-b border-gray-100">-</td>
                                          <td className="px-2 py-2 text-center border-b border-gray-100">-</td>
                                          <td className="px-2 py-2 text-center border-b border-gray-100">-</td>
                                          <td className="px-2 py-2 text-center border-b border-gray-100">-</td>
                                          <td className="px-2 py-2 text-center border-b border-gray-100">-</td>
                                        </React.Fragment>
                                      );
                                    }
                                    return (
                                      <React.Fragment key={colIdx}>
                                        <td className="px-2 py-2 text-xs text-gray-700 font-medium text-center border-b border-gray-100">{part.listingNo}</td>
                                        <td className="px-2 py-2 text-sm text-gray-900 font-medium text-center border-b border-gray-100">{part.part}</td>
                                        <td className="px-2 py-2 text-sm text-gray-600 text-center border-b border-gray-100">{part.weight}</td>
                                        <td className="px-2 py-2 text-sm text-gray-600 text-center border-b border-gray-100">{part.minPrice.toLocaleString()}</td>
                                        <td className={`px-2 py-2 text-sm font-medium text-center border-b border-gray-100 ${part.bidPrice ? 'text-gray-900' : 'text-gray-400'}`}>
                                          {part.bidPrice ? part.bidPrice.toLocaleString() : '유찰'}
                                        </td>
                                      </React.Fragment>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const yyyy = now.getFullYear();
      const MM = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      setLastUpdated(`${yyyy}.${MM}.${dd} ${hh}:${mm}`);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 600000); // 10분마다
    return () => clearInterval(interval);
  }, []);

  return (
    <AdminLayout>
      {/* 페이지 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
      </div>

      {/* 경매현황 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {[
          { title: '오늘', showUpdate: true, data: { heads: '14두', auctions: '266건', wins: '173건', amount: '124,350,000원' } },
          { title: '이번달', showUpdate: false, data: { heads: '312두', auctions: '5,928건', wins: '3,853건', amount: '2,853,420,000원' } },
          { title: '올해', showUpdate: false, data: { heads: '312두', auctions: '5,928건', wins: '3,853건', amount: '2,853,420,000원' } },
        ].map((section) => (
          <div key={section.title} className="bg-white shadow-sm border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-4">
              <h3 className="font-semibold text-gray-900">{section.title}</h3>
              {section.showUpdate && (
                <span className="text-xs text-gray-500">최종 업데이트 : {lastUpdated}</span>
              )}
            </div>
            <div className="px-6 py-6">
              <div className="grid grid-cols-3 divide-x divide-gray-100 mb-4">
                <StatCard title="경매 두수" value={section.data.heads} />
                <StatCard title="경매 건수" value={section.data.auctions} />
                <StatCard title="낙찰 건수" value={section.data.wins} />
              </div>
              <div className="pt-4 border-t border-gray-100">
                <StatCard title="총 낙찰대금" value={section.data.amount} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 오늘의 경매 상장 내역 */}
      <TodayAuctionTable />

      {/* 순위 섹션 */}
      <div className="grid grid-cols-3 gap-6 mt-8 mb-8">
        {/* 중도매인 경락순위 */}
        <div className="bg-white shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">중도매인 경락순위</h3>
              <p className="text-xs text-gray-500 mt-1">기간 : &apos;26.1.1. ~ 1.19.</p>
            </div>
            <button 
              className="p-1 bg-gray-700 text-white hover:bg-gray-800 transition-colors"
              title="전체보기"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-4">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-2 text-center text-xs font-semibold text-gray-600">순위</th>
                  <th className="py-2 text-center text-xs font-semibold text-gray-600">중매인번호</th>
                  <th className="py-2 text-center text-xs font-semibold text-gray-600">중도매인</th>
                  <th className="py-2 text-center text-xs font-semibold text-gray-600">경락건수</th>
                  <th className="py-2 text-center text-xs font-semibold text-gray-600">경락금액</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { rank: 1, no: '001', name: '김철수', count: 28, amount: 45200000 },
                  { rank: 2, no: '002', name: '이영희', count: 24, amount: 38500000 },
                  { rank: 3, no: '003', name: '박민수', count: 21, amount: 32100000 },
                  { rank: 4, no: '004', name: '최지현', count: 18, amount: 28700000 },
                  { rank: 5, no: '005', name: '정대호', count: 15, amount: 24300000 },
                ].map((item) => (
                  <tr key={item.rank} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 text-center text-sm font-medium text-gray-900">{item.rank}</td>
                    <td className="py-3 text-center text-sm text-gray-700">{item.no}</td>
                    <td className="py-3 text-center text-sm text-gray-700">{item.name}</td>
                    <td className="py-3 text-center text-sm text-gray-700">{item.count}건</td>
                    <td className="py-3 text-center text-sm text-gray-700">{item.amount.toLocaleString()}원</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 상장업체 상장순위 */}
        <div className="bg-white shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">상장업체 상장순위</h3>
              <p className="text-xs text-gray-500 mt-1">기간 : &apos;26.1.1. ~ 1.19.</p>
            </div>
            <button 
              className="p-1 bg-gray-700 text-white hover:bg-gray-800 transition-colors"
              title="전체보기"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-4">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-2 text-center text-xs font-semibold text-gray-600">순위</th>
                  <th className="py-2 text-center text-xs font-semibold text-gray-600">업체명</th>
                  <th className="py-2 text-center text-xs font-semibold text-gray-600">상장두수</th>
                  <th className="py-2 text-center text-xs font-semibold text-gray-600">경락금액</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { rank: 1, name: '건화', count: 5, amount: 52300000 },
                  { rank: 2, name: '대진엠에스', count: 4, amount: 41800000 },
                  { rank: 3, name: '안심엘피씨', count: 3, amount: 31500000 },
                  { rank: 4, name: '정직한고기', count: 2, amount: 22100000 },
                ].map((item) => (
                  <tr key={item.rank} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 text-center text-sm font-medium text-gray-900">{item.rank}</td>
                    <td className="py-3 text-center text-sm text-gray-700">{item.name}</td>
                    <td className="py-3 text-center text-sm text-gray-700">{item.count}두</td>
                    <td className="py-3 text-center text-sm text-gray-700">{item.amount.toLocaleString()}원</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 빈 공간 */}
        <div></div>
      </div>
    </AdminLayout>
  );
}
