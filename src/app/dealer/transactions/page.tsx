'use client';

import React, { useState, useMemo } from 'react';
import DealerLayout from '@/components/dealer/DealerLayout';
import { Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
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

export default function DealerTransactionsPage() {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const monthAgoStr = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  const { data: session } = useSession();
  const dealerId = session?.dealer?.id || '';
  const dealerName = session?.dealer?.name || session?.employee?.name || '중도매인';

  const [typeFilter, setTypeFilter] = useState('all');
  const [startDate, setStartDate] = useState(monthAgoStr);
  const [endDate, setEndDate] = useState(todayStr);

  const [sStartDate, setSStartDate] = useState(monthAgoStr);
  const [sEndDate, setSEndDate] = useState(todayStr);
  const [sTypeFilter, setSTypeFilter] = useState('all');

  const handleSearch = () => {
    setSStartDate(startDate);
    setSEndDate(endDate);
    setSTypeFilter(typeFilter);
  };

  const { data, isLoading } = useQuery<{ transactions: Transaction[] }>({
    queryKey: ['dealer-my-transactions', dealerId, sStartDate, sEndDate, sTypeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sStartDate) params.append('startDate', sStartDate);
      if (sEndDate) params.append('endDate', sEndDate);
      if (sTypeFilter && sTypeFilter !== 'all') params.append('type', sTypeFilter);
      const res = await fetch(`/api/dealer-transactions?${params}`);
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: !!dealerId,
  });

  const myTransactions = useMemo(() => {
    const all = data?.transactions || [];
    return all
      .filter(tx => tx.dealerId === dealerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [data, dealerId]);

  const totals = useMemo(() => {
    let totalDeposit = 0;
    let totalWithdraw = 0;
    let totalAuctionDeduct = 0;

    myTransactions.forEach(tx => {
      if (tx.type === 'deposit') totalDeposit += tx.amount;
      else if (tx.type === 'withdraw') totalWithdraw += tx.amount;
      else if (tx.type === 'auction_deduct') totalAuctionDeduct += tx.amount;
    });

    return { totalDeposit, totalWithdraw, totalAuctionDeduct };
  }, [myTransactions]);

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
    const excelData = myTransactions.map(tx => ({
      '거래일시': formatDateTime(tx.createdAt),
      '구분': getTypeLabel(tx.type),
      '입금': tx.type === 'deposit' ? tx.amount : '',
      '출금(차감)': (tx.type === 'withdraw' || tx.type === 'auction_deduct') ? tx.amount : '',
      '비고': tx.description,
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '거래 내역');
    XLSX.writeFile(workbook, `${dealerName}_거래내역_${todayStr.replace(/-/g, '')}.xlsx`);
  };

  const thClass = "px-3 py-1.5 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50";
  const tdClass = "px-3 py-1.5 text-xs border border-gray-200 text-center whitespace-nowrap";

  return (
    <DealerLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">거래 내역</h1>
        <p className="text-sm text-gray-500 mt-1">{dealerName}</p>
      </div>

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
            <button type="button"
              onClick={() => {
                setStartDate(monthAgoStr); setEndDate(todayStr); setTypeFilter('all');
                setSStartDate(monthAgoStr); setSEndDate(todayStr); setSTypeFilter('all');
              }}
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

      <div className="bg-white border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">총 거래</span>
            <span className="text-sm font-semibold text-gray-900">{myTransactions.length}건</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">입금 합계</span>
            <span className="text-sm font-semibold text-blue-600">+{totals.totalDeposit.toLocaleString()}원</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">출금(차감) 합계</span>
            <span className="text-sm font-semibold text-red-600">-{(totals.totalWithdraw + totals.totalAuctionDeduct).toLocaleString()}원</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={thClass}>거래일시</th>
              <th className={thClass}>구분</th>
              <th className={thClass}>입금</th>
              <th className={thClass}>출금(차감)</th>
              <th className={thClass}>비고</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  데이터를 불러오는 중...
                </td>
              </tr>
            ) : myTransactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">
                  조회된 내역이 없습니다.
                </td>
              </tr>
            ) : (
              <>
                {myTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className={tdClass}>{formatDateTime(tx.createdAt)}</td>
                    <td className={tdClass}>
                      <span className={
                        tx.type === 'deposit' ? 'text-blue-600 font-medium' : 'text-red-600 font-medium'
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
                    <td className={`${tdClass} text-left`}>{tx.description}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-300 font-bold">
                  <td className={tdClass} colSpan={2}>합계 ({myTransactions.length}건)</td>
                  <td className={`${tdClass} text-right text-blue-600`}>
                    +{totals.totalDeposit.toLocaleString()}
                  </td>
                  <td className={`${tdClass} text-right text-red-600`}>
                    -{(totals.totalWithdraw + totals.totalAuctionDeduct).toLocaleString()}
                  </td>
                  <td className={tdClass}></td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </DealerLayout>
  );
}
