'use client';

import React, { useState, useMemo } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';

interface Transaction {
  id: string;
  dealerId: string;
  dealerNo: string;
  dealerName: string;
  type: 'deposit' | 'withdraw' | 'auction_deduct';
  amount: number;
  balance: number;
  description: string;
  status: 'active' | 'cancelled';
  createdBy: string;
  createdAt: string;
  source?: 'manual' | 'auction';
}

interface DealerGroup {
  dealerNo: string;
  dealerName: string;
  transactions: Transaction[];
  totalDeposit: number;
  totalWithdraw: number;
  totalAuctionDeduct: number;
}

export default function TransactionsPage() {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const monthAgoStr = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  const [dealerSearch, setDealerSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [startDate, setStartDate] = useState(monthAgoStr);
  const [endDate, setEndDate] = useState(todayStr);

  const [sStartDate, setSStartDate] = useState(monthAgoStr);
  const [sEndDate, setSEndDate] = useState(todayStr);
  const [sTypeFilter, setSTypeFilter] = useState('all');
  const [sDealerSearch, setSDealerSearch] = useState('');

  const handleSearch = () => {
    setSStartDate(startDate);
    setSEndDate(endDate);
    setSTypeFilter(typeFilter);
    setSDealerSearch(dealerSearch);
  };

  const { data, isLoading } = useQuery<{ transactions: Transaction[] }>({
    queryKey: ['dealer-transactions-list', sStartDate, sEndDate, sTypeFilter, sDealerSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sStartDate) params.append('startDate', sStartDate);
      if (sEndDate) params.append('endDate', sEndDate);
      if (sTypeFilter && sTypeFilter !== 'all') params.append('type', sTypeFilter);
      const res = await fetch(`/api/dealer-transactions?${params}`);
      if (!res.ok) throw new Error();
      return res.json();
    },
  });

  const allTransactions = data?.transactions || [];

  const filteredTransactions = useMemo(() => {
    if (!sDealerSearch) return allTransactions;
    const search = sDealerSearch.toLowerCase();
    return allTransactions.filter(tx =>
      tx.dealerName.toLowerCase().includes(search) || tx.dealerNo.includes(sDealerSearch)
    );
  }, [allTransactions, sDealerSearch]);

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
          totalAuctionDeduct: 0,
        });
      }

      const group = groupMap.get(tx.dealerNo)!;
      group.transactions.push(tx);

      if (tx.type === 'deposit') {
        group.totalDeposit += tx.amount;
      } else if (tx.type === 'withdraw') {
        group.totalWithdraw += tx.amount;
      } else if (tx.type === 'auction_deduct') {
        group.totalAuctionDeduct += tx.amount;
      }
    });

    groupMap.forEach(group => {
      const sorted = [...group.transactions].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      let runningBalance = 0;
      const withBalance = sorted.map(tx => {
        if (tx.type === 'deposit') {
          runningBalance += tx.amount;
        } else {
          runningBalance -= tx.amount;
        }
        return { ...tx, balance: runningBalance };
      });
      group.transactions = withBalance.reverse();
    });

    return Array.from(groupMap.values()).sort((a, b) => a.dealerNo.localeCompare(b.dealerNo));
  }, [filteredTransactions]);

  const grandTotal = useMemo(() => {
    return dealerGroups.reduce((acc, group) => ({
      totalDeposit: acc.totalDeposit + group.totalDeposit,
      totalWithdraw: acc.totalWithdraw + group.totalWithdraw,
      totalAuctionDeduct: acc.totalAuctionDeduct + group.totalAuctionDeduct,
      transactionCount: acc.transactionCount + group.transactions.length,
    }), { totalDeposit: 0, totalWithdraw: 0, totalAuctionDeduct: 0, transactionCount: 0 });
  }, [dealerGroups]);

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return format(new Date(dateStr), 'yyyy-MM-dd HH:mm');
    } catch {
      return dateStr;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'deposit': return '입금';
      case 'withdraw': return '출금';
      case 'auction_deduct': return '차감';
      default: return type;
    }
  };

  const handleExcelDownload = () => {
    const allTxsWithBalance = dealerGroups.flatMap(g =>
      [...g.transactions].reverse()
    );
    const excelData = allTxsWithBalance.map(tx => ({
      '거래일시': formatDateTime(tx.createdAt),
      '중도매인번호': tx.dealerNo,
      '중도매인명': tx.dealerName,
      '구분': getTypeLabel(tx.type),
      '입금': tx.type === 'deposit' ? tx.amount : '',
      '출금': tx.type === 'withdraw' ? tx.amount : '',
      '경락대금': tx.type === 'auction_deduct' ? tx.amount : '',
      '잔액': tx.balance,
      '비고': tx.description,
      '처리자': tx.createdBy,
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '거래 내역');
    XLSX.writeFile(workbook, `중도매인_거래내역_${todayStr.replace(/-/g, '')}.xlsx`);
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
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white" />
            <span className="text-gray-400">~</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">중도매인</span>
            <input type="text" value={dealerSearch} onChange={(e) => setDealerSearch(e.target.value)}
              placeholder="이름 또는 번호 검색"
              className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white w-40" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">구분</span>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white min-w-[80px]">
              <option value="all">전체</option>
              <option value="deposit">입금</option>
              <option value="withdraw">출금</option>
              <option value="auction_deduct">차감</option>
            </select>
          </div>
          <button type="button" onClick={handleSearch}
            className="px-4 py-1.5 bg-gray-900 text-white text-xs hover:bg-gray-800">
            조회
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <button type="button" onClick={() => { setStartDate(monthAgoStr); setEndDate(todayStr); setDealerSearch(''); setTypeFilter('all'); setSStartDate(monthAgoStr); setSEndDate(todayStr); setSDealerSearch(''); setSTypeFilter('all'); }}
              className="px-4 py-1.5 border border-gray-300 text-gray-600 text-xs hover:bg-gray-50">
              초기화
            </button>
            <button type="button" onClick={handleExcelDownload}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-700 text-white text-xs hover:bg-gray-800">
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
              <th className={thClass}>구분</th>
              <th className={thClass}>입금</th>
              <th className={thClass}>출금(차감)</th>
              <th className={thClass}>잔액</th>
              <th className={thClass}>비고</th>
              <th className={thClass}>처리자</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  데이터를 불러오는 중...
                </td>
              </tr>
            ) : dealerGroups.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400 text-sm">
                  조회된 내역이 없습니다.
                </td>
              </tr>
            ) : (
              <>
                {dealerGroups.map((group) => (
                  <React.Fragment key={group.dealerNo}>
                    {group.transactions.map((tx, idx) => (
                      <tr key={tx.id} className="hover:bg-gray-50">
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
                        <td className={tdClass}>{formatDateTime(tx.createdAt)}</td>
                        <td className={tdClass}>
                          <span className={
                            tx.type === 'deposit' ? 'text-blue-600 font-medium' :
                            tx.type === 'auction_deduct' ? 'text-red-600 font-medium' :
                            'text-red-600 font-medium'
                          }>
                            {getTypeLabel(tx.type)}
                          </span>
                        </td>
                        <td className={`${tdClass} text-right text-blue-600`}>
                          {tx.type === 'deposit' ? `+${tx.amount.toLocaleString()}` : ''}
                        </td>
                        <td className={`${tdClass} text-right text-red-600`}>
                          {(tx.type === 'withdraw' || tx.type === 'auction_deduct') ? `-${tx.amount.toLocaleString()}` : ''}
                        </td>
                        <td className={`${tdClass} text-right font-medium ${tx.balance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                          {tx.balance.toLocaleString()}
                        </td>
                        <td className={`${tdClass} text-left`}>{tx.description}</td>
                        <td className={tdClass}>{tx.createdBy}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-semibold">
                      <td className={tdClass}>소계 ({group.transactions.length}건)</td>
                      <td className={tdClass}></td>
                      <td className={`${tdClass} text-right text-blue-600`}>
                        +{group.totalDeposit.toLocaleString()}
                      </td>
                      <td className={`${tdClass} text-right text-red-600`}>
                        -{(group.totalWithdraw + group.totalAuctionDeduct).toLocaleString()}
                      </td>
                      <td className={`${tdClass} text-right font-medium ${group.transactions[0]?.balance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        {group.transactions[0]?.balance.toLocaleString() || '-'}
                      </td>
                      <td className={tdClass} colSpan={2}></td>
                    </tr>
                  </React.Fragment>
                ))}
                <tr className="border-t-2 border-gray-300 font-bold">
                  <td className={tdClass} colSpan={4}>전체 합계 ({dealerGroups.length}명, {grandTotal.transactionCount}건)</td>
                  <td className={`${tdClass} text-right text-blue-600`}>
                    +{grandTotal.totalDeposit.toLocaleString()}
                  </td>
                  <td className={`${tdClass} text-right text-red-600`}>
                    -{(grandTotal.totalWithdraw + grandTotal.totalAuctionDeduct).toLocaleString()}
                  </td>
                  <td className={tdClass}></td>
                  <td className={tdClass} colSpan={2}></td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
