'use client';

import React, { useState, useMemo, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { loadTransactions, Transaction } from '@/constants/transactions';

// 중도매인별 그룹 타입
interface DealerGroup {
  dealerNo: string;
  dealerName: string;
  transactions: Transaction[];
  totalDeposit: number;
  totalWithdraw: number;
  latestBalance: number;
}

export default function TransactionsPage() {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);
  const monthAgoStr = `${monthAgo.getFullYear()}-${String(monthAgo.getMonth() + 1).padStart(2, '0')}-${String(monthAgo.getDate()).padStart(2, '0')}`;

  // 공통 거래 내역 데이터 사용 (localStorage 연동)
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dealerSearch, setDealerSearch] = useState('');
  
  // 초기 데이터 로드 (localStorage에서, 페이지 포커스 시 새로고침)
  useEffect(() => {
    setTransactions(loadTransactions());
    
    const handleFocus = () => {
      setTransactions(loadTransactions());
    };
    window.addEventListener('focus', handleFocus);
    
    return () => window.removeEventListener('focus', handleFocus);
  }, []);
  const [typeFilter, setTypeFilter] = useState('all');
  const [startDate, setStartDate] = useState('2025-12-22');
  const [endDate, setEndDate] = useState('2026-01-21');

  // 필터링 (활성 거래만)
  const filteredTransactions = transactions.filter(tx => {
    if (tx.status !== 'active') return false; // 취소된 건 제외
    const txDate = tx.date.split(' ')[0];
    if (txDate < startDate || txDate > endDate) return false;
    if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
    if (dealerSearch) {
      const search = dealerSearch.toLowerCase();
      if (!tx.dealerName.toLowerCase().includes(search) && !tx.dealerNo.includes(dealerSearch)) {
        return false;
      }
    }
    return true;
  });

  // 중도매인별 그룹화
  const dealerGroups = useMemo(() => {
    const groupMap = new Map<string, DealerGroup>();
    
    filteredTransactions.forEach(tx => {
      if (!groupMap.has(tx.dealerNo)) {
        groupMap.set(tx.dealerNo, {
          dealerNo: tx.dealerNo,
          dealerName: tx.dealerName,
          transactions: [],
          totalDeposit: 0,
          totalWithdraw: 0,
          latestBalance: 0,
        });
      }
      
      const group = groupMap.get(tx.dealerNo)!;
      group.transactions.push(tx);
      
      if (tx.type === 'deposit') {
        group.totalDeposit += tx.amount;
      } else {
        group.totalWithdraw += tx.amount;
      }
    });

    // 각 그룹의 거래를 최신순 정렬하고 최신 잔액 설정
    groupMap.forEach(group => {
      group.transactions.sort((a, b) => b.date.localeCompare(a.date));
      if (group.transactions.length > 0) {
        group.latestBalance = group.transactions[0].balance;
      }
    });

    // 중도매인번호 순 정렬
    return Array.from(groupMap.values()).sort((a, b) => a.dealerNo.localeCompare(b.dealerNo));
  }, [filteredTransactions]);

  // 전체 합계
  const grandTotal = useMemo(() => {
    return dealerGroups.reduce((acc, group) => ({
      totalDeposit: acc.totalDeposit + group.totalDeposit,
      totalWithdraw: acc.totalWithdraw + group.totalWithdraw,
      transactionCount: acc.transactionCount + group.transactions.length,
    }), { totalDeposit: 0, totalWithdraw: 0, transactionCount: 0 });
  }, [dealerGroups]);

  // 엑셀 다운로드
  const handleExcelDownload = () => {
    const excelData = filteredTransactions.map(tx => ({
      '거래일시': tx.date,
      '중도매인번호': tx.dealerNo,
      '중도매인명': tx.dealerName,
      '입금': tx.type === 'deposit' ? tx.amount : '',
      '출금(차감)': tx.type === 'withdraw' ? tx.amount : '',
      '잔액': tx.balance,
      '비고': tx.description,
      '처리자': tx.createdBy,
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '거래 내역');
    
    const fileName = `중도매인_거래내역_${todayStr.replace(/-/g, '')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const thClass = "px-3 py-1.5 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50";
  const tdClass = "px-3 py-1.5 text-xs border border-gray-200 text-center whitespace-nowrap";

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">중도매인 거래 내역</h1>
      </div>

      {/* 필터 */}
      <div className="bg-white border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">기간</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
            />
            <span className="text-gray-400">~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">중도매인</span>
            <input
              type="text"
              value={dealerSearch}
              onChange={(e) => setDealerSearch(e.target.value)}
              placeholder="이름 또는 번호 검색"
              className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white w-40"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">구분</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white min-w-[80px]"
            >
              <option value="all">전체</option>
              <option value="deposit">입금</option>
              <option value="withdraw">출금</option>
            </select>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => {
                setStartDate(monthAgoStr);
                setEndDate(todayStr);
                setDealerSearch('');
                setTypeFilter('all');
              }}
              className="px-4 py-1.5 border border-gray-300 text-gray-600 text-xs hover:bg-gray-50"
            >
              초기화
            </button>
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

      {/* 테이블 */}
      <div className="bg-white border border-gray-200 overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={thClass}>중도매인번호</th>
              <th className={thClass}>중도매인명</th>
              <th className={thClass}>거래일시</th>
              <th className={thClass}>입금</th>
              <th className={thClass}>출금(차감)</th>
              <th className={thClass}>잔액</th>
              <th className={thClass}>비고</th>
              <th className={thClass}>처리자</th>
            </tr>
          </thead>
          <tbody>
            {dealerGroups.map((group) => (
              <React.Fragment key={group.dealerNo}>
                {/* 중도매인별 거래 내역 */}
                {group.transactions.map((tx, idx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    {/* 첫 번째 행에만 중도매인 정보 표시 (rowSpan) */}
                    {idx === 0 && (
                      <>
                        <td className={`${tdClass} align-middle`} rowSpan={group.transactions.length + 1}>
                          {group.dealerNo}
                        </td>
                        <td className={`${tdClass} font-medium align-middle`} rowSpan={group.transactions.length + 1}>
                          {group.dealerName}
                        </td>
                      </>
                    )}
                    <td className={tdClass}>{tx.date}</td>
                    <td className={`${tdClass} text-right text-blue-600`}>
                      {tx.type === 'deposit' ? `+${tx.amount.toLocaleString()}` : ''}
                    </td>
                    <td className={`${tdClass} text-right text-red-600`}>
                      {tx.type === 'withdraw' ? `-${tx.amount.toLocaleString()}` : ''}
                    </td>
                    <td className={`${tdClass} text-right font-medium ${tx.balance < 0 ? 'text-red-600' : ''}`}>
                      {tx.balance.toLocaleString()}
                    </td>
                    <td className={tdClass}>{tx.description}</td>
                    <td className={tdClass}>{tx.createdBy}</td>
                  </tr>
                ))}
                {/* 소계 */}
                <tr className="bg-gray-50 font-semibold">
                  <td className={tdClass}>소계 ({group.transactions.length}건)</td>
                  <td className={`${tdClass} text-right text-blue-600`}>
                    +{group.totalDeposit.toLocaleString()}
                  </td>
                  <td className={`${tdClass} text-right text-red-600`}>
                    -{group.totalWithdraw.toLocaleString()}
                  </td>
                  <td className={tdClass}></td>
                  <td className={tdClass} colSpan={2}></td>
                </tr>
              </React.Fragment>
            ))}
            
            {/* 전체 합계 */}
            {dealerGroups.length > 0 && (
              <tr className="border-t-2 border-gray-300 font-bold">
                <td className={tdClass} colSpan={3}>전체 합계 ({dealerGroups.length}명, {grandTotal.transactionCount}건)</td>
                <td className={`${tdClass} text-right text-blue-600`}>
                  +{grandTotal.totalDeposit.toLocaleString()}
                </td>
                <td className={`${tdClass} text-right text-red-600`}>
                  -{grandTotal.totalWithdraw.toLocaleString()}
                </td>
                <td className={tdClass} colSpan={3}></td>
              </tr>
            )}
            
            {dealerGroups.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">
                  조회된 내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
