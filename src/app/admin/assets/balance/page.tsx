'use client';

import React, { useState, useMemo } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Download, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useSession } from 'next-auth/react';

interface EditHistory {
  editedAt: string;
  editedBy: string;
  previousAmount: number;
  newAmount: number;
}

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
  cancelledAt?: string;
  cancelledBy?: string;
  cancelReason?: string;
  editHistory: EditHistory[];
  source?: 'manual' | 'auction';
}

interface DealerBalance {
  id: string;
  dealerNo: string;
  dealerName: string;
  phone: string;
  totalDeposit: number;
  totalWithdraw: number;
  auctionDeduct: number;
  totalDeduct: number;
  availableAmount: number;
}

export default function DealerBalancePage() {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const { data: session } = useSession();
  const currentAdmin = (session as any)?.user?.name || '관리자';
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [expandedDealers, setExpandedDealers] = useState<string[]>([]);

  const [editingDealer, setEditingDealer] = useState<string | null>(null);
  const [transactionType, setTransactionType] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const [editingDepositId, setEditingDepositId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editPasswordError, setEditPasswordError] = useState(false);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelPassword, setCancelPassword] = useState('');
  const [cancelPasswordError, setCancelPasswordError] = useState(false);

  // 잔액 조회
  const { data: balanceData, isLoading: balanceLoading } = useQuery<{ balances: DealerBalance[]; summary: any }>({
    queryKey: ['dealer-balances', selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/dealer-balances?date=${selectedDate}`);
      if (!res.ok) throw new Error();
      return res.json();
    },
  });

  const dealers = balanceData?.balances || [];
  const summary = balanceData?.summary || { totalDeposit: 0, totalDeduct: 0, totalAvailable: 0 };

  // 거래 내역 조회 (확장된 딜러용)
  const { data: txData } = useQuery<{ transactions: Transaction[] }>({
    queryKey: ['dealer-transactions', selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/dealer-transactions?date=${selectedDate}`);
      if (!res.ok) throw new Error();
      return res.json();
    },
  });

  const allTransactions = txData?.transactions || [];

  const getDealerTransactions = (dealerId: string) => {
    return allTransactions
      .filter(tx => tx.dealerId === dealerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const filteredDealers = dealers.filter(dealer => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return dealer.dealerName.toLowerCase().includes(search) || dealer.dealerNo.includes(searchTerm);
  });

  const totalDeposit = filteredDealers.reduce((sum, d) => sum + d.totalDeposit, 0);
  const totalDeduct = filteredDealers.reduce((sum, d) => sum + d.totalDeduct, 0);
  const totalAvailable = filteredDealers.reduce((sum, d) => sum + d.availableAmount, 0);

  const toggleDealer = (dealerId: string) => {
    setExpandedDealers(prev =>
      prev.includes(dealerId) ? prev.filter(d => d !== dealerId) : [...prev, dealerId]
    );
  };

  const formatAmount = (value: string) => {
    const num = value.replace(/[^0-9]/g, '');
    return num ? Number(num).toLocaleString() : '';
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '';
    return format(new Date(dateStr), 'yyyy-MM-dd HH:mm');
  };

  const refetchAll = () => {
    queryClient.invalidateQueries({ queryKey: ['dealer-balances'] });
    queryClient.invalidateQueries({ queryKey: ['dealer-transactions'] });
  };

  const handleTransactionClick = (dealerId: string, type: 'deposit' | 'withdraw') => {
    setEditingDealer(dealerId);
    setTransactionType(type);
    setAmount('');
    setPassword('');
    setPasswordError(false);
  };

  const handleCancel = () => {
    setEditingDealer(null);
    setAmount('');
    setPassword('');
    setPasswordError(false);
  };

  const handleSave = async () => {
    const numAmount = Number(amount.replace(/[^0-9]/g, ''));
    if (!numAmount || numAmount <= 0) {
      alert('금액을 입력해주세요.');
      return;
    }

    try {
      const res = await fetch('/api/dealer-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealerId: editingDealer,
          type: transactionType,
          amount: numAmount,
          description: transactionType === 'deposit' ? '입금' : '출금',
          createdBy: currentAdmin,
          adminPassword: password,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 403) {
          setPasswordError(true);
          return;
        }
        alert(data.error || '처리 중 오류가 발생했습니다.');
        return;
      }

      handleCancel();
      refetchAll();
    } catch {
      alert('처리 중 오류가 발생했습니다.');
    }
  };

  const handleEditDeposit = (record: Transaction) => {
    setEditingDepositId(record.id);
    setEditAmount(record.amount.toLocaleString());
    setEditPassword('');
    setEditPasswordError(false);
  };

  const handleEditCancel = () => {
    setEditingDepositId(null);
    setEditAmount('');
    setEditPassword('');
    setEditPasswordError(false);
  };

  const handleEditSave = async (record: Transaction) => {
    const newAmount = Number(editAmount.replace(/[^0-9]/g, ''));
    if (!newAmount || newAmount <= 0) {
      alert('금액을 입력해주세요.');
      return;
    }
    if (newAmount === record.amount) {
      alert('금액이 동일합니다.');
      return;
    }

    try {
      const res = await fetch(`/api/dealer-transactions/${record.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: newAmount,
          editedBy: currentAdmin,
          adminPassword: editPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 403) {
          setEditPasswordError(true);
          return;
        }
        alert(data.error || '수정 중 오류가 발생했습니다.');
        return;
      }

      handleEditCancel();
      refetchAll();
    } catch {
      alert('수정 중 오류가 발생했습니다.');
    }
  };

  const openCancelModal = (recordId: string) => {
    setCancelTargetId(recordId);
    setCancelReason('');
    setCancelPassword('');
    setCancelPasswordError(false);
    setShowCancelModal(true);
  };

  const closeCancelModal = () => {
    setShowCancelModal(false);
    setCancelTargetId(null);
    setCancelReason('');
    setCancelPassword('');
    setCancelPasswordError(false);
  };

  const handleCancelDeposit = async () => {
    if (!cancelReason.trim()) {
      alert('취소 사유를 입력해주세요.');
      return;
    }

    try {
      const res = await fetch(`/api/dealer-transactions/${cancelTargetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cancelReason: cancelReason.trim(),
          cancelledBy: currentAdmin,
          adminPassword: cancelPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 403) {
          setCancelPasswordError(true);
          return;
        }
        alert(data.error || '취소 중 오류가 발생했습니다.');
        return;
      }

      closeCancelModal();
      refetchAll();
    } catch {
      alert('취소 중 오류가 발생했습니다.');
    }
  };

  const handleExcelDownload = () => {
    const excelData = filteredDealers.map(dealer => ({
      '중도매인번호': dealer.dealerNo,
      '중도매인명': dealer.dealerName,
      '입금': dealer.totalDeposit,
      '출금(차감)': dealer.totalDeduct,
      '판매가능금액': dealer.availableAmount,
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '중도매인 자산 관리(입출금)');
    XLSX.writeFile(workbook, `중도매인_자산관리_${selectedDate.replace(/-/g, '')}.xlsx`);
  };

  const thClass = "px-2 py-1.5 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50";
  const tdClass = "px-2 py-1.5 text-xs border border-gray-200 text-center whitespace-nowrap";

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">중도매인 자산 관리(입출금)</h1>
      </div>

      {/* 필터 */}
      <div className="bg-white border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">조회일자</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); setExpandedDealers([]); }}
              max={todayStr}
              className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">중도매인</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="이름 또는 번호 검색"
              className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white w-48"
            />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => { setSearchTerm(''); setSelectedDate(todayStr); }}
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
      {balanceLoading ? (
        <div className="bg-white border border-gray-200 p-8 text-center text-gray-400 text-sm">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
          로딩 중...
        </div>
      ) : (
        <div className="bg-white border border-gray-200 overflow-hidden">
          <table className="w-full border-collapse table-fixed">
            <thead>
              <tr>
                <th className={`${thClass} w-[4%]`}></th>
                <th className={`${thClass} w-[13%]`}>중도매인번호</th>
                <th className={`${thClass} w-[13%]`}>중도매인명</th>
                <th className={`${thClass} w-[18%]`}>입금</th>
                <th className={`${thClass} w-[18%]`}>출금(차감)</th>
                <th className={`${thClass} w-[18%]`}>판매가능금액</th>
                <th className={`${thClass} w-[16%]`}>입출금</th>
              </tr>
            </thead>
            <tbody>
              {filteredDealers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">
                    조회된 중도매인이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredDealers.map((dealer) => (
                  <React.Fragment key={dealer.id}>
                    <tr
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleDealer(dealer.id)}
                    >
                      <td className={tdClass}>
                        {expandedDealers.includes(dealer.id)
                          ? <ChevronDown className="w-4 h-4 mx-auto text-gray-500" />
                          : <ChevronRight className="w-4 h-4 mx-auto text-gray-500" />
                        }
                      </td>
                      <td className={tdClass}>{dealer.dealerNo}</td>
                      <td className={`${tdClass} font-medium`}>{dealer.dealerName}</td>
                      <td className={`${tdClass} text-right`}>{dealer.totalDeposit.toLocaleString()}</td>
                      <td className={`${tdClass} text-right`}>{dealer.totalDeduct.toLocaleString()}</td>
                      <td className={`${tdClass} text-right font-semibold ${dealer.availableAmount < 0 ? 'text-red-600' : ''}`}>
                        {dealer.availableAmount.toLocaleString()}
                      </td>
                      <td
                        className="px-2 py-1.5 text-xs border border-gray-200 text-center whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1 h-[22px]">
                          <button
                            type="button"
                            onClick={() => handleTransactionClick(dealer.id, 'deposit')}
                            className="px-2 py-0.5 text-xs border border-gray-300 text-gray-600 hover:bg-gray-50"
                            disabled={editingDealer !== null}
                          >
                            입금
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTransactionClick(dealer.id, 'withdraw')}
                            className="px-2 py-0.5 text-xs border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={editingDealer !== null || dealer.availableAmount < 0}
                          >
                            출금
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* 입출금 입력 폼 */}
                    {editingDealer === dealer.id && (
                      <tr className="bg-white">
                        <td colSpan={7} className="px-4 py-3 border border-gray-200">
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-semibold text-gray-700">
                              {transactionType === 'deposit' ? '입금' : '출금'}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-600">금액</span>
                              <input
                                type="text"
                                value={amount}
                                onChange={(e) => setAmount(formatAmount(e.target.value))}
                                placeholder="금액 입력"
                                className="px-2 py-1 border border-gray-200 text-xs outline-none bg-white w-32 text-right"
                                autoFocus
                              />
                              <span className="text-xs text-gray-600">원</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-600">2차PW</span>
                              <input
                                type="password"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setPasswordError(false); }}
                                placeholder="비밀번호"
                                className={`px-2 py-1 border text-xs outline-none bg-white w-24 ${passwordError ? 'border-red-500' : 'border-gray-200'}`}
                              />
                            </div>
                            <div className="flex items-center gap-2 ml-auto">
                              <button type="button" onClick={handleSave} className="px-3 py-1 bg-gray-700 text-white text-xs hover:bg-gray-800">
                                저장
                              </button>
                              <button type="button" onClick={handleCancel} className="px-3 py-1 border border-gray-300 text-gray-600 text-xs hover:bg-gray-50">
                                취소
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* 입출금 내역 펼침 */}
                    {expandedDealers.includes(dealer.id) && (
                      <tr>
                        <td colSpan={7} className="p-0 border border-gray-200">
                          <div className="bg-white p-3">
                            <div className="text-xs font-semibold text-gray-700 mb-2">
                              입출금 내역 ({getDealerTransactions(dealer.id).filter(d => d.status === 'active').length}건)
                            </div>
                            <table className="w-full border-collapse">
                              <thead>
                                <tr>
                                  <th className={thClass}>일시</th>
                                  <th className={thClass}>입금</th>
                                  <th className={thClass}>출금(차감)</th>
                                  <th className={thClass}>처리자</th>
                                  <th className={thClass}>수정</th>
                                  <th className={thClass}>상태</th>
                                  <th className={thClass}>관리</th>
                                </tr>
                              </thead>
                              <tbody>
                                {getDealerTransactions(dealer.id).length > 0 ? (
                                  getDealerTransactions(dealer.id).map((record) => (
                                    <React.Fragment key={record.id}>
                                      {editingDepositId === record.id ? (
                                        <tr className="bg-gray-50">
                                          <td className={tdClass}>{formatDateTime(record.createdAt)}</td>
                                          <td className={tdClass}>
                                            {record.type === 'deposit' ? (
                                              <input type="text" value={editAmount} onChange={(e) => setEditAmount(formatAmount(e.target.value))}
                                                className="px-2 py-1 border border-gray-200 text-xs outline-none bg-white w-24 text-right" autoFocus />
                                            ) : ''}
                                          </td>
                                          <td className={tdClass}>
                                            {record.type === 'withdraw' ? (
                                              <input type="text" value={editAmount} onChange={(e) => setEditAmount(formatAmount(e.target.value))}
                                                className="px-2 py-1 border border-gray-200 text-xs outline-none bg-white w-24 text-right" autoFocus />
                                            ) : ''}
                                          </td>
                                          <td className={tdClass}>{record.createdBy}</td>
                                          <td className={tdClass}>{record.editHistory?.length || 0}회</td>
                                          <td className={tdClass}><span className="text-gray-600">정상</span></td>
                                          <td className={tdClass}>
                                            <div className="flex items-center justify-center gap-1">
                                              <input type="password" value={editPassword}
                                                onChange={(e) => { setEditPassword(e.target.value); setEditPasswordError(false); }}
                                                placeholder="2차PW"
                                                className={`px-1 py-0.5 border text-xs outline-none bg-white w-14 ${editPasswordError ? 'border-red-500' : 'border-gray-200'}`} />
                                              <button type="button" onClick={() => handleEditSave(record)} className="px-2 py-0.5 bg-gray-700 text-white text-xs hover:bg-gray-800">저장</button>
                                              <button type="button" onClick={handleEditCancel} className="px-2 py-0.5 border border-gray-300 text-gray-600 text-xs hover:bg-gray-50">취소</button>
                                            </div>
                                          </td>
                                        </tr>
                                      ) : (
                                        <tr className={`hover:bg-gray-50 ${record.status === 'cancelled' ? 'text-gray-400' : ''}`}>
                                          <td className={`${tdClass} ${record.status === 'cancelled' ? 'line-through' : ''}`}>
                                            {formatDateTime(record.createdAt)}
                                          </td>
                                          <td className={`${tdClass} text-right text-blue-600 ${record.status === 'cancelled' ? 'line-through' : ''}`}>
                                            {record.type === 'deposit' ? `+${record.amount.toLocaleString()}` : ''}
                                          </td>
                                          <td className={`${tdClass} text-right text-red-600 ${record.status === 'cancelled' ? 'line-through' : ''}`}>
                                            {record.type === 'withdraw' ? `-${record.amount.toLocaleString()}` : ''}
                                          </td>
                                          <td className={tdClass}>{record.createdBy}</td>
                                          <td className={tdClass}>
                                            {record.editHistory && record.editHistory.length > 0 ? (
                                              <div className="relative group inline-block">
                                                <span className="cursor-help underline text-gray-600">
                                                  {record.editHistory.length}회
                                                </span>
                                                <div className="absolute z-50 hidden group-hover:block bg-gray-800 text-white text-xs p-2 shadow-lg -left-20 top-6 w-64">
                                                  <div className="font-semibold mb-1 border-b border-gray-600 pb-1">수정 이력</div>
                                                  {record.editHistory.map((h, idx) => (
                                                    <div key={idx} className="py-1 border-b border-gray-700 last:border-0">
                                                      <div className="text-gray-300">{formatDateTime(h.editedAt)}</div>
                                                      <div className="flex justify-between">
                                                        <span>{h.editedBy}</span>
                                                        <span>
                                                          <span className="text-red-400">{h.previousAmount.toLocaleString()}</span>
                                                          <span className="mx-1">→</span>
                                                          <span className="text-green-400">{h.newAmount.toLocaleString()}</span>
                                                        </span>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            ) : (
                                              <span className="text-gray-400">-</span>
                                            )}
                                          </td>
                                          <td className={tdClass}>
                                            {record.status === 'active' ? (
                                              <span className="text-gray-600">정상</span>
                                            ) : (
                                              <div className="relative group inline-block">
                                                <span className="text-red-600 cursor-help">취소</span>
                                                <div className="absolute z-50 hidden group-hover:block bg-gray-800 text-white text-xs p-2 shadow-lg -left-20 top-6 w-56">
                                                  <div className="font-semibold mb-1 border-b border-gray-600 pb-1">취소 정보</div>
                                                  <div className="space-y-1">
                                                    <div className="flex justify-between"><span className="text-gray-400">취소일시:</span><span>{formatDateTime(record.cancelledAt || '')}</span></div>
                                                    <div className="flex justify-between"><span className="text-gray-400">취소자:</span><span>{record.cancelledBy}</span></div>
                                                    <div className="flex justify-between"><span className="text-gray-400">사유:</span><span className="text-red-300">{record.cancelReason}</span></div>
                                                  </div>
                                                </div>
                                              </div>
                                            )}
                                          </td>
                                          <td className={tdClass}>
                                            {record.status === 'active' ? (
                                              <div className="flex items-center justify-center gap-1">
                                                <button type="button" onClick={() => handleEditDeposit(record)} className="px-2 py-0.5 text-xs border border-gray-300 text-gray-600 hover:bg-gray-50" disabled={editingDepositId !== null}>수정</button>
                                                <button type="button" onClick={() => openCancelModal(record.id)} className="px-2 py-0.5 text-xs border border-gray-300 text-gray-600 hover:bg-gray-50" disabled={editingDepositId !== null}>취소</button>
                                              </div>
                                            ) : (
                                              <span className="text-gray-400">-</span>
                                            )}
                                          </td>
                                        </tr>
                                      )}
                                    </React.Fragment>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan={7} className="px-4 py-4 text-center text-gray-400 text-xs">
                                      입출금 내역이 없습니다.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="font-semibold border-t-2 border-gray-300">
                <td className={tdClass}></td>
                <td className={tdClass} colSpan={2}>합계 ({filteredDealers.length}명)</td>
                <td className={`${tdClass} text-right`}>{totalDeposit.toLocaleString()}</td>
                <td className={`${tdClass} text-right`}>{totalDeduct.toLocaleString()}</td>
                <td className={`${tdClass} text-right font-bold ${totalAvailable < 0 ? 'text-red-600' : ''}`}>
                  {totalAvailable.toLocaleString()}
                </td>
                <td className={tdClass}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* 입금 취소 모달 */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white w-[360px]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">입금 취소</h3>
              <button onClick={closeCancelModal} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">취소 사유 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="취소 사유 입력"
                  className="w-full px-3 py-2 border border-gray-200 text-sm outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">2차 비밀번호</label>
                <input
                  type="password"
                  value={cancelPassword}
                  onChange={(e) => { setCancelPassword(e.target.value); setCancelPasswordError(false); }}
                  placeholder="비밀번호 입력"
                  className={`w-full px-3 py-2 border text-sm outline-none bg-white ${cancelPasswordError ? 'border-red-500' : 'border-gray-200'}`}
                />
                {cancelPasswordError && <p className="text-xs text-red-500 mt-1">비밀번호가 일치하지 않습니다.</p>}
              </div>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200">
              <button onClick={closeCancelModal} className="px-4 py-1.5 text-xs border border-gray-300 text-gray-600 hover:bg-gray-50">닫기</button>
              <button onClick={handleCancelDeposit} className="px-4 py-1.5 text-xs bg-gray-700 text-white hover:bg-gray-800">취소 처리</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
