'use client';

import React, { useState, useRef } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { 
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Download,
} from 'lucide-react';
import * as XLSX from 'xlsx';

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
  { id: 5, name: '갈비(좌)', weight: 12.8, minPrice: 78000, bidPrice: null, isIncluded: true },
  { id: 6, name: '갈비(우)', weight: 12.0, minPrice: 78000, bidPrice: null, isIncluded: true },
  { id: 7, name: '특수부위', weight: 3.2, minPrice: 72000, bidPrice: null, isIncluded: true },
  { id: 8, name: '설도(좌)', weight: 16.5, minPrice: 56000, bidPrice: null, isIncluded: true },
  { id: 9, name: '설도(우)', weight: 16.8, minPrice: 56000, bidPrice: null, isIncluded: true },
  { id: 10, name: '앞다리', weight: 25.4, minPrice: 55000, bidPrice: null, isIncluded: true },
  { id: 11, name: '우둔', weight: 21.7, minPrice: 58000, bidPrice: null, isIncluded: true },
  { id: 12, name: '목심', weight: 14.0, minPrice: 62000, bidPrice: null, isIncluded: true },
  { id: 13, name: '양지(좌)', weight: 12.2, minPrice: 52000, bidPrice: null, isIncluded: true },
  { id: 14, name: '양지(우)', weight: 12.4, minPrice: 52000, bidPrice: null, isIncluded: true },
  { id: 15, name: '사태', weight: 15.1, minPrice: 48000, bidPrice: null, isIncluded: true },
  { id: 16, name: '꼬리', weight: 16.2, minPrice: 35000, bidPrice: null, isIncluded: true },
  { id: 17, name: '족', weight: 10.9, minPrice: 25000, bidPrice: null, isIncluded: true },
  { id: 18, name: '사골', weight: 3.1, minPrice: 20000, bidPrice: null, isIncluded: true },
  { id: 19, name: '잡뼈', weight: 21.5, minPrice: 15000, bidPrice: null, isIncluded: true },
];

// 상태 타입 및 옵션
type AuctionStatus = '대기' | '승인';

const STATUS_OPTIONS: { value: AuctionStatus; label: string }[] = [
  { value: '대기', label: '대기' },
  { value: '승인', label: '승인' },
];

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
  fatMarbling: number; // 근내지방
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
}

// 내일 날짜 코드 생성 (YYMMDD)
const getTomorrowDateCode = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = String(tomorrow.getFullYear()).slice(-2);
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

// 내일 날짜 문자열 (YYYY-MM-DD) - input date용
const getTomorrowDateString = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const tomorrowCode = getTomorrowDateCode();
const tomorrowDateString = getTomorrowDateString();

