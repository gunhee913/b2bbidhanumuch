'use client';

import React, { useState, useMemo, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { ChevronDown, ChevronRight, Printer, Download, Check } from 'lucide-react';
import * as XLSX from 'xlsx';
import { generateDealerSettlements, DealerSettlementData } from '@/constants/dealerSettlement';
import { 
  DELIVERY_PARTNERS, 
  loadAssignments, 
  DeliveryPartner, 
  PartnerAssignments,
  DeliveryStatusMap,
  loadDeliveryStatus,
  saveDeliveryStatus
} from '@/constants/delivery';

// 출고 항목 타입
interface DeliveryItem {
  dealerNo: string;
  dealerName: string;
  listingNo: string;
  partName: string;
  grade: string;
  weight: number;
  unitPrice: number;
  amount: number;
  status: 'pending' | 'shipped';
  shippedAt?: string;
  shippedBy?: string;
}

// 거래처별 출고 데이터 타입
interface PartnerDelivery {
  partner: DeliveryPartner;
  items: DeliveryItem[];
  totalWeight: number;
  totalAmount: number;
  pendingCount: number;
  shippedCount: number;
}

export default function DeliveryOrdersPage() {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  const [settlements] = useState<DealerSettlementData[]>(generateDealerSettlements());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [partnerSearch, setPartnerSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'shipped'>('all');
  const [expandedPartners, setExpandedPartners] = useState<string[]>([]);
  const [selectedPartners, setSelectedPartners] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<PartnerAssignments>({});
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatusMap>({});
  
  // 초기 데이터 로드 및 포커스 시 새로고침
  useEffect(() => {
    setAssignments(loadAssignments());
    setDeliveryStatus(loadDeliveryStatus());
    
    const handleFocus = () => {
      setAssignments(loadAssignments());
      setDeliveryStatus(loadDeliveryStatus());
    };
    window.addEventListener('focus', handleFocus);
    
    return () => window.removeEventListener('focus', handleFocus);
  }, []);
  
  // 거래처별 출고 데이터 생성 (저장된 거래처 지정 데이터 사용)
  const partnerDeliveries = useMemo(() => {
    const deliveryMap = new Map<string, PartnerDelivery>();
    
    // 각 거래처별로 초기화
    DELIVERY_PARTNERS.forEach(partner => {
      deliveryMap.set(partner.id, {
        partner,
        items: [],
        totalWeight: 0,
        totalAmount: 0,
        pendingCount: 0,
        shippedCount: 0,
      });
    });
    
    // 미지정 거래처용
    const unassignedItems: DeliveryItem[] = [];
    let unassignedWeight = 0;
    let unassignedAmount = 0;
    let unassignedPending = 0;
    let unassignedShipped = 0;
    
    // 중도매인별 부위를 지정된 거래처에 배정
    settlements.forEach((settlement) => {
      settlement.bidParts.forEach((part) => {
        const partnerId = assignments[part.listingNo];
        const statusData = deliveryStatus[part.listingNo];
        const status = statusData?.status || 'pending';
        
        const item: DeliveryItem = {
          dealerNo: settlement.dealerNo,
          dealerName: settlement.dealerName,
          listingNo: part.listingNo,
          partName: part.partName,
          grade: part.grade,
          weight: part.weight,
          unitPrice: part.unitPrice,
          amount: part.amount,
          status,
          shippedAt: statusData?.shippedAt,
          shippedBy: statusData?.shippedBy,
        };
        
        if (partnerId && deliveryMap.has(partnerId)) {
          const delivery = deliveryMap.get(partnerId)!;
          delivery.items.push(item);
          delivery.totalWeight += part.weight;
          delivery.totalAmount += part.amount;
          if (status === 'pending') delivery.pendingCount++;
          else delivery.shippedCount++;
        } else {
          unassignedItems.push(item);
          unassignedWeight += part.weight;
          unassignedAmount += part.amount;
          if (status === 'pending') unassignedPending++;
          else unassignedShipped++;
        }
      });
    });
    
    // 미지정 항목이 있으면 추가
    const result = Array.from(deliveryMap.values()).filter(d => d.items.length > 0);
    
    if (unassignedItems.length > 0) {
      result.push({
        partner: {
          id: 'unassigned',
          name: '미지정',
          businessNo: '-',
          phone: '-',
          address: '-',
        },
        items: unassignedItems,
        totalWeight: unassignedWeight,
        totalAmount: unassignedAmount,
        pendingCount: unassignedPending,
        shippedCount: unassignedShipped,
      });
    }
    
    return result;
  }, [settlements, assignments, deliveryStatus]);
  
  // 필터링된 데이터
  const filteredDeliveries = useMemo(() => {
    return partnerDeliveries.filter(d => {
      if (partnerSearch) {
        const search = partnerSearch.toLowerCase();
        if (!d.partner.name.toLowerCase().includes(search)) {
          return false;
        }
      }
      if (statusFilter === 'pending' && d.pendingCount === 0) return false;
      if (statusFilter === 'shipped' && d.shippedCount === 0) return false;
      return true;
    }).map(d => {
      // 상태 필터에 따라 아이템 필터링
      if (statusFilter === 'all') return d;
      return {
        ...d,
        items: d.items.filter(item => item.status === statusFilter),
      };
    });
  }, [partnerDeliveries, partnerSearch, statusFilter]);
  
  // 거래처 펼치기/접기
  const togglePartner = (partnerId: string) => {
    setExpandedPartners(prev =>
      prev.includes(partnerId)
        ? prev.filter(p => p !== partnerId)
        : [...prev, partnerId]
    );
  };
  
  // 거래처 선택/해제
  const toggleSelectPartner = (partnerId: string) => {
    setSelectedPartners(prev =>
      prev.includes(partnerId)
        ? prev.filter(p => p !== partnerId)
        : [...prev, partnerId]
    );
  };
  
  // 전체 선택/해제
  const toggleSelectAll = () => {
    const selectablePartners = filteredDeliveries.filter(d => d.partner.id !== 'unassigned');
    if (selectedPartners.length === selectablePartners.length) {
      setSelectedPartners([]);
    } else {
      setSelectedPartners(selectablePartners.map(d => d.partner.id));
    }
  };
  
  // 출고 완료 처리
  const handleShipItem = (listingNo: string) => {
    const now = new Date();
    const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const newStatus = {
      ...deliveryStatus,
      [listingNo]: {
        listingNo,
        status: 'shipped' as const,
        shippedAt: nowStr,
        shippedBy: '관리자1',
      },
    };
    setDeliveryStatus(newStatus);
    saveDeliveryStatus(newStatus);
  };
  
  // 거래처 전체 출고 완료 처리
  const handleShipAll = (partnerId: string) => {
    const delivery = partnerDeliveries.find(d => d.partner.id === partnerId);
    if (!delivery) return;
    
    const now = new Date();
    const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const newStatus = { ...deliveryStatus };
    delivery.items.forEach(item => {
      if (item.status === 'pending') {
        newStatus[item.listingNo] = {
          listingNo: item.listingNo,
          status: 'shipped',
          shippedAt: nowStr,
          shippedBy: '관리자1',
        };
      }
    });
    setDeliveryStatus(newStatus);
    saveDeliveryStatus(newStatus);
  };
  
  // 출고지시서 인쇄
  const handlePrint = (partnerId?: string) => {
    const targetDeliveries = partnerId
      ? partnerDeliveries.filter(d => d.partner.id === partnerId)
      : partnerDeliveries.filter(d => selectedPartners.includes(d.partner.id));
    
    if (targetDeliveries.length === 0) {
      alert('인쇄할 거래처를 선택해주세요.');
      return;
    }
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>출고지시서</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: 'Malgun Gothic', sans-serif; font-size: 11px; }
            .page { page-break-after: always; padding: 10px; }
            .page:last-child { page-break-after: avoid; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .header h1 { font-size: 20px; margin: 0 0 10px 0; }
            .info { margin-bottom: 15px; }
            .info-row { display: flex; margin-bottom: 5px; }
            .info-label { width: 80px; font-weight: bold; }
            .info-value { flex: 1; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #333; padding: 6px 8px; text-align: center; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .total-row { font-weight: bold; background-color: #f9f9f9; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; }
          </style>
        </head>
        <body>
          ${targetDeliveries.map(delivery => `
            <div class="page">
              <div class="header">
                <h1>출 고 지 시 서</h1>
                <p>발행일: ${selectedDate}</p>
              </div>
              
              <div class="info">
                <div class="info-row">
                  <span class="info-label">거래처명:</span>
                  <span class="info-value">${delivery.partner.name}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">사업자번호:</span>
                  <span class="info-value">${delivery.partner.businessNo}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">연락처:</span>
                  <span class="info-value">${delivery.partner.phone}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">주소:</span>
                  <span class="info-value">${delivery.partner.address}</span>
                </div>
              </div>
              
              <table>
                <thead>
                  <tr>
                    <th style="width: 40px">No</th>
                    <th>중도매인</th>
                    <th>상장번호</th>
                    <th>부위</th>
                    <th>등급</th>
                    <th style="width: 70px">중량(kg)</th>
                    <th style="width: 80px">단가</th>
                    <th style="width: 100px">금액</th>
                  </tr>
                </thead>
                <tbody>
                  ${delivery.items.map((item, idx) => `
                    <tr>
                      <td>${idx + 1}</td>
                      <td class="text-left">${item.dealerName}</td>
                      <td>${item.listingNo}</td>
                      <td>${item.partName}</td>
                      <td>${item.grade}</td>
                      <td class="text-right">${item.weight.toFixed(1)}</td>
                      <td class="text-right">${item.unitPrice.toLocaleString()}</td>
                      <td class="text-right">${item.amount.toLocaleString()}</td>
                    </tr>
                  `).join('')}
                  <tr class="total-row">
                    <td colspan="5">합계 (${delivery.items.length}건)</td>
                    <td class="text-right">${delivery.totalWeight.toFixed(1)}</td>
                    <td></td>
                    <td class="text-right">${delivery.totalAmount.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
              
              <div class="footer">
                <p>HanuMuch - 출고지시서</p>
              </div>
            </div>
          `).join('')}
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };
  
  // 엑셀 다운로드
  const handleExcelDownload = () => {
    const data: Record<string, string | number>[] = [];
    
    filteredDeliveries.forEach(delivery => {
      delivery.items.forEach(item => {
        data.push({
          '거래처': delivery.partner.name,
          '사업자번호': delivery.partner.businessNo,
          '연락처': delivery.partner.phone,
          '주소': delivery.partner.address,
          '중도매인번호': item.dealerNo,
          '중도매인명': item.dealerName,
          '상장번호': item.listingNo,
          '부위': item.partName,
          '등급': item.grade,
          '중량(kg)': item.weight,
          '단가': item.unitPrice,
          '금액': item.amount,
          '상태': item.status === 'shipped' ? '출고완료' : '출고대기',
          '출고일시': item.shippedAt || '',
          '처리자': item.shippedBy || '',
        });
      });
    });
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '출고지시서');
    XLSX.writeFile(wb, `출고지시서_${selectedDate}.xlsx`);
  };
  
  // 테이블 스타일
  const thClass = 'px-2 py-1.5 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50';
  const tdClass = 'px-2 py-1.5 text-xs border border-gray-200';
  
  // 전체 통계
  const totalStats = useMemo(() => {
    let pending = 0;
    let shipped = 0;
    partnerDeliveries.forEach(d => {
      pending += d.pendingCount;
      shipped += d.shippedCount;
    });
    return { pending, shipped, total: pending + shipped };
  }, [partnerDeliveries]);
  
  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">출고지시서</h1>
        
        {/* 필터 */}
        <div className="bg-white p-4 border border-gray-200 mb-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600">출고일자</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 text-xs outline-none bg-white"
                style={{ colorScheme: 'light' }}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600">거래처</label>
              <input
                type="text"
                value={partnerSearch}
                onChange={(e) => setPartnerSearch(e.target.value)}
                placeholder="거래처명"
                className="px-2 py-1.5 border border-gray-300 text-xs outline-none bg-white w-32"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600">상태</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'shipped')}
                className="px-2 py-1.5 border border-gray-300 text-xs outline-none bg-white"
              >
                <option value="all">전체</option>
                <option value="pending">출고대기</option>
                <option value="shipped">출고완료</option>
              </select>
            </div>
            <div className="text-xs text-gray-600">
              출고: <span className="text-blue-600 font-semibold">{totalStats.shipped}</span>/{totalStats.total}
              <span className="ml-2 text-gray-400">
                (대기: {totalStats.pending})
              </span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => {
                  setPartnerSearch('');
                  setSelectedDate(todayStr);
                  setStatusFilter('all');
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
              <button
                type="button"
                onClick={() => handlePrint()}
                disabled={selectedPartners.length === 0}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-700 text-white text-xs hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer className="w-3.5 h-3.5" />
                선택 인쇄 ({selectedPartners.length})
              </button>
            </div>
          </div>
        </div>
        
        {/* 테이블 */}
        <div className="bg-white border border-gray-200">
          <table className="w-full border-collapse table-fixed">
            <thead>
              <tr>
                <th className={`${thClass} w-[40px]`}>
                  <input
                    type="checkbox"
                    checked={selectedPartners.length === filteredDeliveries.filter(d => d.partner.id !== 'unassigned').length && filteredDeliveries.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4"
                  />
                </th>
                <th className={`${thClass} w-[30px]`}></th>
                <th className={`${thClass} w-[100px]`}>거래처명</th>
                <th className={`${thClass} w-[100px]`}>연락처</th>
                <th className={`${thClass}`}>주소</th>
                <th className={`${thClass} w-[60px]`}>품목수</th>
                <th className={`${thClass} w-[80px]`}>중량(kg)</th>
                <th className={`${thClass} w-[100px]`}>금액</th>
                <th className={`${thClass} w-[80px]`}>출고상태</th>
                <th className={`${thClass} w-[100px]`}>관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeliveries.map((delivery) => {
                const isExpanded = expandedPartners.includes(delivery.partner.id);
                const isSelected = selectedPartners.includes(delivery.partner.id);
                const isUnassigned = delivery.partner.id === 'unassigned';
                const allShipped = delivery.pendingCount === 0;
                
                return (
                  <React.Fragment key={delivery.partner.id}>
                    <tr className={`hover:bg-gray-50 ${isUnassigned ? 'text-gray-400' : ''}`}>
                      <td className={`${tdClass} text-center`}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectPartner(delivery.partner.id)}
                          className="w-4 h-4"
                          disabled={isUnassigned}
                        />
                      </td>
                      <td className={`${tdClass} text-center`}>
                        <button
                          type="button"
                          onClick={() => togglePartner(delivery.partner.id)}
                          className="p-0.5 hover:bg-gray-100"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                      </td>
                      <td className={`${tdClass} font-medium ${isUnassigned ? 'text-red-400' : ''}`}>{delivery.partner.name}</td>
                      <td className={`${tdClass} text-center`}>{delivery.partner.phone}</td>
                      <td className={`${tdClass} truncate`}>{delivery.partner.address}</td>
                      <td className={`${tdClass} text-center`}>{delivery.items.length}건</td>
                      <td className={`${tdClass} text-right`}>{delivery.totalWeight.toFixed(1)}</td>
                      <td className={`${tdClass} text-right`}>{delivery.totalAmount.toLocaleString()}</td>
                      <td className={`${tdClass} text-center`}>
                        {allShipped ? (
                          <span className="text-blue-600">완료</span>
                        ) : (
                          <span className="text-gray-600">{delivery.shippedCount}/{delivery.items.length}</span>
                        )}
                      </td>
                      <td className={`${tdClass} text-center`}>
                        <div className="flex items-center justify-center gap-1">
                          {!isUnassigned && (
                            <>
                              <button
                                type="button"
                                onClick={() => handlePrint(delivery.partner.id)}
                                className="px-2 py-0.5 text-xs border border-gray-300 text-gray-600 hover:bg-gray-50"
                              >
                                인쇄
                              </button>
                              {!allShipped && (
                                <button
                                  type="button"
                                  onClick={() => handleShipAll(delivery.partner.id)}
                                  className="px-2 py-0.5 text-xs border border-gray-300 text-gray-600 hover:bg-gray-50"
                                >
                                  전체출고
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    
                    {/* 상세 펼침 */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={10} className="p-0 border border-gray-200">
                          <div className="bg-white p-3">
                            <table className="w-full border-collapse">
                              <thead>
                                <tr>
                                  <th className={thClass}>No</th>
                                  <th className={thClass}>중도매인</th>
                                  <th className={thClass}>상장번호</th>
                                  <th className={thClass}>부위</th>
                                  <th className={thClass}>등급</th>
                                  <th className={thClass}>중량(kg)</th>
                                  <th className={thClass}>단가</th>
                                  <th className={thClass}>금액</th>
                                  <th className={thClass}>상태</th>
                                  <th className={thClass}>출고일시</th>
                                  <th className={thClass}>관리</th>
                                </tr>
                              </thead>
                              <tbody>
                                {delivery.items.map((item, idx) => (
                                  <tr key={`${item.listingNo}-${idx}`} className="hover:bg-gray-50">
                                    <td className={`${tdClass} text-center`}>{idx + 1}</td>
                                    <td className={`${tdClass} text-center`}>{item.dealerName}</td>
                                    <td className={`${tdClass} text-center`}>{item.listingNo}</td>
                                    <td className={`${tdClass} text-center`}>{item.partName}</td>
                                    <td className={`${tdClass} text-center`}>{item.grade}</td>
                                    <td className={`${tdClass} text-right`}>{item.weight.toFixed(1)}</td>
                                    <td className={`${tdClass} text-right`}>{item.unitPrice.toLocaleString()}</td>
                                    <td className={`${tdClass} text-right`}>{item.amount.toLocaleString()}</td>
                                    <td className={`${tdClass} text-center`}>
                                      {item.status === 'shipped' ? (
                                        <span className="text-blue-600">출고완료</span>
                                      ) : (
                                        <span className="text-gray-600">출고대기</span>
                                      )}
                                    </td>
                                    <td className={`${tdClass} text-center text-gray-500`}>
                                      {item.shippedAt || '-'}
                                    </td>
                                    <td className={`${tdClass} text-center`}>
                                      {item.status === 'pending' ? (
                                        <button
                                          type="button"
                                          onClick={() => handleShipItem(item.listingNo)}
                                          className="px-2 py-0.5 text-xs border border-gray-300 text-gray-600 hover:bg-gray-50"
                                        >
                                          출고
                                        </button>
                                      ) : (
                                        <Check className="w-4 h-4 text-blue-600 mx-auto" />
                                      )}
                                    </td>
                                  </tr>
                                ))}
                                <tr className="font-semibold border-t-2 border-gray-300">
                                  <td className={tdClass} colSpan={5}>합계 ({delivery.items.length}건)</td>
                                  <td className={`${tdClass} text-right`}>{delivery.totalWeight.toFixed(1)}</td>
                                  <td className={tdClass}></td>
                                  <td className={`${tdClass} text-right`}>{delivery.totalAmount.toLocaleString()}</td>
                                  <td className={tdClass} colSpan={3}></td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              
              {filteredDeliveries.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-400 text-sm">
                    조회된 내역이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
            {/* 전체 합계 */}
            {filteredDeliveries.length > 0 && (
              <tfoot>
                <tr className="font-semibold border-t-2 border-gray-300">
                  <td className={tdClass} colSpan={5}>전체 합계 ({filteredDeliveries.length}개 거래처)</td>
                  <td className={`${tdClass} text-center`}>
                    {filteredDeliveries.reduce((sum, d) => sum + d.items.length, 0)}건
                  </td>
                  <td className={`${tdClass} text-right`}>
                    {filteredDeliveries.reduce((sum, d) => sum + d.totalWeight, 0).toFixed(1)}
                  </td>
                  <td className={`${tdClass} text-right`}>
                    {filteredDeliveries.reduce((sum, d) => sum + d.totalAmount, 0).toLocaleString()}
                  </td>
                  <td className={tdClass} colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
