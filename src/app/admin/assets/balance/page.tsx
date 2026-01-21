'use client';

import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Download, ChevronDown, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { generateDealerSettlements } from '@/constants/dealerSettlement';
import { loadTransactions, saveTransactions, getDepositsByDate, Transaction, EditHistory } from '@/constants/transactions';

// 중도매인 잔액 데이터 타입
interface DealerBalance {
  id: string;
  dealerNo: string;
  dealerName: string;
  advancePayment: number;      // 선수금액
  unsettledAmount: number;     // 낙찰대금
  availableAmount: number;     // 판매가능금액
}

export default function DealerBalancePage() {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  // 공통 거래 내역 데이터 (localStorage 연동)
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // 초기 데이터 로드 (localStorage에서, 없으면 생성)
  useEffect(() => {
    setAllTransactions(loadTransactions());
    setIsLoaded(true);
  }, []);
  
  // 거래 내역 변경 시 localStorage 저장
  useEffect(() => {
    if (isLoaded && allTransactions.length > 0) {
      saveTransactions(allTransactions);
    }
  }, [allTransactions, isLoaded]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [expandedDealers, setExpandedDealers] = useState<string[]>([]);
  
  // 과거 날짜인지 확인 (마감 완료 여부)
  const isPastDate = selectedDate < todayStr;
  
  // 선택된 날짜 기준 중도매인 잔액 데이터 생성 (거래 내역에서 직접 계산)
  const dealers = useMemo(() => {
    const settlements = generateDealerSettlements();
    
    return settlements.map(settlement => {
      const dealerNo = settlement.dealerNo;
      
      // 해당 날짜의 모든 활성 입금 합계
      const deposits = allTransactions.filter(tx => 
        tx.dealerNo === dealerNo && 
        tx.type === 'deposit' && 
        tx.status === 'active' &&
        tx.date.startsWith(selectedDate)
      ).reduce((sum, tx) => sum + tx.amount, 0);
      
      // 해당 날짜 이전의 마지막 잔액 찾기 (전일 마감 후 잔액)
      const prevDayTransactions = allTransactions.filter(tx =>
        tx.dealerNo === dealerNo &&
        tx.status === 'active' &&
        tx.date < selectedDate
      ).sort((a, b) => b.date.localeCompare(a.date));
      
      const prevBalance = prevDayTransactions.length > 0 ? prevDayTransactions[0].balance : 0;
      
      // 해당 날짜의 활성 출금 합계 (새로 추가된 출금만, 낙찰대금 제외)
      const newWithdraws = allTransactions.filter(tx => 
        tx.dealerNo === dealerNo && 
        tx.type === 'withdraw' && 
        tx.status === 'active' &&
        tx.date.startsWith(selectedDate) &&
        tx.id.startsWith('txn-') // 새로 추가된 출금만
      ).reduce((sum, tx) => sum + tx.amount, 0);
      
      // 선수잔액 = 전일 마감 잔액 + 오늘 입금 - 오늘 추가 출금(낙찰대금 제외)
      const advancePayment = prevBalance + deposits - newWithdraws;
      
      // 낙찰대금
      const unsettledAmount = isPastDate ? 0 : settlement.netPayment;
      
      // 판매가능금액 = 선수잔액 - 낙찰대금
      const availableAmount = advancePayment - unsettledAmount;
      
      return {
        id: dealerNo,
        dealerNo,
        dealerName: settlement.dealerName,
        advancePayment,
        unsettledAmount,
        availableAmount,
      };
    });
  }, [selectedDate, isPastDate, allTransactions]);
  
  // 입출금 관련 상태
  const [editingDealer, setEditingDealer] = useState<string | null>(null);
  const [transactionType, setTransactionType] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  
  // 마감 관련 상태
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closePassword, setClosePassword] = useState('');
  const [closePasswordError, setClosePasswordError] = useState(false);
  
  // 입금 건별 수정 관련 상태
  const [editingDepositId, setEditingDepositId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editPasswordError, setEditPasswordError] = useState(false);
  
  // 입금 건별 취소 관련 상태
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelPassword, setCancelPassword] = useState('');
  const [cancelPasswordError, setCancelPasswordError] = useState(false);

  // 날짜 변경 시 펼침 초기화
  useEffect(() => {
    setExpandedDealers([]);
    setEditingDepositId(null);
  }, [selectedDate]);
  

  // 중도매인 행 펼치기/접기
  const toggleDealer = (dealerNo: string) => {
    setExpandedDealers(prev => 
      prev.includes(dealerNo)
        ? prev.filter(d => d !== dealerNo)
        : [...prev, dealerNo]
    );
  };

  // 중도매인별 입출금 내역 가져오기 (조회일자 기준, 낙찰대금 차감 제외)
  const getDealerTransactions = (dealerNo: string) => {
    return allTransactions.filter(tx => {
      if (tx.dealerNo !== dealerNo) return false;
      if (tx.description === '낙찰대금 차감') return false; // 낙찰대금 차감은 제외
      const txDate = tx.date.split(' ')[0];
      return txDate === selectedDate;
    }).sort((a, b) => b.date.localeCompare(a.date));
  };

  // 필터링된 데이터
  const filteredDealers = dealers.filter(dealer => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return dealer.dealerName.toLowerCase().includes(search) || 
           dealer.dealerNo.includes(searchTerm);
  });

  // 합계 계산
  const totalAdvance = filteredDealers.reduce((sum, d) => sum + d.advancePayment, 0);
  const totalUnsettled = filteredDealers.reduce((sum, d) => sum + d.unsettledAmount, 0);
  const totalAvailable = filteredDealers.reduce((sum, d) => sum + d.availableAmount, 0);

  // 입금/출금 버튼 클릭
  const handleTransactionClick = (dealerNo: string, type: 'deposit' | 'withdraw') => {
    setEditingDealer(dealerNo);
    setTransactionType(type);
    setAmount('');
    setPassword('');
    setPasswordError(false);
  };

  // 취소
  const handleCancel = () => {
    setEditingDealer(null);
    setAmount('');
    setPassword('');
    setPasswordError(false);
  };

  // 금액 입력 포맷팅
  const formatAmount = (value: string) => {
    const num = value.replace(/[^0-9]/g, '');
    return num ? Number(num).toLocaleString() : '';
  };

  // 저장 처리
  const handleSave = () => {
    if (password !== '1234') {
      setPasswordError(true);
      return;
    }

    const numAmount = Number(amount.replace(/[^0-9]/g, ''));
    if (!numAmount || numAmount <= 0) {
      alert('금액을 입력해주세요.');
      return;
    }

    const dealer = dealers.find(d => d.dealerNo === editingDealer);
    if (!dealer) return;

    // 출금 시 잔액 확인
    if (transactionType === 'withdraw' && numAmount > dealer.advancePayment) {
      alert('출금 금액이 선수잔액을 초과합니다.');
      return;
    }

    // 새 거래 내역 추가
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const newTransaction: Transaction = {
      id: `txn-${Date.now()}`,
      dealerNo: editingDealer!,
      dealerName: dealer.dealerName,
      type: transactionType,
      amount: numAmount,
      date: dateStr,
      description: transactionType === 'deposit' ? '선수금 입금' : '출금',
      balance: transactionType === 'deposit' 
        ? dealer.advancePayment + numAmount 
        : dealer.advancePayment - numAmount,
      createdBy: '관리자1',
      status: 'active',
    };

    setAllTransactions([newTransaction, ...allTransactions]);
    handleCancel();
  };

  // 마감 처리
  const handleClose = () => {
    if (closePassword !== '1234') {
      setClosePasswordError(true);
      return;
    }

    setShowCloseModal(false);
    setClosePassword('');
    setClosePasswordError(false);
    alert('마감 처리가 완료되었습니다.');
  };
  
  // 입금 건별 수정 시작
  const handleEditDeposit = (record: Transaction) => {
    setEditingDepositId(record.id);
    setEditAmount(record.amount.toLocaleString());
    setEditPassword('');
    setEditPasswordError(false);
  };
  
  // 입금 건별 수정 취소
  const handleEditCancel = () => {
    setEditingDepositId(null);
    setEditAmount('');
    setEditPassword('');
    setEditPasswordError(false);
  };
  
  // 입금 건별 수정 저장
  const handleEditSave = (record: Transaction) => {
    if (editPassword !== '1234') {
      setEditPasswordError(true);
      return;
    }
    
    const newAmount = Number(editAmount.replace(/[^0-9]/g, ''));
    if (!newAmount || newAmount <= 0) {
      alert('금액을 입력해주세요.');
      return;
    }
    
    if (newAmount === record.amount) {
      alert('금액이 동일합니다.');
      return;
    }
    
    // 수정 이력 추가
    const now = new Date();
    const editedAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const newHistory: EditHistory = {
      editedAt,
      editedBy: '관리자1',
      previousAmount: record.amount,
      newAmount,
    };
    
    // 거래 내역 업데이트
    setAllTransactions(prev => prev.map(tx => {
      if (tx.id === record.id) {
        return {
          ...tx,
          amount: newAmount,
          editHistory: [...(tx.editHistory || []), newHistory],
        };
      }
      return tx;
    }));
    
    handleEditCancel();
  };
  
  // 입금 취소 모달 열기
  const openCancelModal = (recordId: string) => {
    setCancelTargetId(recordId);
    setCancelReason('');
    setCancelPassword('');
    setCancelPasswordError(false);
    setShowCancelModal(true);
  };
  
  // 입금 취소 모달 닫기
  const closeCancelModal = () => {
    setShowCancelModal(false);
    setCancelTargetId(null);
    setCancelReason('');
    setCancelPassword('');
    setCancelPasswordError(false);
  };
  
  // 입금 취소 처리
  const handleCancelDeposit = () => {
    if (cancelPassword !== '1234') {
      setCancelPasswordError(true);
      return;
    }
    
    if (!cancelReason.trim()) {
      alert('취소 사유를 입력해주세요.');
      return;
    }
    
    const now = new Date();
    const cancelledAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // 거래 내역 업데이트 (취소 처리)
    setAllTransactions(prev => prev.map(tx => {
      if (tx.id === cancelTargetId) {
        return {
          ...tx,
          status: 'cancelled' as const,
          cancelledAt,
          cancelledBy: '관리자1',
          cancelReason: cancelReason.trim(),
        };
      }
      return tx;
    }));
    
    closeCancelModal();
  };

  // 엑셀 다운로드
  const handleExcelDownload = () => {
    const excelData = filteredDealers.map(dealer => ({
      '중도매인번호': dealer.dealerNo,
      '중도매인명': dealer.dealerName,
      '선수금액': dealer.advancePayment,
      '낙찰대금': dealer.unsettledAmount,
      '판매가능금액': dealer.availableAmount,
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '중도매인 자산 관리');
    
    const today = new Date();
    const fileName = `중도매인_자산관리_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const thClass = "px-2 py-1.5 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50";
  const tdClass = "px-2 py-1.5 text-xs border border-gray-200 text-center whitespace-nowrap";

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">중도매인 자산 관리</h1>
      </div>

      {/* 필터 */}
      <div className="bg-white border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">조회일자</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
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
              onClick={() => {
                setSearchTerm('');
                setSelectedDate(todayStr);
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
            {isPastDate ? (
              <div className="px-4 py-1.5 bg-gray-100 text-gray-700 text-xs">
                마감 완료
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCloseModal(true)}
                className="px-4 py-1.5 bg-gray-700 text-white text-xs hover:bg-gray-800"
              >
                마감
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 테이블 */}
      {!isLoaded ? (
        <div className="bg-white border border-gray-200 p-8 text-center text-gray-400 text-sm">
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
              <th className={`${thClass} w-[18%]`}>선수잔액</th>
              <th className={`${thClass} w-[18%]`}>낙찰대금</th>
              <th className={`${thClass} w-[18%]`}>판매가능금액</th>
              <th className={`${thClass} w-[16%]`}>입출금</th>
            </tr>
          </thead>
          <tbody>
            {filteredDealers.map((dealer) => (
              <React.Fragment key={dealer.id}>
                <tr 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleDealer(dealer.dealerNo)}
                >
                  <td className={tdClass}>
                    {expandedDealers.includes(dealer.dealerNo) 
                      ? <ChevronDown className="w-4 h-4 mx-auto text-gray-500" />
                      : <ChevronRight className="w-4 h-4 mx-auto text-gray-500" />
                    }
                  </td>
                  <td className={tdClass}>{dealer.dealerNo}</td>
                  <td className={`${tdClass} font-medium`}>{dealer.dealerName}</td>
                  <td className={`${tdClass} text-right`}>{dealer.advancePayment.toLocaleString()}</td>
                  <td className={`${tdClass} text-right`}>{dealer.unsettledAmount.toLocaleString()}</td>
                  <td className={`${tdClass} text-right font-semibold ${dealer.availableAmount < 0 ? 'text-red-600' : ''}`}>
                    {dealer.availableAmount.toLocaleString()}
                  </td>
                  <td 
                    className="px-2 py-1.5 text-xs border border-gray-200 text-center whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isPastDate ? (
                      <div className="flex items-center justify-center h-[22px]">
                        <span className="text-gray-400">-</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1 h-[22px]">
                        <button
                          type="button"
                          onClick={() => handleTransactionClick(dealer.dealerNo, 'deposit')}
                          className="px-2 py-0.5 text-xs border border-gray-300 text-gray-600 hover:bg-gray-50"
                          disabled={editingDealer !== null}
                        >
                          입금
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTransactionClick(dealer.dealerNo, 'withdraw')}
                          className="px-2 py-0.5 text-xs border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={editingDealer !== null || dealer.availableAmount < 0}
                        >
                          출금
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
                
                {/* 입출금 입력 폼 */}
                {editingDealer === dealer.dealerNo && (
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
                            onChange={(e) => {
                              setPassword(e.target.value);
                              setPasswordError(false);
                            }}
                            placeholder="비밀번호"
                            className={`px-2 py-1 border text-xs outline-none bg-white w-24 ${
                              passwordError ? 'border-red-500' : 'border-gray-200'
                            }`}
                          />
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                          <button
                            type="button"
                            onClick={handleSave}
                            className="px-3 py-1 bg-gray-700 text-white text-xs hover:bg-gray-800"
                          >
                            저장
                          </button>
                          <button
                            type="button"
                            onClick={handleCancel}
                            className="px-3 py-1 border border-gray-300 text-gray-600 text-xs hover:bg-gray-50"
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                
                {/* 입출금 내역 펼침 */}
                {expandedDealers.includes(dealer.dealerNo) && (
                  <tr>
                    <td colSpan={7} className="p-0 border border-gray-200">
                      <div className="bg-white p-3">
                        <div className="text-xs font-semibold text-gray-700 mb-2">
                          입출금 내역 ({getDealerTransactions(dealer.dealerNo).filter(d => d.status === 'active').length}건)
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
                            {getDealerTransactions(dealer.dealerNo).length > 0 ? (
                              getDealerTransactions(dealer.dealerNo).map((record) => (
                                <React.Fragment key={record.id}>
                                  {editingDepositId === record.id ? (
                                    // 인라인 수정 모드
                                    <tr className="bg-gray-50">
                                      <td className={tdClass}>{record.date}</td>
                                      <td className={tdClass}>
                                        {record.type === 'deposit' ? (
                                          <input
                                            type="text"
                                            value={editAmount}
                                            onChange={(e) => setEditAmount(formatAmount(e.target.value))}
                                            className="px-2 py-1 border border-gray-200 text-xs outline-none bg-white w-24 text-right"
                                            autoFocus
                                          />
                                        ) : ''}
                                      </td>
                                      <td className={tdClass}>
                                        {record.type === 'withdraw' ? (
                                          <input
                                            type="text"
                                            value={editAmount}
                                            onChange={(e) => setEditAmount(formatAmount(e.target.value))}
                                            className="px-2 py-1 border border-gray-200 text-xs outline-none bg-white w-24 text-right"
                                            autoFocus
                                          />
                                        ) : ''}
                                      </td>
                                      <td className={tdClass}>{record.createdBy}</td>
                                      <td className={tdClass}>
                                        {record.editHistory?.length || 0}회
                                      </td>
                                      <td className={tdClass}>
                                        <span className="text-gray-600">정상</span>
                                      </td>
                                      <td className={tdClass}>
                                        <div className="flex items-center justify-center gap-1">
                                          <input
                                            type="password"
                                            value={editPassword}
                                            onChange={(e) => {
                                              setEditPassword(e.target.value);
                                              setEditPasswordError(false);
                                            }}
                                            placeholder="2차PW"
                                            className={`px-1 py-0.5 border text-xs outline-none bg-white w-14 ${
                                              editPasswordError ? 'border-red-500' : 'border-gray-200'
                                            }`}
                                          />
                                          <button
                                            type="button"
                                            onClick={() => handleEditSave(record)}
                                            className="px-2 py-0.5 bg-gray-700 text-white text-xs hover:bg-gray-800"
                                          >
                                            저장
                                          </button>
                                          <button
                                            type="button"
                                            onClick={handleEditCancel}
                                            className="px-2 py-0.5 border border-gray-300 text-gray-600 text-xs hover:bg-gray-50"
                                          >
                                            취소
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ) : (
                                    // 일반 표시 모드
                                    <tr 
                                      className={`hover:bg-gray-50 ${record.status === 'cancelled' ? 'text-gray-400' : ''}`}
                                    >
                                      <td className={`${tdClass} ${record.status === 'cancelled' ? 'line-through' : ''}`}>
                                        {record.date}
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
                                              <span className="text-gray-400 text-[10px] ml-1">
                                                ({record.editHistory[record.editHistory.length - 1].editedBy})
                                              </span>
                                            </span>
                                            {/* 커스텀 툴팁 */}
                                            <div className="absolute z-50 hidden group-hover:block bg-gray-800 text-white text-xs p-2 shadow-lg -left-20 top-6 w-64">
                                              <div className="font-semibold mb-1 border-b border-gray-600 pb-1">수정 이력</div>
                                              {record.editHistory.map((h, idx) => (
                                                <div key={idx} className="py-1 border-b border-gray-700 last:border-0">
                                                  <div className="text-gray-300">{h.editedAt}</div>
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
                                            <span className="text-red-600 cursor-help">
                                              취소
                                              <span className="text-gray-400 text-[10px] ml-1">
                                                ({record.cancelledBy})
                                              </span>
                                            </span>
                                            {/* 커스텀 툴팁 */}
                                            <div className="absolute z-50 hidden group-hover:block bg-gray-800 text-white text-xs p-2 shadow-lg -left-20 top-6 w-56">
                                              <div className="font-semibold mb-1 border-b border-gray-600 pb-1">취소 정보</div>
                                              <div className="space-y-1">
                                                <div className="flex justify-between">
                                                  <span className="text-gray-400">취소일시:</span>
                                                  <span>{record.cancelledAt}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span className="text-gray-400">취소자:</span>
                                                  <span>{record.cancelledBy}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span className="text-gray-400">사유:</span>
                                                  <span className="text-red-300">{record.cancelReason}</span>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </td>
                                      <td className={tdClass}>
                                        {record.status === 'active' && !isPastDate ? (
                                          <div className="flex items-center justify-center gap-1">
                                            <button
                                              type="button"
                                              onClick={() => handleEditDeposit(record)}
                                              className="px-2 py-0.5 text-xs border border-gray-300 text-gray-600 hover:bg-gray-50"
                                              disabled={editingDepositId !== null}
                                            >
                                              수정
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => openCancelModal(record.id)}
                                              className="px-2 py-0.5 text-xs border border-gray-300 text-gray-600 hover:bg-gray-50"
                                              disabled={editingDepositId !== null}
                                            >
                                              취소
                                            </button>
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
            ))}
          </tbody>
          {/* 합계 */}
          <tfoot>
            <tr className="font-semibold border-t-2 border-gray-300">
              <td className={tdClass}></td>
              <td className={tdClass} colSpan={2}>합계 ({filteredDealers.length}명)</td>
              <td className={`${tdClass} text-right`}>{totalAdvance.toLocaleString()}</td>
              <td className={`${tdClass} text-right`}>{totalUnsettled.toLocaleString()}</td>
              <td className={`${tdClass} text-right font-bold ${totalAvailable < 0 ? 'text-red-600' : ''}`}>
                {totalAvailable.toLocaleString()}
              </td>
              <td className={tdClass}></td>
            </tr>
          </tfoot>
        </table>
      </div>
      )}

      {/* 마감 확인 모달 */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white w-[360px]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">마감 확인</h3>
              <button
                onClick={() => {
                  setShowCloseModal(false);
                  setClosePassword('');
                  setClosePasswordError(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="text-sm text-gray-600">
                <p className="mb-2">마감 처리 시 다음과 같이 변경됩니다:</p>
                <ul className="list-disc list-inside text-xs space-y-1 text-gray-500">
                  <li>판매가능금액 → 선수잔액으로 이동</li>
                  <li>낙찰대금 → 0원으로 초기화</li>
                </ul>
              </div>
              
              <div className="bg-gray-50 p-3 text-xs">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-600">총 선수잔액:</span>
                  <span className="font-medium">{totalAdvance.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-600">총 낙찰대금:</span>
                  <span className="font-medium">{totalUnsettled.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                  <span className="text-gray-600">마감 후 선수잔액:</span>
                  <span className="font-semibold">{totalAvailable.toLocaleString()}원</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">2차 비밀번호</label>
                <input
                  type="password"
                  value={closePassword}
                  onChange={(e) => {
                    setClosePassword(e.target.value);
                    setClosePasswordError(false);
                  }}
                  placeholder="비밀번호 입력"
                  className={`w-full px-3 py-2 border text-sm outline-none bg-white ${
                    closePasswordError ? 'border-red-500' : 'border-gray-200'
                  }`}
                />
                {closePasswordError && (
                  <p className="text-xs text-red-500 mt-1">비밀번호가 일치하지 않습니다.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowCloseModal(false);
                  setClosePassword('');
                  setClosePasswordError(false);
                }}
                className="px-4 py-1.5 text-xs border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleClose}
                className="px-4 py-1.5 text-xs bg-gray-700 text-white hover:bg-gray-800"
              >
                마감
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 입금 취소 모달 */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white w-[360px]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">입금 취소</h3>
              <button
                onClick={closeCancelModal}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
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
                  onChange={(e) => {
                    setCancelPassword(e.target.value);
                    setCancelPasswordError(false);
                  }}
                  placeholder="비밀번호 입력"
                  className={`w-full px-3 py-2 border text-sm outline-none bg-white ${
                    cancelPasswordError ? 'border-red-500' : 'border-gray-200'
                  }`}
                />
                {cancelPasswordError && (
                  <p className="text-xs text-red-500 mt-1">비밀번호가 일치하지 않습니다.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200">
              <button
                onClick={closeCancelModal}
                className="px-4 py-1.5 text-xs border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                닫기
              </button>
              <button
                onClick={handleCancelDeposit}
                className="px-4 py-1.5 text-xs bg-gray-700 text-white hover:bg-gray-800"
              >
                취소 처리
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