// 더미 데이터 (업체별 2개씩)
const dummyAuctions: Auction[] = [
  // 건화 - 2두
  { 
    id: '1', 
    auctionNo: `${tomorrowCode}-101`, 
    breed: '한우', 
    gender: '거세', 
    grade: '1++A(9)', 
    monthAge: 32,
    backFat: 15, 
    eyeMuscle: 98, 
    fatMarbling: 9,
    meatColor: 5, 
    fatColor: 3, 
    texture: 1, 
    maturity: 2, 
    traceNo: '1486-7293-1',
    slaughterHouse: '음성',
    slaughterDate: "26.01.16",
    slaughterNo: '201',
    carcassWeight: 520, 
    company: '건화',
    processDate: "26.01.17",
    processWeight: 312,
    status: '승인',
    parts: createDefaultParts(),
  },
  { 
    id: '2', 
    auctionNo: `${tomorrowCode}-102`, 
    breed: '한우', 
    gender: '암', 
    grade: '1+A', 
    monthAge: 29,
    backFat: 13, 
    eyeMuscle: 91, 
    fatMarbling: 6,
    meatColor: 5, 
    fatColor: 3, 
    texture: 1, 
    maturity: 2, 
    traceNo: '1486-7294-2',
    slaughterHouse: '음성',
    slaughterDate: "26.01.16",
    slaughterNo: '205',
    carcassWeight: 478, 
    company: '건화',
    processDate: "26.01.17",
    processWeight: 287,
    status: '승인',
    parts: createDefaultParts(),
  },
  // 대진엠에스 - 2두
  { 
    id: '3', 
    auctionNo: `${tomorrowCode}-201`, 
    breed: '한우', 
    gender: '암', 
    grade: '1+A', 
    monthAge: 30,
    backFat: 12, 
    eyeMuscle: 92, 
    fatMarbling: 6,
    meatColor: 5, 
    fatColor: 3, 
    texture: 1, 
    maturity: 2, 
    traceNo: '1523-8842-3',
    slaughterHouse: '음성',
    slaughterDate: "26.01.16",
    slaughterNo: '202',
    carcassWeight: 485, 
    company: '대진엠에스',
    processDate: "26.01.17",
    processWeight: 291,
    status: '승인',
    parts: createDefaultParts(),
  },
  { 
    id: '4', 
    auctionNo: `${tomorrowCode}-202`, 
    breed: '한우', 
    gender: '거세', 
    grade: '1++B(8)', 
    monthAge: 33,
    backFat: 14, 
    eyeMuscle: 96, 
    fatMarbling: 8,
    meatColor: 5, 
    fatColor: 3, 
    texture: 1, 
    maturity: 2, 
    traceNo: '1523-8843-4',
    slaughterHouse: '음성',
    slaughterDate: "26.01.16",
    slaughterNo: '206',
    carcassWeight: 508, 
    company: '대진엠에스',
    processDate: "26.01.17",
    processWeight: 305,
    status: '승인',
    parts: createDefaultParts(),
  },
  // 안심엘피씨 - 2두
  { 
    id: '5', 
    auctionNo: `${tomorrowCode}-301`, 
    breed: '한우', 
    gender: '거세', 
    grade: '1++B(8)', 
    monthAge: 34,
    backFat: 14, 
    eyeMuscle: 95, 
    fatMarbling: 8,
    meatColor: 5, 
    fatColor: 3, 
    texture: 1, 
    maturity: 2, 
    traceNo: '1498-6521-7',
    slaughterHouse: '음성',
    slaughterDate: "26.01.16",
    slaughterNo: '203',
    carcassWeight: 512, 
    company: '안심엘피씨',
    processDate: "26.01.17",
    processWeight: 307,
    status: '대기',
    parts: createDefaultParts(),
  },
  { 
    id: '6', 
    auctionNo: `${tomorrowCode}-302`, 
    breed: '한우', 
    gender: '암', 
    grade: '1+B', 
    monthAge: 31,
    backFat: 12, 
    eyeMuscle: 89, 
    fatMarbling: 5,
    meatColor: 5, 
    fatColor: 3, 
    texture: 1, 
    maturity: 2, 
    traceNo: '1498-6522-8',
    slaughterHouse: '음성',
    slaughterDate: "26.01.16",
    slaughterNo: '207',
    carcassWeight: 472, 
    company: '안심엘피씨',
    processDate: "26.01.17",
    processWeight: 283,
    status: '대기',
    parts: createDefaultParts(),
  },
  // 정직한고기 - 2두
  { 
    id: '7', 
    auctionNo: `${tomorrowCode}-401`, 
    breed: '한우', 
    gender: '암', 
    grade: '1+B', 
    monthAge: 28,
    backFat: 11, 
    eyeMuscle: 88, 
    fatMarbling: 5,
    meatColor: 5, 
    fatColor: 3, 
    texture: 1, 
    maturity: 2, 
    traceNo: '1512-9934-2',
    slaughterHouse: '음성',
    slaughterDate: "26.01.16",
    slaughterNo: '204',
    carcassWeight: 468, 
    company: '정직한고기',
    processDate: "26.01.17",
    processWeight: 281,
    status: '대기',
    parts: createDefaultParts(),
  },
  { 
    id: '8', 
    auctionNo: `${tomorrowCode}-402`, 
    breed: '한우', 
    gender: '거세', 
    grade: '1++A(9)', 
    monthAge: 35,
    backFat: 16, 
    eyeMuscle: 99, 
    fatMarbling: 9,
    meatColor: 5, 
    fatColor: 3, 
    texture: 1, 
    maturity: 2, 
    traceNo: '1512-9935-3',
    slaughterHouse: '음성',
    slaughterDate: "26.01.16",
    slaughterNo: '208',
    carcassWeight: 535, 
    company: '정직한고기',
    processDate: "26.01.17",
    processWeight: 321,
    status: '승인',
    parts: createDefaultParts(),
  },
];

