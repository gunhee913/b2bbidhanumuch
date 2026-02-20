'use client';

import React, { useState, useMemo } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { generateDealerSettlements } from '@/constants/dealerSettlement';

// 부위 매핑 (좌/우 -> 통합)
const PART_MAPPING: Record<string, string> = {
  '등심(좌)': '등심', '등심(우)': '등심',
  '안심': '안심', '채끝': '채끝',
  '치마': '치마', '부채': '부채',
  '업진': '업진', '토시·제비': '토시·제비', '앞다리': '앞다리',
  '우둔': '우둔', '목심': '목심',
  '양지(좌)': '양지', '양지(우)': '양지',
  '설도(좌)': '설도', '설도(우)': '설도',
  '사태': '사태', '꼬리': '꼬리',
  '족': '족', '사골': '사골', '잡뼈': '잡뼈',
};

// 등급 매핑 (1++ 세분화)
const GRADE_MAPPING: Record<string, string> = {
  '1++A': '1++(9)', '1++B': '1++(8)', '1++C': '1++(7)',
  '1+A': '1+', '1+B': '1+', '1+C': '1+',
  '1A': '1', '1B': '1', '1C': '1',
  '2A': '2', '2B': '2', '2C': '2',
};

export default function AdminDashboardPage() {
  const [startDate, setStartDate] = useState('2026-01-16');
  const [endDate, setEndDate] = useState('2026-01-21');
  const [searchStartDate, setSearchStartDate] = useState('2026-01-16');
  const [searchEndDate, setSearchEndDate] = useState('2026-01-21');

  // 조회 버튼 클릭
  const handleSearch = () => {
    setSearchStartDate(startDate);
    setSearchEndDate(endDate);
  };

  // 낙찰 데이터 가져오기
  const settlements = useMemo(() => generateDealerSettlements(), []);

  // 전체 경매 데이터 계산
  const salesData = useMemo(() => {
    let totalAmount = 0;
    let totalWeight = 0;
    let totalCount = 0;
    const partSales: Record<string, { amount: number; weight: number; count: number }> = {};
    const gradeSales: Record<string, { amount: number; weight: number; count: number }> = {};
    const companySales: Record<string, { amount: number; weight: number; count: number }> = {};

    settlements.forEach(settlement => {
      settlement.bidParts.forEach(part => {
        totalAmount += part.amount;
        totalWeight += part.weight;
        totalCount += 1;

        // 부위별 집계
        const partName = PART_MAPPING[part.partName] || part.partName;
        if (!partSales[partName]) {
          partSales[partName] = { amount: 0, weight: 0, count: 0 };
        }
        partSales[partName].amount += part.amount;
        partSales[partName].weight += part.weight;
        partSales[partName].count += 1;

        // 등급별 집계
        const grade = GRADE_MAPPING[part.grade] || part.grade;
        if (!gradeSales[grade]) {
          gradeSales[grade] = { amount: 0, weight: 0, count: 0 };
        }
        gradeSales[grade].amount += part.amount;
        gradeSales[grade].weight += part.weight;
        gradeSales[grade].count += 1;

        // 상장업체별 집계
        const companyName = part.companyName;
        if (!companySales[companyName]) {
          companySales[companyName] = { amount: 0, weight: 0, count: 0 };
        }
        companySales[companyName].amount += part.amount;
        companySales[companyName].weight += part.weight;
        companySales[companyName].count += 1;
      });
    });

    return { totalAmount, totalWeight, totalCount, partSales, gradeSales, companySales };
  }, [settlements]);

  // 부위별 순위 (금액 기준)
  const partRanking = useMemo(() => {
    return Object.entries(salesData.partSales)
      .map(([name, data]) => ({
        name,
        ...data,
        ratio: (data.amount / salesData.totalAmount * 100).toFixed(1),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [salesData]);

  // 전체 경매 두수 (68두 고정)
  const totalCattleCount = 68;
  const totalAuctionCount = totalCattleCount * 20; // 1,360건

  // 등급별 순위 (금액 기준)
  const gradeRanking = useMemo(() => {
    const gradeOrder = ['1++(9)', '1++(8)', '1++(7)', '1+', '1', '2'];
    const entries = Object.entries(salesData.gradeSales);
    
    // 낙찰 건수 비율로 경매 두수 분배 (합계가 68두가 되도록)
    const gradeData = entries.map(([name, data]) => {
      const ratio = data.count / salesData.totalCount;
      const cattleCount = Math.round(totalCattleCount * ratio);
      const auctionCount = cattleCount * 19;
      const bidRate = auctionCount > 0 ? Math.round((data.count / auctionCount) * 100 * 10) / 10 : 0;
      return {
        name,
        ...data,
        cattleCount,
        auctionCount,
        bidRate,
        ratio: (data.amount / salesData.totalAmount * 100).toFixed(1),
      };
    }).sort((a, b) => gradeOrder.indexOf(a.name) - gradeOrder.indexOf(b.name));

    // 합계 보정 (반올림 오차 수정)
    const cattleSum = gradeData.reduce((sum, g) => sum + g.cattleCount, 0);
    if (cattleSum !== totalCattleCount && gradeData.length > 0) {
      // 가장 큰 등급에서 차이를 보정
      const maxIdx = gradeData.findIndex(g => g.name === '1' || g.name === '1+');
      if (maxIdx >= 0) {
        gradeData[maxIdx].cattleCount += (totalCattleCount - cattleSum);
        gradeData[maxIdx].auctionCount = gradeData[maxIdx].cattleCount * 19;
        gradeData[maxIdx].bidRate = gradeData[maxIdx].auctionCount > 0 
          ? Math.round((gradeData[maxIdx].count / gradeData[maxIdx].auctionCount) * 100 * 10) / 10 
          : 0;
      }
    }

    return gradeData;
  }, [salesData, totalCattleCount]);

  // 상장업체별 순위 (금액 기준)
  const companyRanking = useMemo(() => {
    // 업체별 경매 두수 고정 (합계 68두)
    const companyCattle: Record<string, number> = {
      '정직한고기': 20,
      '건화': 18,
      '안심엘피씨': 16,
      '대진엠에스': 14,
    };
    
    // 업체별 낙찰률 (85~95% 사이)
    const companyBidRate: Record<string, number> = {
      '정직한고기': 0.92,
      '건화': 0.89,
      '안심엘피씨': 0.91,
      '대진엠에스': 0.87,
    };
    
    const entries = Object.entries(salesData.companySales);
    const totalOriginalAmount = entries.reduce((sum, [, d]) => sum + d.amount, 0);
    
    return entries.map(([name, data]) => {
      const cattleCount = companyCattle[name] || 17;
      const auctionCount = cattleCount * 19;
      const bidRate = companyBidRate[name] || 0.90;
      const bidCount = Math.round(auctionCount * bidRate); // 낙찰 건수 = 경매 건수 * 낙찰률
      
      // 낙찰대금 = 경매 두수 비율에 따라 분배
      const cattleRatio = cattleCount / totalCattleCount;
      const amount = Math.round(salesData.totalAmount * cattleRatio);
      
      return {
        name,
        weight: data.weight,
        cattleCount,
        auctionCount,
        count: bidCount,
        amount,
        bidRate: Math.round(bidRate * 100 * 10) / 10,
        ratio: (cattleRatio * 100).toFixed(1),
      };
    }).sort((a, b) => b.amount - a.amount);
  }, [salesData, totalCattleCount]);

  // 일별 경매 데이터 (주말 제외 - 4일: 21수, 20화, 19월, 16금 - 최신순)
  const dailySales = useMemo(() => {
    const days = ['01-21', '01-20', '01-19', '01-16'];
    // 하루 15~20두 기준, 각 날짜별 두수 배분 (최신순)
    const dailyCattle = [17, 18, 17, 16]; // 총 68두
    const totalCattle = dailyCattle.reduce((a, b) => a + b, 0);
    
    return days.map((day, idx) => {
      const cattleCount = dailyCattle[idx]; // 경매 두수
      const auctionCount = cattleCount * 19; // 경매 건수 (1두당 19건)
      // 낙찰 건수와 금액은 전체 데이터에서 비율로 배분
      const ratio = cattleCount / totalCattle;
      const bidCount = Math.round(salesData.totalCount * ratio);
      const amount = Math.round(salesData.totalAmount * ratio);
      return {
        date: `2026-${day}`,
        cattleCount,
        auctionCount,
        bidCount,
        amount,
      };
    });
  }, [salesData]);

  // 엑셀 다운로드
  const handleExcelDownload = () => {
    const wb = XLSX.utils.book_new();

    // 일별 경락
    const dailySheet = XLSX.utils.json_to_sheet(dailySales.map(d => ({
      '일자': d.date,
      '경매 두수': d.cattleCount,
      '경매 건수': d.auctionCount,
      '낙찰 건수': d.bidCount,
      '낙찰대금(원)': d.amount,
      '상장수수료(원)': Math.round(d.amount * 0.02),
    })));
    XLSX.utils.book_append_sheet(wb, dailySheet, '일별경매');

    // 부위별 경매현황
    const partSheet = XLSX.utils.json_to_sheet(partRanking.map(p => ({
      '부위': p.name,
      '낙찰대금(원)': p.amount,
      '중량(kg)': Math.round(p.weight * 10) / 10,
      '건수': p.count,
      '비중(%)': p.ratio,
    })));
    XLSX.utils.book_append_sheet(wb, partSheet, '부위별경매');

    // 등급별 경매현황
    const gradeSheet = XLSX.utils.json_to_sheet(gradeRanking.map(g => ({
      '등급': g.name,
      '낙찰대금(원)': g.amount,
      '중량(kg)': Math.round(g.weight * 10) / 10,
      '건수': g.count,
      '비중(%)': g.ratio,
    })));
    XLSX.utils.book_append_sheet(wb, gradeSheet, '등급별경매');

    XLSX.writeFile(wb, `플랫폼운영현황_${searchStartDate}_${searchEndDate}.xlsx`);
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
      </div>

      {/* 필터 섹션 */}
      <div className="bg-white border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* 기간 선택 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">기간</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-36 px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
            />
            <span className="text-gray-400">~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-36 px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
            />
            <button
              type="button"
              onClick={handleSearch}
              className="px-4 py-1.5 bg-gray-900 text-white text-xs hover:bg-gray-800"
            >
              조회
            </button>
          </div>

          {/* 엑셀 다운로드 */}
          <div className="ml-auto">
            <button
              type="button"
              onClick={handleExcelDownload}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-700 text-white text-xs hover:bg-gray-800"
            >
              <Download className="w-3.5 h-3.5" />
              엑셀
            </button>
          </div>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-white border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-1">경매 두수</div>
          <div className="text-2xl font-bold text-gray-900">
            {totalCattleCount}두
          </div>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-1">경매 건수</div>
          <div className="text-2xl font-bold text-gray-900">
            {totalAuctionCount.toLocaleString()}건
          </div>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-1">낙찰 건수</div>
          <div className="text-2xl font-bold text-gray-900">
            {salesData.totalCount.toLocaleString()}건
          </div>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-1">낙찰대금</div>
          <div className="text-2xl font-bold text-gray-900">
            {salesData.totalAmount.toLocaleString()}원
          </div>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-1">상장수수료</div>
          <div className="text-2xl font-bold text-gray-900">
            {Math.round(salesData.totalAmount * 0.02).toLocaleString()}원
          </div>
        </div>
      </div>

      {/* 일별 경매 추이 */}
      <div className="bg-white border border-gray-200 p-4 mb-6">
        <h2 className="text-sm font-bold text-gray-800 mb-4">일별 경매 추이</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">일자</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">경매 두수</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">경매 건수</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">낙찰 건수</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">낙찰대금</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">상장수수료</th>
              </tr>
            </thead>
            <tbody>
              {dailySales.map((day) => (
                <tr key={day.date} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-xs text-center border border-gray-200">{day.date}</td>
                  <td className="px-4 py-2 text-xs text-center border border-gray-200">{day.cattleCount}두</td>
                  <td className="px-4 py-2 text-xs text-center border border-gray-200">{day.auctionCount}건</td>
                  <td className="px-4 py-2 text-xs text-center border border-gray-200">{day.bidCount}건</td>
                  <td className="px-4 py-2 text-xs text-center border border-gray-200 font-medium">
                    {day.amount.toLocaleString()}원
                  </td>
                  <td className="px-4 py-2 text-xs text-center border border-gray-200">
                    {Math.round(day.amount * 0.02).toLocaleString()}원
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-bold">
                <td className="px-4 py-2 text-xs text-center border border-gray-200">합계</td>
                <td className="px-4 py-2 text-xs text-center border border-gray-200">
                  {totalCattleCount}두
                </td>
                <td className="px-4 py-2 text-xs text-center border border-gray-200">
                  {totalAuctionCount.toLocaleString()}건
                </td>
                <td className="px-4 py-2 text-xs text-center border border-gray-200">
                  {salesData.totalCount.toLocaleString()}건
                </td>
                <td className="px-4 py-2 text-xs text-center border border-gray-200">
                  {salesData.totalAmount.toLocaleString()}원
                </td>
                <td className="px-4 py-2 text-xs text-center border border-gray-200">
                  {Math.round(salesData.totalAmount * 0.02).toLocaleString()}원
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* 부위별 경매현황 */}
        <div className="bg-white border border-gray-200 p-4">
          <h2 className="text-sm font-bold text-gray-800 mb-4">부위별 경매현황</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">순위</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">부위</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">낙찰 건수</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">낙찰대금</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">비중</th>
                </tr>
              </thead>
              <tbody>
                {partRanking.map((part, idx) => (
                  <tr key={part.name} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs text-center border border-gray-200">{idx + 1}</td>
                    <td className="px-3 py-2 text-xs text-center border border-gray-200 font-medium">{part.name}</td>
                    <td className="px-3 py-2 text-xs text-center border border-gray-200">{part.count}건</td>
                    <td className="px-3 py-2 text-xs text-center border border-gray-200">
                      {part.amount.toLocaleString()}원
                    </td>
                    <td className="px-3 py-2 text-xs text-center border border-gray-200">{part.ratio}%</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-bold">
                  <td colSpan={2} className="px-3 py-2 text-xs text-center border border-gray-200">합계</td>
                  <td className="px-3 py-2 text-xs text-center border border-gray-200">
                    {partRanking.reduce((sum, p) => sum + p.count, 0)}건
                  </td>
                  <td className="px-3 py-2 text-xs text-center border border-gray-200">
                    {partRanking.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}원
                  </td>
                  <td className="px-3 py-2 text-xs text-center border border-gray-200">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 오른쪽: 등급별 + 상장업체별 */}
        <div className="flex flex-col gap-6">
          {/* 등급별 경매현황 */}
          <div className="bg-white border border-gray-200 p-4">
            <h2 className="text-sm font-bold text-gray-800 mb-4">등급별 경매현황</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">등급</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">경매 두수</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">경매 건수</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">낙찰 건수</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">낙찰대금</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">낙찰률</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">비중</th>
                  </tr>
                </thead>
                <tbody>
                  {gradeRanking.map((grade) => (
                    <tr key={grade.name} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs text-center border border-gray-200 font-medium">{grade.name}</td>
                      <td className="px-3 py-2 text-xs text-center border border-gray-200">{grade.cattleCount}두</td>
                      <td className="px-3 py-2 text-xs text-center border border-gray-200">{grade.auctionCount}건</td>
                      <td className="px-3 py-2 text-xs text-center border border-gray-200">{grade.count}건</td>
                      <td className="px-3 py-2 text-xs text-center border border-gray-200">
                        {grade.amount.toLocaleString()}원
                      </td>
                      <td className="px-3 py-2 text-xs text-center border border-gray-200">{grade.bidRate}%</td>
                      <td className="px-3 py-2 text-xs text-center border border-gray-200">{grade.ratio}%</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-bold">
                    <td className="px-3 py-2 text-xs text-center border border-gray-200">합계</td>
                    <td className="px-3 py-2 text-xs text-center border border-gray-200">
                      {totalCattleCount}두
                    </td>
                    <td className="px-3 py-2 text-xs text-center border border-gray-200">
                      {totalAuctionCount.toLocaleString()}건
                    </td>
                    <td className="px-3 py-2 text-xs text-center border border-gray-200">
                      {salesData.totalCount.toLocaleString()}건
                    </td>
                    <td className="px-3 py-2 text-xs text-center border border-gray-200">
                      {salesData.totalAmount.toLocaleString()}원
                    </td>
                    <td className="px-3 py-2 text-xs text-center border border-gray-200">
                      {Math.round((salesData.totalCount / totalAuctionCount) * 100 * 10) / 10}%
                    </td>
                    <td className="px-3 py-2 text-xs text-center border border-gray-200">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 상장업체별 경매현황 */}
          <div className="bg-white border border-gray-200 p-4">
        <h2 className="text-sm font-bold text-gray-800 mb-4">상장업체별 경매현황</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">순위</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">상장업체</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">경매 두수</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">경매 건수</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">낙찰 건수</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">낙찰대금</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">낙찰률</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">비중</th>
              </tr>
            </thead>
            <tbody>
              {companyRanking.map((company, idx) => (
                <tr key={company.name} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs text-center border border-gray-200">{idx + 1}</td>
                  <td className="px-3 py-2 text-xs text-center border border-gray-200 font-medium">{company.name}</td>
                  <td className="px-3 py-2 text-xs text-center border border-gray-200">{company.cattleCount}두</td>
                  <td className="px-3 py-2 text-xs text-center border border-gray-200">{company.auctionCount}건</td>
                  <td className="px-3 py-2 text-xs text-center border border-gray-200">{company.count}건</td>
                  <td className="px-3 py-2 text-xs text-center border border-gray-200">
                    {company.amount.toLocaleString()}원
                  </td>
                  <td className="px-3 py-2 text-xs text-center border border-gray-200">{company.bidRate}%</td>
                  <td className="px-3 py-2 text-xs text-center border border-gray-200">{company.ratio}%</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-bold">
                <td colSpan={2} className="px-3 py-2 text-xs text-center border border-gray-200">합계</td>
                <td className="px-3 py-2 text-xs text-center border border-gray-200">
                  {totalCattleCount}두
                </td>
                <td className="px-3 py-2 text-xs text-center border border-gray-200">
                  {totalAuctionCount.toLocaleString()}건
                </td>
                <td className="px-3 py-2 text-xs text-center border border-gray-200">
                  {companyRanking.reduce((sum, c) => sum + c.count, 0).toLocaleString()}건
                </td>
                <td className="px-3 py-2 text-xs text-center border border-gray-200">
                  {companyRanking.reduce((sum, c) => sum + c.amount, 0).toLocaleString()}원
                </td>
                <td className="px-3 py-2 text-xs text-center border border-gray-200">
                  {(() => {
                    const totalBid = companyRanking.reduce((sum, c) => sum + c.count, 0);
                    return Math.round((totalBid / totalAuctionCount) * 100 * 10) / 10;
                  })()}%
                </td>
                <td className="px-3 py-2 text-xs text-center border border-gray-200">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
        </div>
      </div>
    </AdminLayout>
  );
}
