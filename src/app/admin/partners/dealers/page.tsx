'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { 
  Download,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import * as XLSX from 'xlsx';

// 거래처 마스터 타입
interface Partner {
  id: string;
  partnerNo: string;
  name: string;
  businessNo: string;
  representative: string;
  phone: string;
  address: string;
  businessType: string;
  status: 'active' | 'inactive';
  createdAt: string;
  dealer1: string;
  dealer2: string;
  dealer3: string;
}

// 중도매인 타입
interface Dealer {
  id: string;
  dealerNo: string;
  name: string;
}

// 중도매인 데이터
const initialDealers: Dealer[] = [
  { id: 'd1', dealerNo: '7000001', name: '김철수' },
  { id: 'd2', dealerNo: '7000002', name: '이영희' },
  { id: 'd3', dealerNo: '7000003', name: '박민수' },
  { id: 'd4', dealerNo: '7000004', name: '최지현' },
  { id: 'd5', dealerNo: '7000005', name: '정수민' },
];

// 거래처 마스터 데이터
const initialPartners: Partner[] = [
  { id: 'p1', partnerNo: '10001', name: '맛있는정육점', businessNo: '123-45-67890', representative: '홍길동', phone: '02-1234-5678', address: '서울시 강남구 역삼동 123-45', businessType: '일반정육점', status: 'active', createdAt: '2024-03-15', dealer1: 'd1', dealer2: '', dealer3: '' },
  { id: 'p2', partnerNo: '10002', name: '소고기천국', businessNo: '234-56-78901', representative: '이순신', phone: '02-2345-6789', address: '서울시 서초구 방배동 456-78', businessType: '음식점', status: 'active', createdAt: '2024-05-20', dealer1: 'd1', dealer2: 'd2', dealer3: '' },
  { id: 'p3', partnerNo: '10003', name: '신선마트', businessNo: '345-67-89012', representative: '강감찬', phone: '02-3456-7890', address: '서울시 송파구 잠실동 789-12', businessType: '마트', status: 'inactive', createdAt: '2024-06-10', dealer1: 'd1', dealer2: '', dealer3: '' },
  { id: 'p4', partnerNo: '10004', name: '한우명가', businessNo: '456-78-90123', representative: '김유신', phone: '031-1234-5678', address: '경기도 성남시 분당구 정자동 234-56', businessType: '음식점', status: 'active', createdAt: '2024-04-01', dealer1: 'd2', dealer2: 'd5', dealer3: '' },
  { id: 'p5', partnerNo: '10005', name: '프리미엄정육', businessNo: '567-89-01234', representative: '을지문덕', phone: '031-2345-6789', address: '경기도 용인시 수지구 동천동 567-89', businessType: '일반정육점', status: 'active', createdAt: '2024-07-15', dealer1: 'd2', dealer2: '', dealer3: '' },
  { id: 'p6', partnerNo: '10006', name: '고기굽는마을', businessNo: '678-90-12345', representative: '권율', phone: '043-1234-5678', address: '충북 음성군 음성읍 읍내리 123', businessType: '음식점', status: 'active', createdAt: '2024-08-20', dealer1: 'd3', dealer2: '', dealer3: '' },
  { id: 'p7', partnerNo: '10007', name: '육미정', businessNo: '789-01-23456', representative: '장보고', phone: '02-4567-8901', address: '서울시 마포구 상암동 890-12', businessType: '음식점', status: 'active', createdAt: '2024-09-01', dealer1: 'd5', dealer2: '', dealer3: '' },
  { id: 'p8', partnerNo: '10008', name: '한우촌', businessNo: '890-12-34567', representative: '최영', phone: '02-5678-9012', address: '서울시 영등포구 여의도동 345-67', businessType: '음식점', status: 'active', createdAt: '2024-09-15', dealer1: 'd5', dealer2: '', dealer3: '' },
  { id: 'p9', partnerNo: '10009', name: '신선정육', businessNo: '901-23-45678', representative: '이성계', phone: '02-6789-0123', address: '서울시 종로구 종로동 678-90', businessType: '일반정육점', status: 'inactive', createdAt: '2024-10-01', dealer1: 'd5', dealer2: '', dealer3: '' },
];