// 수정 폼 데이터 타입
interface EditFormData {
  gender: string;
  grade: string;
  monthAge: string;
  backFat: string;
  eyeMuscle: string;
  fatMarbling: string;
  meatColor: string;
  fatColor: string;
  texture: string;
  maturity: string;
  traceNo: string;
  slaughterDate: string;
  slaughterNo: string;
  carcassWeight: string;
  processDate: string;
  processWeight: string;
}

export default function AuctionsListPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>(tomorrowDateString);
  const [endDate, setEndDate] = useState<string>(tomorrowDateString);
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [auctions, setAuctions] = useState<Auction[]>(dummyAuctions);
  const itemsPerPage = 10;

  // 날짜 입력 refs
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);

  // 사진 모달 상태
  const [photoModalAuction, setPhotoModalAuction] = useState<Auction | null>(null);

  // 인라인 수정 상태
  const [editingId, setEditingId] = useState<string | null>(null);
  const [secondaryPassword, setSecondaryPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    gender: '',
    grade: '',
    monthAge: '',
    backFat: '',
    eyeMuscle: '',
    fatMarbling: '',
    meatColor: '',
    fatColor: '',
    texture: '',
    maturity: '',
    traceNo: '',
    slaughterDate: '',
    slaughterNo: '',
    carcassWeight: '',
    processDate: '',
    processWeight: '',
  });

  // 고유 업체 목록
  const companies = [...new Set(auctions.map(a => a.company))];

  // 수정 시작
  const startEditing = (auction: Auction) => {
    setEditingId(auction.id);
    setExpandedId(auction.id);
    setEditFormData({
      gender: auction.gender,
      grade: auction.grade,
      monthAge: String(auction.monthAge),
      backFat: String(auction.backFat),
      eyeMuscle: String(auction.eyeMuscle),
      fatMarbling: String(auction.fatMarbling),
      meatColor: String(auction.meatColor),
      fatColor: String(auction.fatColor),
      texture: String(auction.texture),
      maturity: String(auction.maturity),
      traceNo: auction.traceNo,
      slaughterDate: auction.slaughterDate,
      slaughterNo: auction.slaughterNo,
      carcassWeight: String(auction.carcassWeight),
      processDate: auction.processDate,
      processWeight: String(auction.processWeight),
    });
  };

  // 수정 취소
  const cancelEditing = () => {
    setEditingId(null);
    setSecondaryPassword('');
    setPasswordError(false);
  };

  // 수정 저장
  const saveEditing = () => {
    if (!editingId) return;
    
    // 2차 비밀번호 확인
    if (secondaryPassword !== '1234') {
      setPasswordError(true);
      return;
    }
    
    setAuctions(prev => prev.map(auction => {
      if (auction.id !== editingId) return auction;
      return {
        ...auction,
        gender: editFormData.gender,
        grade: editFormData.grade,
        monthAge: parseInt(editFormData.monthAge) || 0,
        backFat: parseInt(editFormData.backFat) || 0,
        eyeMuscle: parseInt(editFormData.eyeMuscle) || 0,
        fatMarbling: parseInt(editFormData.fatMarbling) || 0,
        meatColor: parseInt(editFormData.meatColor) || 0,
        fatColor: parseInt(editFormData.fatColor) || 0,
        texture: parseInt(editFormData.texture) || 0,
        maturity: parseInt(editFormData.maturity) || 0,
        traceNo: editFormData.traceNo,
        slaughterDate: editFormData.slaughterDate,
        slaughterNo: editFormData.slaughterNo,
        carcassWeight: parseInt(editFormData.carcassWeight) || 0,
        processDate: editFormData.processDate,
        processWeight: parseInt(editFormData.processWeight) || 0,
      };
    }));
    setEditingId(null);
    setSecondaryPassword('');
    setPasswordError(false);
  };

  // 상태 변경 핸들러
  const handleStatusChange = (auctionId: string, newStatus: AuctionStatus) => {
    setAuctions(prev => prev.map(auction => 
      auction.id === auctionId ? { ...auction, status: newStatus } : auction
    ));
  };

  // 부위 정보 수정
  const updatePart = (auctionId: string, partId: number, field: 'weight' | 'minPrice', value: string) => {
    const numValue = parseFloat(value) || 0;
    setAuctions(prev => prev.map(auction => {
      if (auction.id !== auctionId) return auction;
      return {
        ...auction,
        parts: auction.parts.map(part => 
          part.id === partId ? { ...part, [field]: numValue } : part
        ),
      };
    }));
  };

  // 부위 포함/제외 토글
  const togglePartIncluded = (auctionId: string, partId: number) => {
    setAuctions(prev => prev.map(auction => {
      if (auction.id !== auctionId) return auction;
      return {
        ...auction,
        parts: auction.parts.map(part => 
          part.id === partId ? { ...part, isIncluded: !part.isIncluded } : part
        ),
      };
    }));
  };

  // 날짜를 6자리 코드로 변환 (YYMMDD)
  const dateToCode = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = String(date.getFullYear()).slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };

  // 접수번호에서 날짜 코드 추출
  const extractDateCode = (auctionNo: string) => {
    return auctionNo.split('-')[0];
  };

  // 필터링된 데이터
  const filteredAuctions = auctions.filter(auction => {
    const matchesCompany = companyFilter === 'all' || auction.company === companyFilter;
    
    // 날짜 범위 필터
    let matchesDate = true;
    const auctionDateCode = extractDateCode(auction.auctionNo);
    
    if (startDate && endDate) {
      const startCode = dateToCode(startDate);
      const endCode = dateToCode(endDate);
      matchesDate = auctionDateCode >= startCode && auctionDateCode <= endCode;
    } else if (startDate) {
      const startCode = dateToCode(startDate);
      matchesDate = auctionDateCode >= startCode;
    } else if (endDate) {
      const endCode = dateToCode(endDate);
      matchesDate = auctionDateCode <= endCode;
    }
    
    return matchesCompany && matchesDate;
  });

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
      '상장업체': auction.company,
      '가공일': auction.processDate,
      '가공중량': auction.processWeight,
      '상태': auction.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    worksheet['!cols'] = [
      { wch: 15 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 8 },
      { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 6 }, { wch: 8 },
      { wch: 8 }, { wch: 8 }, { wch: 14 }, { wch: 8 }, { wch: 12 },
      { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
      { wch: 8 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '부분육 상장 조회');

    const today = new Date();
    const fileName = `부분육_상장조회_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <AdminLayout>
      <style dangerouslySetInnerHTML={{ __html: hideSpinnerStyle }} />
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">부분육 상장 조회</h1>
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
                setCurrentPage(1);
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
                setCurrentPage(1);
              }}
              className="w-36 px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
            />
          </div>

          {/* 상장업체 필터 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">상장업체</span>
            <select
              value={companyFilter}
              onChange={(e) => {
                setCompanyFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
            >
              <option value="all">전체</option>
              {companies.map(company => (
                <option key={company} value={company}>{company}</option>
              ))}
            </select>
          </div>

          {/* 초기화/엑셀 버튼 */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => {
                setStartDate(tomorrowDateString);
                setEndDate(tomorrowDateString);
                setCompanyFilter('all');
                setCurrentPage(1);
                if (startDateRef.current) startDateRef.current.value = tomorrowDateString;
                if (endDateRef.current) endDateRef.current.value = tomorrowDateString;
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
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">상장업체</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">가공일</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">가공중량</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">사진</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">상태</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAuctions.map((auction) => (
                <React.Fragment key={auction.id}>
                  <tr 
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => editingId !== auction.id && toggleExpand(auction.id)}
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
                    {editingId === auction.id ? (
                      <>
                        <td className="px-1 py-1 text-center whitespace-nowrap">
                          <select
                            value={editFormData.gender}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                            className="w-14 px-1 py-1 text-xs border border-gray-300 outline-none bg-white text-center"
                          >
                            <option value="거세">거세</option>
                            <option value="암">암</option>
                          </select>
                        </td>
                        <td className="px-1 py-1 text-center whitespace-nowrap">
                          <select
                            value={editFormData.grade}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setEditFormData({ ...editFormData, grade: e.target.value })}
                            className="w-20 px-1 py-1 text-xs border border-gray-300 outline-none bg-white text-center"
                          >
                            <option value="1++A(9)">1++A(9)</option>
                            <option value="1++A(8)">1++A(8)</option>
                            <option value="1++B(9)">1++B(9)</option>
                            <option value="1++B(8)">1++B(8)</option>
                            <option value="1+A">1+A</option>
                            <option value="1+B">1+B</option>
                            <option value="1A">1A</option>
                            <option value="1B">1B</option>
                            <option value="2">2</option>
                          </select>
                        </td>
                        <td className="px-1 py-1 text-center whitespace-nowrap">
                          <input type="number" value={editFormData.monthAge} onClick={(e) => e.stopPropagation()} onChange={(e) => setEditFormData({ ...editFormData, monthAge: e.target.value })} className="w-10 px-1 py-1 text-xs border border-gray-300 outline-none bg-white text-center" />
                        </td>
                        <td className="px-1 py-1 text-center whitespace-nowrap">
                          <input type="number" value={editFormData.backFat} onClick={(e) => e.stopPropagation()} onChange={(e) => setEditFormData({ ...editFormData, backFat: e.target.value })} className="w-10 px-1 py-1 text-xs border border-gray-300 outline-none bg-white text-center" />
                        </td>
                        <td className="px-1 py-1 text-center whitespace-nowrap">
                          <input type="number" value={editFormData.eyeMuscle} onClick={(e) => e.stopPropagation()} onChange={(e) => setEditFormData({ ...editFormData, eyeMuscle: e.target.value })} className="w-10 px-1 py-1 text-xs border border-gray-300 outline-none bg-white text-center" />
                        </td>
                        <td className="px-1 py-1 text-center whitespace-nowrap">
                          <input type="number" value={editFormData.fatMarbling} onClick={(e) => e.stopPropagation()} onChange={(e) => setEditFormData({ ...editFormData, fatMarbling: e.target.value })} className="w-10 px-1 py-1 text-xs border border-gray-300 outline-none bg-white text-center" />
                        </td>
                        <td className="px-1 py-1 text-center whitespace-nowrap">
                          <input type="number" value={editFormData.meatColor} onClick={(e) => e.stopPropagation()} onChange={(e) => setEditFormData({ ...editFormData, meatColor: e.target.value })} className="w-8 px-1 py-1 text-xs border border-gray-300 outline-none bg-white text-center" />
                        </td>
                        <td className="px-1 py-1 text-center whitespace-nowrap">
                          <input type="number" value={editFormData.fatColor} onClick={(e) => e.stopPropagation()} onChange={(e) => setEditFormData({ ...editFormData, fatColor: e.target.value })} className="w-8 px-1 py-1 text-xs border border-gray-300 outline-none bg-white text-center" />
                        </td>
                        <td className="px-1 py-1 text-center whitespace-nowrap">
                          <input type="number" value={editFormData.texture} onClick={(e) => e.stopPropagation()} onChange={(e) => setEditFormData({ ...editFormData, texture: e.target.value })} className="w-8 px-1 py-1 text-xs border border-gray-300 outline-none bg-white text-center" />
                        </td>
                        <td className="px-1 py-1 text-center whitespace-nowrap">
                          <input type="number" value={editFormData.maturity} onClick={(e) => e.stopPropagation()} onChange={(e) => setEditFormData({ ...editFormData, maturity: e.target.value })} className="w-8 px-1 py-1 text-xs border border-gray-300 outline-none bg-white text-center" />
                        </td>
                        <td className="px-1 py-1 text-center whitespace-nowrap">
                          <input type="text" value={editFormData.traceNo} onClick={(e) => e.stopPropagation()} onChange={(e) => setEditFormData({ ...editFormData, traceNo: e.target.value })} className="w-24 px-1 py-1 text-xs border border-gray-300 outline-none bg-white text-center" />
                        </td>
                        <td className="px-2 py-3 text-xs border border-gray-200 text-gray-600 text-center whitespace-nowrap">{auction.slaughterHouse}</td>
                        <td className="px-1 py-1 text-center whitespace-nowrap">
                          <input type="text" value={editFormData.slaughterDate} onClick={(e) => e.stopPropagation()} onChange={(e) => setEditFormData({ ...editFormData, slaughterDate: e.target.value })} className="w-20 px-1 py-1 text-xs border border-gray-300 outline-none bg-white text-center" />
                        </td>
                        <td className="px-1 py-1 text-center whitespace-nowrap">
                          <input type="text" value={editFormData.slaughterNo} onClick={(e) => e.stopPropagation()} onChange={(e) => setEditFormData({ ...editFormData, slaughterNo: e.target.value })} className="w-12 px-1 py-1 text-xs border border-gray-300 outline-none bg-white text-center" />
                        </td>
                        <td className="px-1 py-1 text-center whitespace-nowrap">
                          <input type="number" value={editFormData.carcassWeight} onClick={(e) => e.stopPropagation()} onChange={(e) => setEditFormData({ ...editFormData, carcassWeight: e.target.value })} className="w-12 px-1 py-1 text-xs border border-gray-300 outline-none bg-white text-center" />
                        </td>
                        <td className="px-2 py-3 text-xs border border-gray-200 text-gray-600 text-center whitespace-nowrap">{auction.company}</td>
                        <td className="px-1 py-1 text-center whitespace-nowrap">
                          <input type="text" value={editFormData.processDate} onClick={(e) => e.stopPropagation()} onChange={(e) => setEditFormData({ ...editFormData, processDate: e.target.value })} className="w-20 px-1 py-1 text-xs border border-gray-300 outline-none bg-white text-center" />
                        </td>
                        <td className="px-1 py-1 text-center whitespace-nowrap">
                          <input type="number" value={editFormData.processWeight} onClick={(e) => e.stopPropagation()} onChange={(e) => setEditFormData({ ...editFormData, processWeight: e.target.value })} className="w-12 px-1 py-1 text-xs border border-gray-300 outline-none bg-white text-center" />
                        </td>
                      </>
                    ) : (
                      <>
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
                        <td className="px-2 py-3 text-xs border border-gray-200 text-gray-600 text-center whitespace-nowrap">{auction.traceNo}</td>
                        <td className="px-2 py-3 text-xs border border-gray-200 text-gray-600 text-center whitespace-nowrap">{auction.slaughterHouse}</td>
                        <td className="px-2 py-3 text-xs border border-gray-200 text-gray-600 text-center whitespace-nowrap">{auction.slaughterDate}</td>
                        <td className="px-2 py-3 text-xs border border-gray-200 text-gray-600 text-center whitespace-nowrap">{auction.slaughterNo}</td>
                        <td className="px-2 py-3 text-xs border border-gray-200 text-gray-600 text-center whitespace-nowrap">{auction.carcassWeight}</td>
                        <td className="px-2 py-3 text-xs border border-gray-200 text-gray-600 text-center whitespace-nowrap">{auction.company}</td>
                        <td className="px-2 py-3 text-xs border border-gray-200 text-gray-600 text-center whitespace-nowrap">{auction.processDate}</td>
                        <td className="px-2 py-3 text-xs border border-gray-200 text-gray-600 text-center whitespace-nowrap">{auction.processWeight}</td>
                      </>
                    )}
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
                      <select
                        value={auction.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleStatusChange(auction.id, e.target.value as AuctionStatus)}
                        className="px-1 py-0.5 text-xs font-medium border border-gray-200 cursor-pointer outline-none bg-white text-gray-700"
                      >
                        {STATUS_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                  {/* 확장된 부위 테이블 */}
                  {expandedId === auction.id && (
                    <tr>
                      <td colSpan={23} className="px-4 py-4 bg-white">
                        {/* 부위 개수 표시 */}
                        <div className="mb-3 flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">
                            부위: {auction.parts.filter(p => p.isIncluded).length}/{auction.parts.length}
                          </span>
                          {editingId === auction.id && (
                            <span className="text-xs text-gray-500">(체크박스로 상장 제외 가능)</span>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          {/* 3열로 부위 데이터 표시 */}
                          {[0, 1, 2].map((colIndex) => (
                            <table key={colIndex} className="w-full bg-white border border-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  {editingId === auction.id && (
                                    <th className="w-8 px-1 py-2 text-center text-xs font-semibold text-gray-600 border-r border-gray-200"></th>
                                  )}
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
                                  
                                  // 데이터가 없으면 빈 행 표시
                                  if (!part) {
                                    return (
                                      <tr key={`empty-${globalIdx}`} className="border-t border-gray-100">
                                        {editingId === auction.id && (
                                          <td className="px-1 py-2 text-center border-r border-gray-200"></td>
                                        )}
                                        <td className="px-2 py-2 text-xs text-gray-400 text-center border-r border-gray-200">-</td>
                                        <td className="px-2 py-2 text-xs text-gray-400 text-center border-r border-gray-200">-</td>
                                        <td className="px-2 py-2 text-xs text-gray-400 text-center border-r border-gray-200">-</td>
                                        <td className="px-2 py-2 text-xs text-gray-400 text-center border-r border-gray-200">-</td>
                                        <td className="px-2 py-2 text-xs text-gray-400 text-center">-</td>
                                      </tr>
                                    );
                                  }
                                  
                                  const isEditing = editingId === auction.id;
                                  const isIncluded = part.isIncluded;
                                  
                                  return (
                                    <tr key={part.id} className={`border-t border-gray-100 ${!isIncluded ? 'bg-gray-100' : ''}`}>
                                      {isEditing && (
                                        <td className={`px-1 py-1 text-center border-r border-gray-200 ${!isIncluded ? 'bg-gray-100' : ''}`}>
                                          <input
                                            type="checkbox"
                                            checked={isIncluded}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={() => togglePartIncluded(auction.id, part.id)}
                                            className="w-4 h-4 rounded appearance-none bg-white border border-gray-300 checked:bg-gray-700 checked:border-gray-700 relative cursor-pointer
                                              after:content-['✓'] after:absolute after:inset-0 after:flex after:items-center after:justify-center after:text-white after:text-xs after:font-bold after:opacity-0 checked:after:opacity-100"
                                          />
                                        </td>
                                      )}
                                      <td className={`px-2 py-2 text-xs text-center border-r border-gray-200 ${!isIncluded ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                                        {isIncluded ? generateListingNo(auction.auctionNo, globalIdx) : '-'}
                                      </td>
                                      <td className={`px-2 py-2 text-xs text-center border-r border-gray-200 ${!isIncluded ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{part.name}</td>
                                      <td className={`px-1 py-1 text-xs text-center border-r border-gray-200 ${!isIncluded ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {isEditing && isIncluded ? (
                                          <input
                                            type="number"
                                            value={part.weight}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => updatePart(auction.id, part.id, 'weight', e.target.value)}
                                            step="0.1"
                                            className="w-14 px-1 py-0.5 text-xs border border-gray-300 outline-none bg-white text-center"
                                          />
                                        ) : (
                                          isIncluded ? `${part.weight}kg` : '-'
                                        )}
                                      </td>
                                      <td className={`px-1 py-1 text-xs text-center border-r border-gray-200 ${!isIncluded ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {isEditing && isIncluded ? (
                                          <input
                                            type="number"
                                            value={part.minPrice}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => updatePart(auction.id, part.id, 'minPrice', e.target.value)}
                                            className="w-16 px-1 py-0.5 text-xs border border-gray-300 outline-none bg-white text-center"
                                          />
                                        ) : (
                                          isIncluded ? part.minPrice.toLocaleString() : '-'
                                        )}
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
                        {/* 수정/삭제 버튼 */}
                        <div className="flex justify-end items-center gap-2 mt-4">
                          {editingId === auction.id ? (
                            <>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-600">2차PW</span>
                                <input
                                  type="password"
                                  value={secondaryPassword}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => {
                                    setSecondaryPassword(e.target.value);
                                    setPasswordError(false);
                                  }}
                                  placeholder="비밀번호"
                                  className={`w-20 px-2 py-1 text-xs border outline-none bg-white ${
                                    passwordError ? 'border-red-500' : 'border-gray-300'
                                  }`}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  saveEditing();
                                }}
                                className="px-4 py-1.5 text-xs font-medium text-white bg-gray-700 hover:bg-gray-800 transition-colors"
                              >
                                저장
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelEditing();
                                }}
                                className="px-4 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                              >
                                수정취소
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditing(auction);
                              }}
                              className="px-4 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                            >
                              수정
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`${auction.auctionNo}을(를) 삭제하시겠습니까?`)) {
                                setAuctions(prev => prev.filter(a => a.id !== auction.id));
                              }
                            }}
                            className="px-4 py-1.5 text-xs font-medium text-white bg-gray-700 hover:bg-gray-800 transition-colors"
                          >
                            삭제
                          </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* 배경 오버레이 */}
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setPhotoModalAuction(null)}
          />
          
          {/* 모달 컨텐츠 */}
          <div className="relative bg-white shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">상장 사진</h3>
                <p className="text-sm text-gray-500">
                  접수번호: {photoModalAuction.auctionNo} | {photoModalAuction.company} | {photoModalAuction.grade}
                </p>
              </div>
              <button
                onClick={() => setPhotoModalAuction(null)}
                className="p-2 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* 사진 그리드 */}
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-100px)]">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* 등심 사진들 */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-600 text-center">등심1</p>
                  <img 
                    src="/등심1.png" 
                    alt="등심1"
                    className="w-full h-40 object-cover border border-gray-200"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-600 text-center">등심2</p>
                  <img 
                    src="/등심2.png" 
                    alt="등심2"
                    className="w-full h-40 object-cover border border-gray-200"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-600 text-center">등심3</p>
                  <img 
                    src="/등심3.png" 
                    alt="등심3"
                    className="w-full h-40 object-cover border border-gray-200"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-600 text-center">등심4</p>
                  <img 
                    src="/등심4.png" 
                    alt="등심4"
                    className="w-full h-40 object-cover border border-gray-200"
                  />
                </div>
              </div>
            </div>
            
            {/* 푸터 */}
            <div className="p-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setPhotoModalAuction(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
