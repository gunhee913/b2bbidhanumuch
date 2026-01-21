'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { 
  Download,
  Printer,
  MessageSquare,
  RotateCw,
  Save,
  Trash2,
  Eye,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  generateDealerSettlements, 
  BidPartDetail,
  DealerSettlementData 
} from '@/constants/dealerSettlement';

// 중도매인별 정산 데이터 타입 (호환성을 위해 유지)
interface DealerSettlement extends DealerSettlementData {}

// 전송 이력 타입
interface SmsHistory {
  id: string;
  sentAt: string;         // 전송 일시
  sentBy: string;         // 전송자
  senderNumber: string;   // 발신자 번호
  recipients: {
    dealerId: string;
    dealerName: string;
    dealerNo: string;
    phone: string;
    bidCount: number;
    totalAmount: number;
    status: 'success' | 'failed';
  }[];
  message: string;        // 전송 메시지 (템플릿)
  totalCount: number;     // 총 전송 수
  successCount: number;   // 성공 수
  failedCount: number;    // 실패 수
}

// 메시지 템플릿 타입
interface MessageTemplate {
  id: string;
  name: string;           // 템플릿 이름
  content: string;        // 템플릿 내용
  createdAt: string;      // 생성 일시
}

// 기본 템플릿 목록
const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: 'default-1',
    name: '기본 낙찰 안내',
    content: `[HanuMuch] {{dealerName}}님
{{date}} 낙찰 내역
- 낙찰건수: {{bidCount}}건
- 총 낙찰금액: {{totalAmount}}원
확인 바랍니다.`,
    createdAt: '2026-01-01 00:00:00',
  },
  {
    id: 'default-2',
    name: '간단 낙찰 안내',
    content: `[HanuMuch] {{dealerName}}님, {{date}} 낙찰 {{bidCount}}건 ({{totalAmount}}원) 확인 바랍니다.`,
    createdAt: '2026-01-01 00:00:00',
  },
  {
    id: 'default-3',
    name: '상세 낙찰 안내',
    content: `[HanuMuch] {{dealerName}}님 ({{dealerNo}})
{{date}} 경매 낙찰 내역을 안내드립니다.

▶ 낙찰 건수: {{bidCount}}건
▶ 총 낙찰금액: {{totalAmount}}원

금일 입금 확인 후 출고 예정입니다.
감사합니다.`,
    createdAt: '2026-01-01 00:00:00',
  },
];


