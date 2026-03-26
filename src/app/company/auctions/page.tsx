'use client';

import React, { useState, useRef, useMemo } from 'react';
import CompanyLayout from '@/components/company/CompanyLayout';
import { 
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Download,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useSession } from 'next-auth/react';
import { useListings } from '@/features/listings/hooks';
import { CattleListing, CattlePart, STATUS_LABELS, CertificateData } from '@/features/listings/types';
import PhotoModal from '@/features/listings/components/PhotoModal';

// number input 스피너 숨기기 스타일
const hideSpinnerStyle = `
  input[type="number"]::-webkit-outer-spin-button,
  input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type="number"] {
    -moz-appearance: textfield;
  }
`;

// 부위 데이터 타입
interface PartData {
  id: number;
  name: string;
  weight: number;
  minPrice: number;
  bidPrice: number | null;
  isIncluded: boolean;
}

// 기본 부위 데이터 생성
const createDefaultParts = (): PartData[] => [
  { id: 1, name: '등심(좌)', weight: 15.2, minPrice: 85000, bidPrice: null, isIncluded: true },
  { id: 2, name: '등심(우)', weight: 15.3, minPrice: 85000, bidPrice: null, isIncluded: true },
  { id: 3, name: '안심', weight: 4.5, minPrice: 95000, bidPrice: null, isIncluded: true },
  { id: 4, name: '채끝', weight: 8.2, minPrice: 82000, bidPrice: null, isIncluded: true },
  { id: 5, name: '치마', weight: 4.0, minPrice: 65000, bidPrice: null, isIncluded: true },
  { id: 6, name: '부채', weight: 3.0, minPrice: 60000, bidPrice: null, isIncluded: true },
  { id: 7, name: '업진', weight: 4.5, minPrice: 55000, bidPrice: null, isIncluded: true },
  { id: 8, name: '토시·제비', weight: 2.0, minPrice: 70000, bidPrice: null, isIncluded: true },
  { id: 9, name: '설도(좌)', weight: 16.5, minPrice: 56000, bidPrice: null, isIncluded: true },
  { id: 10, name: '설도(우)', weight: 16.8, minPrice: 56000, bidPrice: null, isIncluded: true },
  { id: 11, name: '앞다리', weight: 25.4, minPrice: 55000, bidPrice: null, isIncluded: true },
  { id: 12, name: '우둔', weight: 21.7, minPrice: 58000, bidPrice: null, isIncluded: true },
  { id: 13, name: '목심', weight: 14.0, minPrice: 62000, bidPrice: null, isIncluded: true },
  { id: 14, name: '양지(좌)', weight: 12.2, minPrice: 52000, bidPrice: null, isIncluded: true },
  { id: 15, name: '양지(우)', weight: 12.4, minPrice: 52000, bidPrice: null, isIncluded: true },
  { id: 16, name: '사태', weight: 15.1, minPrice: 48000, bidPrice: null, isIncluded: true },
  { id: 17, name: '꼬리', weight: 16.2, minPrice: 35000, bidPrice: null, isIncluded: true },
  { id: 18, name: '족', weight: 10.9, minPrice: 25000, bidPrice: null, isIncluded: true },
  { id: 19, name: '사골', weight: 3.1, minPrice: 20000, bidPrice: null, isIncluded: true },
  { id: 20, name: '잡뼈', weight: 21.5, minPrice: 15000, bidPrice: null, isIncluded: true },
];

// 상태 타입 및 옵션
type AuctionStatus = '대기' | '승인' | '마감';

// 경매 데이터 타입
interface Auction {
  id: string;
  auctionNo: string;
  breed: string;
  gender: string;
  grade: string;
  monthAge: number;
  backFat: number;
  eyeMuscle: number;
  fatMarbling: number;
  meatColor: number;
  fatColor: number;
  texture: number;
  maturity: number;
  traceNo: string;
  slaughterHouse: string;
  slaughterDate: string;
  slaughterNo: string;
  carcassWeight: number;
  company: string;
  processDate: string;
  processWeight: number;
  status: AuctionStatus;
  parts: PartData[];
  images: string[];
  slaughterCert: CertificateData | null;
  gradeCert: CertificateData | null;
}

// 오늘 날짜 문자열 (YYYY-MM-DD) - input date용
const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const todayDateString = getTodayDateString();

// 등급 포맷팅 함수 (1++등급에 근내지방 점수 추가)
const formatGrade = (grade: string, marblingScore: number | null): string => {
  if (!grade) return '';
  
  // 이미 점수가 포함된 경우 그대로 반환
  if (grade.includes('(')) return grade;
  
  // 1++등급이고 근내지방 점수가 있으면 추가
  if (grade.startsWith('1++') && marblingScore) {
    // grade가 "1++A" 형태면 "1++A(9)" 형태로 변환
    return `${grade}(${marblingScore})`;
  }
  
  return grade;
};