export default function PartnersDealersPage() {
  const [partners] = useState<Partner[]>(initialPartners);
  const [dealers] = useState<Dealer[]>(initialDealers);
  
  const [expandedDealers, setExpandedDealers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dealerFilter, setDealerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // 중도매인 펼치기/접기
  const toggleDealer = (dealerId: string) => {
    setExpandedDealers(prev =>
      prev.includes(dealerId)
        ? prev.filter(id => id !== dealerId)
        : [...prev, dealerId]
    );
  };

  // 중도매인별 연결된 거래처 가져오기
  const getPartnersForDealer = (dealerId: string) => {
    return partners.filter(p => 
      p.dealer1 === dealerId || p.dealer2 === dealerId || p.dealer3 === dealerId
    );
  };

  // 필터링된 중도매인 데이터
  const filteredData = dealers
    .filter(dealer => dealerFilter === 'all' || dealer.id === dealerFilter)
    .map(dealer => {
      const dealerPartners = getPartnersForDealer(dealer.id).filter(partner => {
        const matchSearch = searchTerm === '' || 
          partner.name.includes(searchTerm) || 
          partner.representative.includes(searchTerm);
        const matchStatus = statusFilter === 'all' || partner.status === statusFilter;
        return matchSearch && matchStatus;
      });
      return { ...dealer, partners: dealerPartners };
    })
    .filter(dealer => dealerFilter !== 'all' || dealer.partners.length > 0 || searchTerm === '');

  // 전체 연결 수
  const totalLinks = filteredData.reduce((acc, d) => acc + d.partners.length, 0);

  // 엑셀 다운로드
  const handleExcelDownload = () => {
    const excelData: Record<string, string | number>[] = [];
    filteredData.forEach(dealer => {
      dealer.partners.forEach(partner => {
        excelData.push({
          '중도매인번호': dealer.dealerNo,
          '중도매인명': dealer.name,
          '거래처번호': partner.partnerNo,
          '거래처명': partner.name,
          '사업자번호': partner.businessNo,
          '대표자': partner.representative,
          '연락처': partner.phone,
          '주소': partner.address,
          '거래처구분': partner.businessType,
          '등록일': partner.createdAt,
          '상태': partner.status === 'active' ? '활성' : '비활성',
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    worksheet['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 14 }, { wch: 10 },
      { wch: 14 }, { wch: 30 }, { wch: 10 }, { wch: 12 }, { wch: 8 }
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '중도매인별 거래처');
    
    const today = new Date();
    const fileName = `중도매인별거래처_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // 스타일
  const thClass = "px-3 py-2 text-xs font-medium text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50 text-center";
  const tdClass = "px-3 py-2 text-xs border border-gray-200 text-center whitespace-nowrap";

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">거래처 조회(중도매인별)</h1>
        <p className="text-sm text-gray-500 mt-1">중도매인별로 연결된 거래처를 조회합니다.</p>
      </div>

      {/* 필터 및 검색 */}
      <div className="bg-white border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* 중도매인 필터 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">중도매인</span>
            <select
              value={dealerFilter}
              onChange={(e) => setDealerFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white min-w-[140px]"
            >
              <option value="all">전체</option>
              {dealers.map(dealer => (
                <option key={dealer.id} value={dealer.id}>{dealer.name} ({dealer.dealerNo})</option>
              ))}
            </select>
          </div>

          {/* 상태 필터 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">상태</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
            >
              <option value="all">전체</option>
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
            </select>
          </div>

          {/* 검색 */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="거래처명, 대표자 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white w-48"
            />
          </div>

          {/* 버튼 그룹 */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setDealerFilter('all');
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
          </div>
        </div>
      </div>

      {/* 요약 정보 */}
      <div className="bg-white border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">총 연결</span>
            <span className="text-sm font-semibold text-gray-900">{totalLinks}건</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">중도매인</span>
            <span className="text-sm font-semibold text-gray-900">{filteredData.length}명</span>
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse table-fixed">
            <thead>
              <tr>
                <th className={thClass} style={{ width: '100px' }}>중도매인번호</th>
                <th className={thClass} style={{ width: '80px' }}>중도매인명</th>
                <th className={thClass} style={{ width: '70px' }}>거래처 수</th>
                <th className={thClass} style={{ width: '80px' }}>거래처번호</th>
                <th className={thClass} style={{ width: '140px' }}>거래처명</th>
                <th className={thClass} style={{ width: '120px' }}>사업자번호</th>
                <th className={thClass} style={{ width: '70px' }}>대표자</th>
                <th className={thClass} style={{ width: '110px' }}>연락처</th>
                <th className={thClass} style={{ width: '90px' }}>거래처구분</th>
                <th className={thClass} style={{ width: '90px' }}>등록일</th>
                <th className={thClass} style={{ width: '70px' }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((dealer) => (
                <React.Fragment key={dealer.id}>
                  {dealer.partners.length > 0 ? (
                    <>
                      {/* 첫 번째 거래처와 함께 표시 */}
                      <tr 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => toggleDealer(dealer.id)}
                      >
                        <td className={`${tdClass} bg-gray-50 font-medium`} rowSpan={expandedDealers.includes(dealer.id) ? dealer.partners.length : 1}>
                          <div className="flex items-center justify-center gap-1">
                            {expandedDealers.includes(dealer.id) ? (
                              <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                            )}
                            {dealer.dealerNo}
                          </div>
                        </td>
                        <td className={`${tdClass} bg-gray-50 font-medium`} rowSpan={expandedDealers.includes(dealer.id) ? dealer.partners.length : 1}>
                          {dealer.name}
                        </td>
                        <td className={`${tdClass} bg-gray-50`} rowSpan={expandedDealers.includes(dealer.id) ? dealer.partners.length : 1}>
                          {dealer.partners.length}개
                        </td>
                        {expandedDealers.includes(dealer.id) ? (
                          <>
                            <td className={tdClass}>{dealer.partners[0].partnerNo}</td>
                            <td className={`${tdClass} font-medium text-gray-900`}>{dealer.partners[0].name}</td>
                            <td className={tdClass}>{dealer.partners[0].businessNo}</td>
                            <td className={tdClass}>{dealer.partners[0].representative}</td>
                            <td className={tdClass}>{dealer.partners[0].phone}</td>
                            <td className={tdClass}>{dealer.partners[0].businessType}</td>
                            <td className={tdClass}>{dealer.partners[0].createdAt}</td>
                            <td className={tdClass}>{dealer.partners[0].status === 'active' ? '활성' : '비활성'}</td>
                          </>
                        ) : (
                          <td className={tdClass} colSpan={8}>
                            <span className="text-gray-400">클릭하여 거래처 목록 보기</span>
                          </td>
                        )}
                      </tr>
                      {/* 나머지 거래처 행들 */}
                      {expandedDealers.includes(dealer.id) && dealer.partners.slice(1).map((partner) => (
                        <tr key={partner.id} className="hover:bg-gray-50">
                          <td className={tdClass}>{partner.partnerNo}</td>
                          <td className={`${tdClass} font-medium text-gray-900`}>{partner.name}</td>
                          <td className={tdClass}>{partner.businessNo}</td>
                          <td className={tdClass}>{partner.representative}</td>
                          <td className={tdClass}>{partner.phone}</td>
                          <td className={tdClass}>{partner.businessType}</td>
                          <td className={tdClass}>{partner.createdAt}</td>
                          <td className={tdClass}>{partner.status === 'active' ? '활성' : '비활성'}</td>
                        </tr>
                      ))}
                    </>
                  ) : (
                    <tr className="hover:bg-gray-50">
                      <td className={`${tdClass} bg-gray-50 font-medium`}>{dealer.dealerNo}</td>
                      <td className={`${tdClass} bg-gray-50 font-medium`}>{dealer.name}</td>
                      <td className={`${tdClass} bg-gray-50`}>0개</td>
                      <td className={tdClass} colSpan={8}>
                        <span className="text-gray-400">등록된 거래처가 없습니다.</span>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