export default function DealerSettlementsPage() {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  const [settlements] = useState<DealerSettlement[]>(generateDealerSettlements());
  const [dealerSearch, setDealerSearch] = useState('');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  // 문자 전송 모달 상태
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [selectedDealers, setSelectedDealers] = useState<string[]>([]);
  const [smsMessage, setSmsMessage] = useState('');
  const [senderNumber, setSenderNumber] = useState('010-1234-5678'); // 기본 발신자 번호
  const [smsSending, setSmsSending] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  
  // 전송 이력 관련 상태
  const [smsHistory, setSmsHistory] = useState<SmsHistory[]>([]);
  const [modalTab, setModalTab] = useState<'send' | 'history' | 'template'>('send');
  const [selectedHistory, setSelectedHistory] = useState<SmsHistory | null>(null);
  
  // 템플릿 관련 상태
  const [templates, setTemplates] = useState<MessageTemplate[]>(DEFAULT_TEMPLATES);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [showSaveTemplateForm, setShowSaveTemplateForm] = useState(false);
  
  // 개별 미리보기 관련 상태
  const [previewDealerId, setPreviewDealerId] = useState<string | null>(null);

  const filteredSettlements = settlements.filter(s => {
    if (!dealerSearch) return true;
    const searchLower = dealerSearch.toLowerCase();
    return s.dealerName.toLowerCase().includes(searchLower) || 
           s.dealerNo.includes(dealerSearch);
  });

  // 템플릿 변수를 실제 값으로 치환
  const applyTemplateVariables = (template: string, dealer: DealerSettlement) => {
    const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
    return template
      .replace(/\{\{dealerName\}\}/g, dealer.dealerName)
      .replace(/\{\{dealerNo\}\}/g, dealer.dealerNo)
      .replace(/\{\{date\}\}/g, dateStr)
      .replace(/\{\{bidCount\}\}/g, String(dealer.bidParts.length))
      .replace(/\{\{totalAmount\}\}/g, dealer.totalAmount.toLocaleString());
  };

  // 문자 메시지 템플릿 생성 (상세 낙찰 안내 템플릿 사용)
  const generateSmsTemplate = (dealer: DealerSettlement) => {
    return applyTemplateVariables(DEFAULT_TEMPLATES[2].content, dealer);
  };

  // 문자 전송 모달 열기
  const openSmsModal = () => {
    const dealerIds = filteredSettlements.map(s => s.id);
    setSelectedDealers(dealerIds);
    
    // 기본 템플릿 적용 (상세 낙찰 안내)
    setSmsMessage(DEFAULT_TEMPLATES[2].content);
    setShowSmsModal(true);
  };

  // 문자 전송 모달 닫기
  const closeSmsModal = () => {
    setShowSmsModal(false);
    setSelectedDealers([]);
    setSmsMessage('');
    setSmsSending(false);
    setSmsSent(false);
    setModalTab('send');
    setSelectedHistory(null);
    setShowSaveTemplateForm(false);
    setNewTemplateName('');
    setPreviewDealerId(null);
  };

  // 템플릿 적용
  const applyTemplate = (template: MessageTemplate) => {
    setSmsMessage(template.content);
    setModalTab('send');
  };

  // 현재 메시지를 템플릿으로 저장
  const saveAsTemplate = () => {
    if (!newTemplateName.trim()) {
      alert('템플릿 이름을 입력해주세요.');
      return;
    }
    
    const newTemplate: MessageTemplate = {
      id: `custom-${Date.now()}`,
      name: newTemplateName.trim(),
      content: smsMessage,
      createdAt: new Date().toLocaleString('ko-KR'),
    };
    
    setTemplates(prev => [...prev, newTemplate]);
    setShowSaveTemplateForm(false);
    setNewTemplateName('');
    alert('템플릿이 저장되었습니다.');
  };

  // 템플릿 삭제
  const deleteTemplate = (templateId: string) => {
    if (templateId.startsWith('default-')) {
      alert('기본 템플릿은 삭제할 수 없습니다.');
      return;
    }
    if (confirm('템플릿을 삭제하시겠습니까?')) {
      setTemplates(prev => prev.filter(t => t.id !== templateId));
    }
  };

  // 미리보기 메시지 생성
  const getPreviewMessage = (dealerId: string) => {
    const dealer = filteredSettlements.find(s => s.id === dealerId);
    if (!dealer) return '';
    return applyTemplateVariables(smsMessage, dealer);
  };

  // 중도매인 선택 토글
  const toggleDealerSelection = (dealerId: string) => {
    setSelectedDealers(prev => 
      prev.includes(dealerId) 
        ? prev.filter(id => id !== dealerId)
        : [...prev, dealerId]
    );
  };

  // 전체 선택/해제
  const toggleAllDealers = () => {
    if (selectedDealers.length === filteredSettlements.length) {
      setSelectedDealers([]);
    } else {
      setSelectedDealers(filteredSettlements.map(s => s.id));
    }
  };

  // 문자 전송
  const handleSendSms = () => {
    if (selectedDealers.length === 0) {
      alert('전송할 중도매인을 선택해주세요.');
      return;
    }

    setSmsSending(true);

    // 실제 전송 시뮬레이션 (콘솔 로그)
    const selectedSettlements = filteredSettlements.filter(s => selectedDealers.includes(s.id));
    console.log(`[SMS 발신번호] ${senderNumber}`);
    selectedSettlements.forEach(dealer => {
      const message = generateSmsTemplate(dealer);
      console.log(`[SMS 전송] ${dealer.dealerName} (${dealer.phone})`);
      console.log(message);
      console.log('---');
    });

    // 전송 이력 저장
    const now = new Date();
    const newHistory: SmsHistory = {
      id: `sms-${Date.now()}`,
      sentAt: `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`,
      sentBy: '관리자1',
      senderNumber: senderNumber,
      recipients: selectedSettlements.map(dealer => ({
        dealerId: dealer.id,
        dealerName: dealer.dealerName,
        dealerNo: dealer.dealerNo,
        phone: dealer.phone,
        bidCount: dealer.bidParts.length,
        totalAmount: dealer.totalAmount,
        status: Math.random() > 0.1 ? 'success' as const : 'failed' as const, // 90% 성공률 시뮬레이션
      })),
      message: smsMessage,
      totalCount: selectedSettlements.length,
      successCount: 0,
      failedCount: 0,
    };
    
    // 성공/실패 카운트 계산
    newHistory.successCount = newHistory.recipients.filter(r => r.status === 'success').length;
    newHistory.failedCount = newHistory.recipients.filter(r => r.status === 'failed').length;

    // 전송 완료 처리
    setTimeout(() => {
      setSmsHistory(prev => [newHistory, ...prev]);
      setSmsSending(false);
      setSmsSent(true);
      setTimeout(() => {
        closeSmsModal();
      }, 1500);
    }, 1000);
  };
  
  // 재전송 기능
  const handleResend = (history: SmsHistory) => {
    // 실패한 수신자만 선택
    const failedRecipients = history.recipients.filter(r => r.status === 'failed');
    if (failedRecipients.length === 0) {
      alert('재전송할 대상이 없습니다.');
      return;
    }
    
    // 실패한 수신자의 ID로 선택 상태 설정
    const failedDealerIds = failedRecipients.map(r => r.dealerId);
    setSelectedDealers(failedDealerIds);
    setSmsMessage(history.message);
    setModalTab('send');
    setSelectedHistory(null);
  };

  // 문자 글자 수 계산
  const getSmsInfo = () => {
    const length = smsMessage.length;
    if (length <= 90) {
      return { type: 'SMS', count: length, max: 90 };
    } else {
      return { type: 'LMS', count: length, max: 2000 };
    }
  };

  const handleExcelDownload = () => {
    const excelData: Record<string, string | number>[] = [];
    
    filteredSettlements.forEach(settlement => {
      settlement.bidParts.forEach(part => {
        excelData.push({
          '중도매인번호': settlement.dealerNo,
          '중도매인명': settlement.dealerName,
          '연락처': settlement.phone,
          '상장번호': part.listingNo,
          '부위': part.partName,
          '상장업체': part.companyName,
          '등급': part.grade,
          '중량': part.weight,
          '낙찰단가': part.unitPrice,
          '낙찰금액': part.amount,
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '낙찰서(중도매인별)');
    
    const fileName = `낙찰서_중도매인별_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // 인쇄 기능
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const totalAmount = filteredSettlements.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalParts = filteredSettlements.reduce((sum, s) => sum + s.bidParts.length, 0);

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>낙찰서(중도매인별)</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Malgun Gothic', sans-serif; padding: 8px 15px; font-size: 9px; }
          h1 { text-align: center; margin-bottom: 8px; font-size: 14px; }
          .main-header { display: flex; justify-content: space-between; margin-bottom: 8px; padding-bottom: 5px; border-bottom: 1px solid #333; font-size: 9px; }
          .summary { text-align: right; }
          .summary p { margin: 1px 0; }
          .dealer-section { margin-bottom: 15px; }
          .dealer-header { background: #f0f0f0; padding: 4px 8px; margin-bottom: 5px; font-weight: bold; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
          th, td { border: 1px solid #ccc; padding: 2px 4px; text-align: center; font-size: 8px; }
          th { background: #f5f5f5; font-weight: 600; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .subtotal-row { border-top: 2px solid #333; font-weight: 600; }
          @media print {
            @page { size: A4; margin: 5mm; }
            body { padding: 0; }
            .dealer-section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <h1>낙 찰 서 (중도매인별)</h1>
        <div class="main-header">
          <div>
            <p>정산일: ${new Date().toLocaleDateString('ko-KR')}</p>
            <p>중도매인: ${filteredSettlements.map(s => `${s.dealerName}(${s.dealerNo})`).join(', ')}</p>
          </div>
          <div class="summary">
            <p>총 ${totalParts}건</p>
            <p class="font-bold">낙찰금액: ${totalAmount.toLocaleString()}원</p>
          </div>
        </div>
        
        ${filteredSettlements.map(settlement => `
          <div class="dealer-section">
            <div class="dealer-header">${settlement.dealerName} (${settlement.dealerNo}) - 낙찰금액: ${settlement.totalAmount.toLocaleString()}원</div>
            <table>
              <thead>
                <tr>
                  <th>상장번호</th>
                  <th>부위</th>
                  <th>상장업체</th>
                  <th>등급</th>
                  <th>중량</th>
                  <th>낙찰단가</th>
                  <th>낙찰금액</th>
                </tr>
              </thead>
              <tbody>
                ${settlement.bidParts.map(part => `
                  <tr>
                    <td>${part.listingNo}</td>
                    <td>${part.partName}</td>
                    <td>${part.companyName}</td>
                    <td>${part.grade}</td>
                    <td class="text-right">${part.weight.toFixed(1)}</td>
                    <td class="text-right">${part.unitPrice.toLocaleString()}</td>
                    <td class="text-right">${part.amount.toLocaleString()}</td>
                  </tr>
                `).join('')}
                <tr class="subtotal-row">
                  <td colspan="4">${settlement.dealerName} 소계 (${settlement.bidParts.length}건)</td>
                  <td class="text-right">${settlement.totalWeight.toFixed(1)}</td>
                  <td></td>
                  <td class="text-right">${settlement.totalAmount.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        `).join('')}
        
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const thClass = "px-2 py-1.5 text-xs font-medium text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50 text-center";
  const tdClass = "px-2 py-1.5 text-xs border border-gray-200 text-center whitespace-nowrap";

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">낙찰서(중도매인별)</h1>
      </div>

      {/* 필터 */}
      <div className="bg-white shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
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

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => {
                setDealerSearch('');
                setStartDate(todayStr);
                setEndDate(todayStr);
              }}
              className="px-4 py-1.5 border border-gray-300 text-gray-600 text-xs hover:bg-gray-50"
            >
              초기화
            </button>
            <button
              type="button"
              onClick={handleExcelDownload}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-600 text-white text-xs hover:bg-gray-700"
            >
              <Download className="w-3.5 h-3.5" />
              엑셀
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-700 text-white text-xs hover:bg-gray-800"
            >
              <Printer className="w-3.5 h-3.5" />
              인쇄
            </button>
            <button
              type="button"
              onClick={openSmsModal}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-700 text-white text-xs hover:bg-gray-800"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              문자 전송
            </button>
          </div>
        </div>
      </div>

      {/* 낙찰서 테이블 */}
      <div className="bg-white shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full border-collapse table-fixed">
          <thead className="sticky top-0">
            <tr>
              <th className={`${thClass} w-[70px]`}>중도매인번호</th>
              <th className={`${thClass} w-[70px]`}>중도매인명</th>
              <th className={`${thClass} w-[120px]`}>상장번호</th>
              <th className={`${thClass} w-[80px]`}>부위</th>
              <th className={`${thClass} w-[90px]`}>상장업체</th>
              <th className={`${thClass} w-[60px]`}>등급</th>
              <th className={`${thClass} w-[60px]`}>중량</th>
              <th className={`${thClass} w-[80px]`}>낙찰단가</th>
              <th className={`${thClass} w-[90px]`}>낙찰금액</th>
              <th className={`${thClass} w-[80px]`}>수수료</th>
              <th className={`${thClass} w-[100px]`}>지급액</th>
            </tr>
          </thead>
          <tbody>
            {filteredSettlements.map((settlement, sIdx) => (
              <React.Fragment key={settlement.id}>
                {/* 부위별 행 */}
                {settlement.bidParts.map((part, partIdx) => (
                  <tr key={`${settlement.id}-${partIdx}`} className="hover:bg-gray-50">
                    <td className={tdClass}>{partIdx === 0 ? settlement.dealerNo : ''}</td>
                    <td className={tdClass}>{partIdx === 0 ? settlement.dealerName : ''}</td>
                    <td className={`${tdClass} text-[10px] text-gray-600`}>{part.listingNo}</td>
                    <td className={tdClass}>{part.partName}</td>
                    <td className={tdClass}>{part.companyName}</td>
                    <td className={tdClass}>{part.grade}</td>
                    <td className={`${tdClass} text-right`}>{part.weight.toFixed(1)}</td>
                    <td className={`${tdClass} text-right`}>{part.unitPrice.toLocaleString()}</td>
                    <td className={`${tdClass} text-right`}>{part.amount.toLocaleString()}</td>
                    <td className={`${tdClass} text-gray-400`}>{partIdx === 0 ? '-' : ''}</td>
                    <td className={`${tdClass} text-right font-semibold`}>
                      {partIdx === 0 ? settlement.netPayment.toLocaleString() : ''}
                    </td>
                  </tr>
                ))}
                {/* 중도매인별 소계 */}
                <tr className="font-semibold border-t-2 border-gray-300">
                  <td className={`${tdClass} text-left`} colSpan={3}>{settlement.dealerName} 소계 ({settlement.bidParts.length}건)</td>
                  <td className={tdClass} colSpan={3}></td>
                  <td className={`${tdClass} text-right`}>{settlement.totalWeight.toFixed(1)}</td>
                  <td className={tdClass}></td>
                  <td className={`${tdClass} text-right`}>{settlement.totalAmount.toLocaleString()}</td>
                  <td className={`${tdClass} text-gray-400`}>-</td>
                  <td className={`${tdClass} text-right`}>{settlement.netPayment.toLocaleString()}</td>
                </tr>
                {/* 중도매인 구분선 */}
                {sIdx < filteredSettlements.length - 1 && (
                  <tr>
                    <td colSpan={11} className="h-2 bg-gray-100"></td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {/* 전체 합계 */}
            <tr className="font-bold border-t-2 border-gray-400">
              <td className={`${tdClass} text-left`} colSpan={3}>
                전체 합계 ({filteredSettlements.reduce((sum, s) => sum + s.bidParts.length, 0)}건)
              </td>
              <td className={tdClass} colSpan={3}></td>
              <td className={`${tdClass} text-right`}>
                {filteredSettlements.reduce((sum, s) => sum + s.totalWeight, 0).toFixed(1)}
              </td>
              <td className={tdClass}></td>
              <td className={`${tdClass} text-right`}>
                {filteredSettlements.reduce((sum, s) => sum + s.totalAmount, 0).toLocaleString()}
              </td>
              <td className={`${tdClass} text-gray-400`}>-</td>
              <td className={`${tdClass} text-right`}>
                {filteredSettlements.reduce((sum, s) => sum + s.netPayment, 0).toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 문자 전송 모달 */}
      {showSmsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white w-[700px] h-[80vh] flex flex-col">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">문자 전송</h3>
              <button
                onClick={closeSmsModal}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* 탭 메뉴 */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => { setModalTab('send'); setSelectedHistory(null); setPreviewDealerId(null); }}
                className={`flex-1 py-2.5 text-sm font-medium ${
                  modalTab === 'send' 
                    ? 'text-gray-900 border-b-2 border-gray-900' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                문자 전송
              </button>
              <button
                onClick={() => { setModalTab('template'); setPreviewDealerId(null); }}
                className={`flex-1 py-2.5 text-sm font-medium ${
                  modalTab === 'template' 
                    ? 'text-gray-900 border-b-2 border-gray-900' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                템플릿
              </button>
              <button
                onClick={() => { setModalTab('history'); setPreviewDealerId(null); }}
                className={`flex-1 py-2.5 text-sm font-medium ${
                  modalTab === 'history' 
                    ? 'text-gray-900 border-b-2 border-gray-900' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                전송 이력 {smsHistory.length > 0 && `(${smsHistory.length})`}
              </button>
            </div>

            {/* 모달 본문 */}
            <div 
              className="flex-1 overflow-y-auto p-4 space-y-4"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent' }}
            >
              {modalTab === 'send' ? (
                <>
                  {/* 발신자 번호 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">발신자 번호</label>
                    <input
                      type="text"
                      value={senderNumber}
                      onChange={(e) => {
                        // 숫자와 하이픈만 허용
                        const value = e.target.value.replace(/[^0-9-]/g, '');
                        setSenderNumber(value);
                      }}
                      placeholder="010-0000-0000"
                      className="w-48 px-3 py-2 border border-gray-200 text-sm outline-none bg-white"
                    />
                  </div>

                  {/* 수신자 선택 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        수신자 ({selectedDealers.length}/{filteredSettlements.length}명)
                      </label>
                      <button
                        type="button"
                        onClick={toggleAllDealers}
                        className="text-xs text-gray-600 hover:text-gray-800"
                      >
                        {selectedDealers.length === filteredSettlements.length ? '전체 해제' : '전체 선택'}
                      </button>
                    </div>
                    <div 
                      className="border border-gray-200 max-h-40 overflow-y-auto overflow-x-hidden"
                      style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent' }}
                    >
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                            <th className="px-2 py-1.5 text-center w-10 border-b border-gray-200 bg-gray-50">
                              <div className="relative inline-flex items-center justify-center w-4 h-4 overflow-hidden">
                                <input
                                  type="checkbox"
                                  checked={selectedDealers.length === filteredSettlements.length && filteredSettlements.length > 0}
                                  onChange={toggleAllDealers}
                                  className="w-4 h-4 rounded appearance-none bg-white border border-gray-300 checked:bg-gray-700 checked:border-gray-700"
                                />
                                {selectedDealers.length === filteredSettlements.length && filteredSettlements.length > 0 && (
                                  <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold pointer-events-none">✓</span>
                                )}
                              </div>
                            </th>
                            <th className="px-2 py-1.5 text-left border-b border-gray-200">중도매인</th>
                            <th className="px-2 py-1.5 text-left border-b border-gray-200">연락처</th>
                            <th className="px-2 py-1.5 text-right border-b border-gray-200">낙찰건수</th>
                            <th className="px-2 py-1.5 text-right border-b border-gray-200">낙찰금액</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSettlements.map(dealer => (
                            <tr
                              key={dealer.id}
                              className={`hover:bg-gray-50 cursor-pointer ${
                                selectedDealers.includes(dealer.id) ? 'bg-gray-50' : ''
                              }`}
                              onClick={() => toggleDealerSelection(dealer.id)}
                            >
                              <td className="px-2 py-1.5 text-center">
                                <div className="relative inline-flex items-center justify-center w-4 h-4 overflow-hidden">
                                  <input
                                    type="checkbox"
                                    checked={selectedDealers.includes(dealer.id)}
                                    onChange={() => toggleDealerSelection(dealer.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-4 h-4 rounded appearance-none bg-white border border-gray-300 checked:bg-gray-700 checked:border-gray-700"
                                  />
                                  {selectedDealers.includes(dealer.id) && (
                                    <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold pointer-events-none">✓</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-2 py-1.5">{dealer.dealerName}</td>
                              <td className="px-2 py-1.5 text-gray-600">{dealer.phone}</td>
                              <td className="px-2 py-1.5 text-right">{dealer.bidParts.length}건</td>
                              <td className="px-2 py-1.5 text-right">{dealer.totalAmount.toLocaleString()}원</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 메시지 작성 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">메시지 내용 (템플릿)</label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {getSmsInfo().type} ({getSmsInfo().count}/{getSmsInfo().max}자)
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowSaveTemplateForm(!showSaveTemplateForm)}
                          className="text-xs text-gray-600 hover:text-gray-800 flex items-center gap-1"
                        >
                          <Save className="w-3 h-3" />
                          템플릿 저장
                        </button>
                      </div>
                    </div>
                    
                    {/* 템플릿 저장 폼 */}
                    {showSaveTemplateForm && (
                      <div className="flex items-center gap-2 mb-2 p-2 bg-gray-50 border border-gray-200">
                        <input
                          type="text"
                          value={newTemplateName}
                          onChange={(e) => setNewTemplateName(e.target.value)}
                          placeholder="템플릿 이름 입력"
                          className="flex-1 px-2 py-1 text-xs border border-gray-200 outline-none bg-white"
                        />
                        <button
                          onClick={saveAsTemplate}
                          className="px-2 py-1 text-xs bg-gray-700 text-white hover:bg-gray-800"
                        >
                          저장
                        </button>
                        <button
                          onClick={() => { setShowSaveTemplateForm(false); setNewTemplateName(''); }}
                          className="px-2 py-1 text-xs border border-gray-300 text-gray-600 hover:bg-gray-100"
                        >
                          취소
                        </button>
                      </div>
                    )}
                    
                    <textarea
                      value={smsMessage}
                      onChange={(e) => setSmsMessage(e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-200 text-sm outline-none resize-none font-mono bg-white"
                      placeholder="메시지를 입력하세요"
                    />
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-500">
                        * 변수: {`{{dealerName}}`}, {`{{dealerNo}}`}, {`{{date}}`}, {`{{bidCount}}`}, {`{{totalAmount}}`}
                      </p>
                    </div>
                  </div>

                  {/* 개별 미리보기 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">개별 미리보기</label>
                      {previewDealerId && (
                        <button
                          onClick={() => setPreviewDealerId(null)}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          닫기
                        </button>
                      )}
                    </div>
                    
                    {previewDealerId ? (
                      <div className="bg-gray-50 border border-gray-200 p-3">
                        <div className="text-xs text-gray-500 mb-2">
                          {filteredSettlements.find(s => s.id === previewDealerId)?.dealerName} ({filteredSettlements.find(s => s.id === previewDealerId)?.phone})
                        </div>
                        <div className="text-sm whitespace-pre-wrap bg-white p-2 border border-gray-100">
                          {getPreviewMessage(previewDealerId)}
                        </div>
                      </div>
                    ) : (
                      <div className="border border-gray-200">
                        <div className="flex flex-wrap gap-1 p-2">
                          {selectedDealers.slice(0, 10).map(dealerId => {
                            const dealer = filteredSettlements.find(s => s.id === dealerId);
                            return dealer ? (
                              <button
                                key={dealerId}
                                onClick={() => setPreviewDealerId(dealerId)}
                                className="px-2 py-1 text-xs border border-gray-200 hover:bg-gray-50 flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                {dealer.dealerName}
                              </button>
                            ) : null;
                          })}
                          {selectedDealers.length > 10 && (
                            <span className="px-2 py-1 text-xs text-gray-500">
                              외 {selectedDealers.length - 10}명
                            </span>
                          )}
                          {selectedDealers.length === 0 && (
                            <span className="text-xs text-gray-400 p-1">수신자를 선택하세요</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : modalTab === 'template' ? (
                <>
                  {/* 템플릿 목록 */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">메시지 템플릿 목록</h4>
                    <div className="space-y-2">
                      {templates.map(template => (
                        <div
                          key={template.id}
                          className="border border-gray-200 p-3 hover:bg-gray-50"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">{template.name}</span>
                              {template.id.startsWith('default-') && (
                                <span className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-500">기본</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => applyTemplate(template)}
                                className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1 border border-gray-200 hover:bg-gray-100"
                              >
                                적용
                              </button>
                              {!template.id.startsWith('default-') && (
                                <button
                                  onClick={() => deleteTemplate(template.id)}
                                  className="text-xs text-red-600 hover:text-red-700 p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          <div 
                            className="text-xs text-gray-600 whitespace-pre-wrap bg-white p-2 border border-gray-100 max-h-24 overflow-y-auto font-mono"
                            style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent' }}
                          >
                            {template.content}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-1">
                            생성: {template.createdAt}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 변수 설명 */}
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">사용 가능한 변수</h4>
                    <div className="bg-gray-50 p-3 border border-gray-200">
                      <table className="w-full text-xs">
                        <tbody>
                          <tr className="border-b border-gray-100">
                            <td className="py-1.5 font-mono text-gray-800">{`{{dealerName}}`}</td>
                            <td className="py-1.5 text-gray-600">중도매인 이름</td>
                            <td className="py-1.5 text-gray-500">예: 김철수</td>
                          </tr>
                          <tr className="border-b border-gray-100">
                            <td className="py-1.5 font-mono text-gray-800">{`{{dealerNo}}`}</td>
                            <td className="py-1.5 text-gray-600">중도매인 번호</td>
                            <td className="py-1.5 text-gray-500">예: D001</td>
                          </tr>
                          <tr className="border-b border-gray-100">
                            <td className="py-1.5 font-mono text-gray-800">{`{{date}}`}</td>
                            <td className="py-1.5 text-gray-600">오늘 날짜</td>
                            <td className="py-1.5 text-gray-500">예: 2026.01.21</td>
                          </tr>
                          <tr className="border-b border-gray-100">
                            <td className="py-1.5 font-mono text-gray-800">{`{{bidCount}}`}</td>
                            <td className="py-1.5 text-gray-600">낙찰 건수</td>
                            <td className="py-1.5 text-gray-500">예: 5</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 font-mono text-gray-800">{`{{totalAmount}}`}</td>
                            <td className="py-1.5 text-gray-600">총 낙찰금액</td>
                            <td className="py-1.5 text-gray-500">예: 1,500,000</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* 전송 이력 목록 */}
                  {selectedHistory ? (
                    // 상세 보기
                    <div>
                      <button
                        onClick={() => setSelectedHistory(null)}
                        className="text-sm text-gray-600 hover:text-gray-800 mb-3 flex items-center gap-1"
                      >
                        ← 목록으로
                      </button>
                      
                      <div className="border border-gray-200 p-3 mb-4">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-gray-500">전송 일시</div>
                          <div>{selectedHistory.sentAt}</div>
                          <div className="text-gray-500">전송자</div>
                          <div>{selectedHistory.sentBy}</div>
                          <div className="text-gray-500">발신자 번호</div>
                          <div>{selectedHistory.senderNumber}</div>
                          <div className="text-gray-500">전송 결과</div>
                          <div>
                            성공 {selectedHistory.successCount}건 / 실패 {selectedHistory.failedCount}건
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">전송 메시지</h4>
                        <div className="bg-gray-50 p-3 text-sm whitespace-pre-wrap border border-gray-200">
                          {selectedHistory.message}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">수신자 목록</h4>
                        <div 
                          className="border border-gray-200 max-h-48 overflow-y-auto"
                          style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent' }}
                        >
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                <th className="px-2 py-1.5 text-left border-b border-gray-200">중도매인</th>
                                <th className="px-2 py-1.5 text-left border-b border-gray-200">연락처</th>
                                <th className="px-2 py-1.5 text-right border-b border-gray-200">낙찰건수</th>
                                <th className="px-2 py-1.5 text-right border-b border-gray-200">낙찰금액</th>
                                <th className="px-2 py-1.5 text-center border-b border-gray-200">상태</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedHistory.recipients.map((r, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-2 py-1.5">{r.dealerName}</td>
                                  <td className="px-2 py-1.5 text-gray-600">{r.phone}</td>
                                  <td className="px-2 py-1.5 text-right">{r.bidCount}건</td>
                                  <td className="px-2 py-1.5 text-right">{r.totalAmount.toLocaleString()}원</td>
                                  <td className="px-2 py-1.5 text-center">
                                    {r.status === 'success' ? (
                                      <span className="text-gray-700">성공</span>
                                    ) : (
                                      <span className="text-red-600">실패</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* 재전송 버튼 (실패건이 있을 때만) */}
                      {selectedHistory.failedCount > 0 && (
                        <div className="mt-4">
                          <button
                            onClick={() => handleResend(selectedHistory)}
                            className="flex items-center gap-1 px-4 py-2 text-sm bg-gray-700 text-white hover:bg-gray-800"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                            실패 {selectedHistory.failedCount}건 재전송
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    // 목록 보기
                    <div>
                      {smsHistory.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">
                          전송 이력이 없습니다.
                        </div>
                      ) : (
                        <div className="border border-gray-200">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left border-b border-gray-200">전송 일시</th>
                                <th className="px-3 py-2 text-left border-b border-gray-200">전송자</th>
                                <th className="px-3 py-2 text-center border-b border-gray-200">전송 수</th>
                                <th className="px-3 py-2 text-center border-b border-gray-200">성공</th>
                                <th className="px-3 py-2 text-center border-b border-gray-200">실패</th>
                                <th className="px-3 py-2 text-center border-b border-gray-200">상세</th>
                              </tr>
                            </thead>
                            <tbody>
                              {smsHistory.map(history => (
                                <tr key={history.id} className="hover:bg-gray-50 border-b border-gray-100">
                                  <td className="px-3 py-2">{history.sentAt}</td>
                                  <td className="px-3 py-2">{history.sentBy}</td>
                                  <td className="px-3 py-2 text-center">{history.totalCount}건</td>
                                  <td className="px-3 py-2 text-center text-gray-700">{history.successCount}건</td>
                                  <td className="px-3 py-2 text-center">
                                    {history.failedCount > 0 ? (
                                      <span className="text-red-600">{history.failedCount}건</span>
                                    ) : (
                                      <span className="text-gray-400">0건</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <button
                                      onClick={() => setSelectedHistory(history)}
                                      className="text-gray-600 hover:text-gray-800 underline"
                                    >
                                      보기
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 모달 푸터 */}
            {modalTab === 'send' && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  {selectedDealers.length}명에게 전송
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={closeSmsModal}
                    className="px-4 py-2 text-sm border border-gray-300 text-gray-600 hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSendSms}
                    disabled={smsSending || smsSent || selectedDealers.length === 0}
                    className="px-4 py-2 text-sm bg-gray-700 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {smsSending ? '전송 중...' : smsSent ? '전송 완료!' : '전송'}
                  </button>
                </div>
              </div>
            )}
            
            {/* 템플릿 탭일 때 닫기 버튼 */}
            {modalTab === 'template' && (
              <div className="flex items-center justify-end px-4 py-3 border-t border-gray-200">
                <button
                  onClick={closeSmsModal}
                  className="px-4 py-2 text-sm border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  닫기
                </button>
              </div>
            )}
            
            {/* 이력 탭일 때 닫기 버튼 */}
            {modalTab === 'history' && !selectedHistory && (
              <div className="flex items-center justify-end px-4 py-3 border-t border-gray-200">
                <button
                  onClick={closeSmsModal}
                  className="px-4 py-2 text-sm border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  닫기
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