// CattleListing을 기존 Auction 타입으로 변환
const convertToAuction = (listing: CattleListing): Auction => {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const year = String(date.getFullYear()).slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  };

  const parts: PartData[] = (listing.parts || []).map((part: CattlePart) => ({
    id: part.partNo,
    name: part.partName,
    weight: part.weight || 0,
    minPrice: part.minPrice || 0,
    bidPrice: part.bidPrice,
    isIncluded: part.isIncluded,
  }));

  // 부위가 없으면 기본 부위 생성
  if (parts.length === 0) {
    parts.push(...createDefaultParts());
  }

  // 상태 변환
  const getStatus = (): AuctionStatus => {
    if (listing.status === 'approved') return '승인';
    if (listing.status === 'closed') return '마감';
    return '대기';
  };

  return {
    id: listing.id,
    auctionNo: listing.listingNo,
    breed: listing.breed,
    gender: listing.gender,
    grade: formatGrade(listing.grade, listing.marblingScore),
    monthAge: listing.monthAge || 0,
    backFat: listing.backFat || 0,
    eyeMuscle: listing.eyeMuscle || 0,
    fatMarbling: listing.marblingScore || 0,
    meatColor: listing.meatColor || 0,
    fatColor: listing.fatColor || 0,
    texture: listing.texture || 0,
    maturity: listing.maturity || 0,
    traceNo: listing.traceNo || '',
    slaughterHouse: listing.slaughterHouse || '',
    slaughterDate: formatDate(listing.slaughterDate),
    slaughterNo: listing.slaughterNo || '',
    carcassWeight: listing.carcassWeight || 0,
    company: listing.companyName || '',
    processDate: formatDate(listing.processDate),
    processWeight: listing.processWeight || 0,
    status: getStatus(),
    parts,
    images: listing.images || [],
    slaughterCert: listing.slaughterCert,
    gradeCert: listing.gradeCert,
  };
};

