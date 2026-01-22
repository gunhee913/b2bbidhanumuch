'use client';

import React, { useState, useMemo } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';

// 상장개체 타입
interface CattleItem {
  id: string;
  auctionNo: string;      // 상장번호
  traceNo: string;        // 이력번호
  company: string;        // 상장업체
  breed: string;          // 품종
  gender: string;         // 성별
  grade: string;          // 등급
  carcassWeight: number;  // 도체중
  slaughterDate: string;  // 도축일
  slaughterHouse: string; // 도축장
}

// 실제 이력번호 더미 데이터 (테스트용)
const generateCattleData = (): CattleItem[] => {
  const today = new Date();
  const dateCode = `${String(today.getFullYear()).slice(-2)}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  
  // 실제 조회 가능한 이력번호 샘플 데이터
  const items: CattleItem[] = [
    {
      id: '1',
      auctionNo: `${dateCode}-101`,
      traceNo: '002-1901-2635-6',
      company: '건화',
      breed: '한우',
      gender: '거세',
      grade: '1++A',
      carcassWeight: 498,
      slaughterDate: '26.01.16',
      slaughterHouse: '음성',
    },
    {
      id: '2',
      auctionNo: `${dateCode}-102`,
      traceNo: '002-1901-2826-1',
      company: '건화',
      breed: '한우',
      gender: '암',
      grade: '1+A',
      carcassWeight: 465,
      slaughterDate: '26.01.16',
      slaughterHouse: '음성',
    },
    {
      id: '3',
      auctionNo: `${dateCode}-201`,
      traceNo: '002-1896-1796-6',
      company: '대진엠에스',
      breed: '한우',
      gender: '거세',
      grade: '1++B',
      carcassWeight: 512,
      slaughterDate: '26.01.17',
      slaughterHouse: '음성',
    },
    {
      id: '4',
      auctionNo: `${dateCode}-202`,
      traceNo: '002-1910-9288-1',
      company: '대진엠에스',
      breed: '한우',
      gender: '암',
      grade: '1+B',
      carcassWeight: 478,
      slaughterDate: '26.01.17',
      slaughterHouse: '음성',
    },
  ];
  
  return items;
};

export default function CertificatesPage() {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  const [cattleData] = useState<CattleItem[]>(generateCattleData());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [companyFilter, setCompanyFilter] = useState('전체');
  const [searchTerm, setSearchTerm] = useState('');
  
  // 업체 목록
  const companies = useMemo(() => {
    const set = new Set(cattleData.map(c => c.company));
    return ['전체', ...Array.from(set)];
  }, [cattleData]);
  
  // 필터링된 데이터
  const filteredData = useMemo(() => {
    return cattleData.filter(item => {
      if (companyFilter !== '전체' && item.company !== companyFilter) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (!item.auctionNo.toLowerCase().includes(search) && 
            !item.traceNo.toLowerCase().includes(search)) {
          return false;
        }
      }
      return true;
    });
  }, [cattleData, companyFilter, searchTerm]);
  
  // 이력번호 정제 (하이픈 제거)
  const cleanTraceNo = (traceNo: string): string => {
    return traceNo.replace(/-/g, '');
  };
  
  // ekape 통합 검색 URL
  const getSearchUrl = (traceNo: string): string => {
    const clean = cleanTraceNo(traceNo);
    return `https://www.ekape.or.kr/kapecp/oneservicemng/oneSrvcMng/combineSearchOne.do?searchKeyword=${clean}`;
  };
  
  // ekape 통합 검색 열기
  const openSearch = (traceNo: string) => {
    window.open(getSearchUrl(traceNo), '_blank');
  };
  
  // 엑셀 다운로드
  const handleExcelDownload = () => {
    const data = filteredData.map(item => ({
      '상장번호': item.auctionNo,
      '이력번호': item.traceNo,
      '상장업체': item.company,
      '품종': item.breed,
      '성별': item.gender,
      '등급': item.grade,
      '도체중(kg)': item.carcassWeight,
      '도축일': item.slaughterDate,
      '도축장': item.slaughterHouse,
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '상장개체');
    XLSX.writeFile(wb, `상장개체_${selectedDate}.xlsx`);
  };
  
  // 테이블 스타일
  const thClass = 'px-3 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50';
  const tdClass = 'px-3 py-2 text-xs border border-gray-200';
  
  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">증명서 조회</h1>
        
        {/* 필터 */}
        <div className="bg-white p-4 border border-gray-200 mb-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600">조회일자</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 text-xs outline-none bg-white"
                style={{ colorScheme: 'light' }}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600">상장업체</label>
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 text-xs outline-none bg-white"
              >
                {companies.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600">검색</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="상장번호/이력번호"
                className="px-2 py-1.5 border border-gray-300 text-xs outline-none bg-white w-36"
              />
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => {
                  setCompanyFilter('전체');
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
            </div>
          </div>
        </div>
        
        {/* 테이블 */}
        <div className="bg-white border border-gray-200">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={`${thClass} w-[100px]`}>상장번호</th>
                <th className={`${thClass} w-[145px]`}>이력번호</th>
                <th className={`${thClass} w-[90px]`}>상장업체</th>
                <th className={`${thClass} w-[60px]`}>품종</th>
                <th className={`${thClass} w-[50px]`}>성별</th>
                <th className={`${thClass} w-[70px]`}>등급</th>
                <th className={`${thClass} w-[80px]`}>도체중(kg)</th>
                <th className={`${thClass} w-[80px]`}>도축일</th>
                <th className={`${thClass} w-[70px]`}>도축장</th>
                <th className={`${thClass} w-[80px]`}>조회</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className={`${tdClass} text-center font-medium`}>{item.auctionNo}</td>
                  <td className={`${tdClass} text-center`}>{item.traceNo}</td>
                  <td className={`${tdClass} text-center`}>{item.company}</td>
                  <td className={`${tdClass} text-center`}>{item.breed}</td>
                  <td className={`${tdClass} text-center`}>{item.gender}</td>
                  <td className={`${tdClass} text-center`}>{item.grade}</td>
                  <td className={`${tdClass} text-right`}>{item.carcassWeight}</td>
                  <td className={`${tdClass} text-center`}>{item.slaughterDate}</td>
                  <td className={`${tdClass} text-center`}>{item.slaughterHouse}</td>
                  <td className={`${tdClass} text-center`}>
                    <button
                      type="button"
                      onClick={() => openSearch(item.traceNo)}
                      className="px-3 py-0.5 text-xs border border-gray-300 text-gray-600 hover:bg-gray-50"
                    >
                      조회
                    </button>
                  </td>
                </tr>
              ))}
              
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-400 text-sm">
                    조회된 내역이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
      </div>
    </AdminLayout>
  );
}