export default function CompanyAuctionsListPage() {
  const { data: session } = useSession();
  const companyName = session?.company?.name || '';
  const companyId = session?.company?.id || '';
  
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>(todayDateString);
  const [endDate, setEndDate] = useState<string>(todayDateString);
  const [sStartDate, setSStartDate] = useState<string>(todayDateString);
  const [sEndDate, setSEndDate] = useState<string>(todayDateString);
  const itemsPerPage = 10;

  const handleSearch = () => {
    setSStartDate(startDate);
    setSEndDate(endDate);
    setCurrentPage(1);
  };
  
  // 실제 데이터 조회
  const { data: listingsData, isLoading } = useListings({
    companyId: companyId || undefined,
    listingDateFrom: sStartDate || undefined,
    listingDateTo: sEndDate || undefined,
    includeParts: true,
  });

  // CattleListing -> Auction 변환
  const auctions = useMemo(() => {
    if (!listingsData) return [];
    return listingsData.map(convertToAuction).sort((a, b) => {
      const aNo = a.auctionNo || '';
      const bNo = b.auctionNo || '';
      return aNo.localeCompare(bNo, undefined, { numeric: true });
    });
  }, [listingsData]);

  // 날짜 입력 refs
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);

  // 사진 모달 상태
  const [photoModalAuction, setPhotoModalAuction] = useState<Auction | null>(null);

  // 필터링된 데이터 (API에서 이미 필터링됨)
  const filteredAuctions = auctions;

  // 페이지네이션
  const totalPages = Math.ceil(filteredAuctions.length / itemsPerPage);
  const paginatedAuctions = filteredAuctions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 행 확장/축소
  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // 상장번호 생성
  const generateListingNo = (auctionNo: string, partIndex: number) => {
    return `${auctionNo}-${String(partIndex + 1).padStart(2, '0')}`;
  };

  // 엑셀 다운로드 함수
  const handleExcelDownload = () => {
    const excelData = filteredAuctions.map((auction) => ({
      '접수번호': auction.auctionNo,
      '축종': auction.breed,
      '성별': auction.gender,
      '등급': auction.grade,
      '개월령': auction.monthAge,
      '등지방': auction.backFat,
      '등심면적': auction.eyeMuscle,
      '근내지방': auction.fatMarbling,
      '육색': auction.meatColor,
      '지방색': auction.fatColor,
      '조직감': auction.texture,
      '성숙도': auction.maturity,
      '이력번호': auction.traceNo,
      '도축장': auction.slaughterHouse,
      '도축일': auction.slaughterDate,
      '도축번호': auction.slaughterNo,
      '도체중': auction.carcassWeight,
      '가공일': auction.processDate,
      '가공중량': auction.processWeight,
      '상태': auction.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    worksheet['!cols'] = [
      { wch: 15 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 8 },
      { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 6 }, { wch: 8 },
      { wch: 8 }, { wch: 8 }, { wch: 14 }, { wch: 8 }, { wch: 12 },
      { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 10 },
      { wch: 8 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '부분육 상장 조회');

    const today = new Date();
    const fileName = `${companyName}_부분육_상장조회_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <CompanyLayout>
      <style dangerouslySetInnerHTML={{ __html: hideSpinnerStyle }} />
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">부분육 상장 조회</h1>
        <p className="text-sm text-gray-500 mt-1">{companyName}</p>
      </div>

      {/* 필터 섹션 */}
      <div className="bg-white border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* 기간 선택 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">상장일자</span>
            <input
              ref={startDateRef}
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
              }}
              className="w-36 px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
            />
            <span className="text-gray-400">~</span>
            <input
              ref={endDateRef}
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => {
                setEndDate(e.target.value);
              }}
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

          {/* 초기화/엑셀 버튼 */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => {
                setStartDate(todayDateString);
                setEndDate(todayDateString);
                setSStartDate(todayDateString);
                setSEndDate(todayDateString);
                setCurrentPage(1);
                if (startDateRef.current) startDateRef.current.value = todayDateString;
                if (endDateRef.current) endDateRef.current.value = todayDateString;
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
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="w-8 px-1 py-2 border border-gray-200 bg-gray-50"></th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">접수번호</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">축종</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">성별</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">등급</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">개월령</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">등지방</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">등심면적</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">근내지방</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">육색</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">지방색</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">조직감</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">성숙도</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">이력번호</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">도축장</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">도축일</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">도축번호</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">도체중</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">가공일</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">가공중량</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">사진</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">상태</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={22} className="px-4 py-8 text-center text-gray-500 border border-gray-200">
                    데이터를 불러오는 중...
                  </td>
                </tr>
              ) : paginatedAuctions.length === 0 ? (
                <tr>
                  <td colSpan={22} className="px-4 py-8 text-center text-gray-500 border border-gray-200">
                    등록된 상장이 없습니다.
                  </td>
                </tr>
              ) : paginatedAuctions.map((auction) => (
                <React.Fragment key={auction.id}>
                  <tr 
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => toggleExpand(auction.id)}
                  >
                    <td className="px-2 py-3 text-center border border-gray-200">
                      {expandedId === auction.id ? (
                        <ChevronUp className="w-3 h-3 text-gray-400 mx-auto" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-gray-400 mx-auto" />
                      )}
                    </td>
                    <td className="px-2 py-3 text-xs border border-gray-200 font-medium text-gray-900 text-center whitespace-nowrap">{auction.auctionNo}</td>
                    <td className="px-2 py-3 text-xs border border-gray-200 text-gray-600 text-center whitespace-nowrap">{auction.breed}</td>
                    <td className="px-2 py-3 text-xs border border-gray-200 text-gray-600 text-center whitespace-nowrap">{auction.gender}</td>
                    <td className="px-2 py-3 text-xs border border-gray-200 font-medium text-gray-900 text-center whitespace-nowrap">{auction.grade}</td>
                    <td className="px-2 py-3 text-xs border border-gray-200 text-gray-600 text-center whitespace-nowrap">{auction.monthAge}</td>
                    <td className="px-2 py-3 text-xs border border-gray-200 text-gray-600 text-center whitespace-nowrap">{auction.backFat}</td>
                    <td className="px-2 py-3 text-xs border border-gray-200 text-gray-600 text-center whitespace-nowrap">{auction.eyeMuscle}</td>
                    <td className="px-2 py-3 text-xs border border-gray-200 text-gray-600 text-center whitespace-nowrap">{auction.fatMarbling}</td>
                    <td className="px-2 py-3 text-xs border border-gray-200 text-gray-600 text-center whitespace-nowrap">{auction.meatColor}</td>
                    <td className="px-2 py-3 text-xs border border-gray-200 text-gray-600 text-center whitespace-nowrap">{auction.fatColor}</td>
                    <td className="px-2 py-3 text-xs border border-gray-200 text-gray-600 text-center whitespace-nowrap">{auction.texture}</td>
                    <td className="px-2 py-3 text-xs border border-gray-200 text-gray-600 text-center whitespace-nowrap">{auction.maturity}</td>
                    <td className="px-2 py-3 text-[10px] border border-gray-200 text-gray-600 text-center whitespace-nowrap">002-{auction.traceNo}</td>
                    <td className="px-2 py-3 text-xs border border-gray-200 text-gray-600 text-center whitespace-nowrap cursor-default" title="농협 음성">{auction.slaughterHouse}</td>
                    <td className="px-2 py-3 text-xs border border-gray-200 text-gray-600 text-center whitespace-nowrap">{auction.slaughterDate}</td>
                    <td className="px-2 py-3 text-xs border border-gray-200 text-gray-600 text-center whitespace-nowrap">{auction.slaughterNo}</td>
                    <td className="px-2 py-3 text-xs border border-gray-200 text-gray-600 text-center whitespace-nowrap">{auction.carcassWeight}</td>
                    <td className="px-2 py-3 text-xs border border-gray-200 text-gray-600 text-center whitespace-nowrap">{auction.processDate}</td>
                    <td className="px-2 py-3 text-xs border border-gray-200 text-gray-600 text-center whitespace-nowrap">{auction.processWeight}</td>
                    <td className="px-2 py-3 text-center whitespace-nowrap border border-gray-200">
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setPhotoModalAuction(auction);
                        }}
                        className="px-2 py-0.5 text-xs font-medium text-white bg-gray-700 hover:bg-gray-800 transition-colors"
                      >
                        보기
                      </button>
                    </td>
                    <td className="px-2 py-3 text-center whitespace-nowrap border border-gray-200">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                        auction.status === '승인' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        auction.status === '마감' ? 'bg-gray-100 text-gray-500' :
                        'bg-gray-50 text-gray-600 border border-gray-200'
                      }`}>
                        {auction.status}
                      </span>
                    </td>
                  </tr>
                  {/* 확장된 부위 테이블 */}
                  {expandedId === auction.id && (
                    <tr>
                      <td colSpan={22} className="px-4 py-4 bg-white">
                        {/* 부위 개수 표시 */}
                        <div className="mb-3 flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">
                            부위: {auction.parts.filter(p => p.isIncluded).length}/{auction.parts.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          {/* 3열로 부위 데이터 표시 */}
                          {[0, 1, 2].map((colIndex) => (
                            <table key={colIndex} className="w-full bg-white border border-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border-r border-gray-200">상장번호</th>
                                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border-r border-gray-200">부위</th>
                                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border-r border-gray-200">중량</th>
                                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border-r border-gray-200">최저가격</th>
                                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600">낙찰가격</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Array.from({ length: 7 }).map((_, idx) => {
                                  const globalIdx = colIndex * 7 + idx;
                                  const part = auction.parts[globalIdx];
                                  
                                  if (!part) {
                                    return (
                                      <tr key={`empty-${globalIdx}`} className="border-t border-gray-100">
                                        <td className="px-2 py-2 text-xs text-gray-400 text-center border-r border-gray-200">-</td>
                                        <td className="px-2 py-2 text-xs text-gray-400 text-center border-r border-gray-200">-</td>
                                        <td className="px-2 py-2 text-xs text-gray-400 text-center border-r border-gray-200">-</td>
                                        <td className="px-2 py-2 text-xs text-gray-400 text-center border-r border-gray-200">-</td>
                                        <td className="px-2 py-2 text-xs text-gray-400 text-center">-</td>
                                      </tr>
                                    );
                                  }
                                  
                                  const isIncluded = part.isIncluded;
                                  
                                  return (
                                    <tr key={part.id} className={`border-t border-gray-100 ${!isIncluded ? 'bg-gray-100' : ''}`}>
                                      <td className={`px-2 py-2 text-xs text-center border-r border-gray-200 ${!isIncluded ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                                        {isIncluded ? generateListingNo(auction.auctionNo, globalIdx) : '-'}
                                      </td>
                                      <td className={`px-2 py-2 text-xs text-center border-r border-gray-200 ${!isIncluded ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{part.name}</td>
                                      <td className={`px-2 py-2 text-xs text-center border-r border-gray-200 ${!isIncluded ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {isIncluded ? `${part.weight}kg` : '-'}
                                      </td>
                                      <td className={`px-2 py-2 text-xs text-center border-r border-gray-200 ${!isIncluded ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {isIncluded ? part.minPrice.toLocaleString() : '-'}
                                      </td>
                                      <td className="px-2 py-2 text-xs text-center">
                                        {isIncluded ? (
                                          part.bidPrice ? (
                                            <span className="text-gray-900 font-medium">{part.bidPrice.toLocaleString()}</span>
                                          ) : (
                                            <span className="text-gray-400">-</span>
                                          )
                                        ) : (
                                          <span className="text-gray-400">-</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            총 {filteredAuctions.length}개
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-gray-100 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  currentPage === page
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-gray-100 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 사진 보기 모달 */}
      {photoModalAuction && (
        <PhotoModal
          data={{
            id: photoModalAuction.id,
            auctionNo: photoModalAuction.auctionNo,
            company: photoModalAuction.company,
            grade: photoModalAuction.grade,
            images: photoModalAuction.images,
            slaughterCert: photoModalAuction.slaughterCert,
            gradeCert: photoModalAuction.gradeCert,
          }}
          editable={false}
          onClose={() => setPhotoModalAuction(null)}
        />
      )}
    </CompanyLayout>
  );
}
