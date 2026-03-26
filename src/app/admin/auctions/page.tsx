'use client';

import React, { useState, useRef, useMemo } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { 
  ChevronDown,
  ChevronUp,
  X,
  Download,
  Printer,
  Check,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useListings, useApproveListing, useDeleteListing, useUpdateListing, useUpdatePart } from '@/features/listings/hooks';
import { useCompanies } from '@/features/companies/hooks';
import { CattleListing, CattlePart } from '@/features/listings/types';

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
  dbId: string;
  name: string;
  weight: number;
  minPrice: number;
  bidPrice: number | null;
  isIncluded: boolean;
}

// 기본 부위 데이터 생성
const createDefaultParts = (): PartData[] => [
  { id: 1, dbId: '', name: '등심(좌)', weight: 15.2, minPrice: 85000, bidPrice: null, isIncluded: true },
  { id: 2, dbId: '', name: '등심(우)', weight: 15.3, minPrice: 85000, bidPrice: null, isIncluded: true },
  { id: 3, dbId: '', name: '안심', weight: 4.5, minPrice: 95000, bidPrice: null, isIncluded: true },
  { id: 4, dbId: '', name: '채끝', weight: 8.2, minPrice: 82000, bidPrice: null, isIncluded: true },
  { id: 5, dbId: '', name: '치마', weight: 4.0, minPrice: 65000, bidPrice: null, isIncluded: true },
  { id: 6, dbId: '', name: '부채', weight: 3.0, minPrice: 60000, bidPrice: null, isIncluded: true },
  { id: 7, dbId: '', name: '업진', weight: 4.5, minPrice: 55000, bidPrice: null, isIncluded: true },
  { id: 8, dbId: '', name: '토시·제비', weight: 2.0, minPrice: 70000, bidPrice: null, isIncluded: true },
  { id: 9, dbId: '', name: '설도(좌)', weight: 16.5, minPrice: 56000, bidPrice: null, isIncluded: true },
  { id: 10, dbId: '', name: '설도(우)', weight: 16.8, minPrice: 56000, bidPrice: null, isIncluded: true },
  { id: 11, dbId: '', name: '앞다리', weight: 25.4, minPrice: 55000, bidPrice: null, isIncluded: true },
  { id: 12, dbId: '', name: '우둔', weight: 21.7, minPrice: 58000, bidPrice: null, isIncluded: true },
  { id: 13, dbId: '', name: '목심', weight: 14.0, minPrice: 62000, bidPrice: null, isIncluded: true },
  { id: 14, dbId: '', name: '양지(좌)', weight: 12.2, minPrice: 52000, bidPrice: null, isIncluded: true },
  { id: 15, dbId: '', name: '양지(우)', weight: 12.4, minPrice: 52000, bidPrice: null, isIncluded: true },
  { id: 16, dbId: '', name: '사태', weight: 15.1, minPrice: 48000, bidPrice: null, isIncluded: true },
  { id: 17, dbId: '', name: '꼬리', weight: 16.2, minPrice: 35000, bidPrice: null, isIncluded: true },
  { id: 18, dbId: '', name: '족', weight: 10.9, minPrice: 25000, bidPrice: null, isIncluded: true },
  { id: 19, dbId: '', name: '사골', weight: 3.1, minPrice: 20000, bidPrice: null, isIncluded: true },
  { id: 20, dbId: '', name: '잡뼈', weight: 21.5, minPrice: 15000, bidPrice: null, isIncluded: true },
];

// 상태 타입 및 옵션
type AuctionStatus = '대기' | '승인' | '경매중' | '마감';

const STATUS_OPTIONS: { value: AuctionStatus; label: string }[] = [
  { value: '대기', label: '대기' },
  { value: '승인', label: '승인' },
  { value: '경매중', label: '경매중' },
  { value: '마감', label: '마감' },
];

// 증명서 데이터 타입
interface CertificateData {
  fileName: string;
  fileData: string;
}

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
  images: string[];
  slaughterCert: CertificateData | null;
  gradeCert: CertificateData | null;
}

// 내일 날짜 문자열 (YYYY-MM-DD) - input date용
const getTomorrowDateString = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const tomorrowDateString = getTomorrowDateString();

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
    dbId: part.id,
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

  // 등급 포맷팅: 1++ 등급만 marblingScore 표시
  const formatGrade = (grade: string, marblingScore: number | null) => {
    if (!grade) return '';
    if (grade.includes('(')) return grade; // 이미 조합된 형식 (예: 1++A(9))
    // 1++ 등급만 (숫자) 추가
    if (marblingScore && grade.startsWith('1++')) {
      return `${grade}(${marblingScore})`;
    }
    return grade;
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
    status: listing.status === 'approved' ? '승인'
      : listing.status === 'auction' ? '경매중'
      : listing.status === 'completed' || listing.status === 'closed' ? '마감'
      : '대기',
    parts,
    images: listing.images || [],
    slaughterCert: listing.slaughterCert,
    gradeCert: listing.gradeCert,
  };
};


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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>(tomorrowDateString);
  const [endDate, setEndDate] = useState<string>(tomorrowDateString);
  const [companyFilter, setCompanyFilter] = useState<string>('all');

  const [searchStartDate, setSearchStartDate] = useState<string>(tomorrowDateString);
  const [searchEndDate, setSearchEndDate] = useState<string>(tomorrowDateString);
  const [searchCompanyFilter, setSearchCompanyFilter] = useState<string>('all');

  const handleSearch = () => {
    setSearchStartDate(startDate);
    setSearchEndDate(endDate);
    setSearchCompanyFilter(companyFilter);
  };

  // 실제 데이터 조회
  const { data: listingsData, isLoading } = useListings({
    companyId: searchCompanyFilter !== 'all' ? searchCompanyFilter : undefined,
    listingDateFrom: searchStartDate || undefined,
    listingDateTo: searchEndDate || undefined,
    includeParts: true,
  });

  // 업체 목록 조회
  const { data: companiesData } = useCompanies();

  // Mutation 훅
  const approveListing = useApproveListing();
  const deleteListing = useDeleteListing();
  const updateListing = useUpdateListing();
  const updatePartMutation = useUpdatePart();

  // CattleListing -> Auction 변환 + 접수번호 오름차순 정렬
  const auctions = useMemo(() => {
    if (!listingsData) return [];
    return listingsData.map(convertToAuction).sort((a, b) => {
      const suffixA = parseInt(a.auctionNo.split('-').pop() || '0', 10);
      const suffixB = parseInt(b.auctionNo.split('-').pop() || '0', 10);
      return suffixA - suffixB;
    });
  }, [listingsData]);

  // 업체 목록 (드롭다운용)
  const companies = useMemo(() => {
    return companiesData?.map(c => ({ id: c.id, name: c.name })) || [];
  }, [companiesData]);

  // 날짜 입력 refs
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);

  // 사진 모달 상태
  const [photoModalAuction, setPhotoModalAuction] = useState<Auction | null>(null);
  
  // 확대 이미지 상태
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  // 인라인 수정 상태
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<'full' | 'minPrice'>('full');
  const [secondaryPassword, setSecondaryPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [editPartsData, setEditPartsData] = useState<Record<number, { weight: string; minPrice: string; isIncluded: boolean }>>({});
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

  // 수정 시작
  const startEditing = (auction: Auction) => {
    setEditingId(auction.id);
    setEditMode('full');
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
    const partsMap: Record<number, { weight: string; minPrice: string; isIncluded: boolean }> = {};
    auction.parts.forEach((part) => {
      partsMap[part.id] = {
        weight: String(part.weight),
        minPrice: String(part.minPrice),
        isIncluded: part.isIncluded,
      };
    });
    setEditPartsData(partsMap);
  };

  // 수정 취소
  const cancelEditing = () => {
    setEditingId(null);
    setEditMode('full');
    setSecondaryPassword('');
    setPasswordError(false);
    setEditPartsData({});
  };

  // 단가수정 시작 (경매중 상태에서 최저가격만 수정)
  const startMinPriceEditing = (auction: Auction) => {
    setEditingId(auction.id);
    setEditMode('minPrice');
    setExpandedId(auction.id);
    const partsMap: Record<number, { weight: string; minPrice: string; isIncluded: boolean }> = {};
    auction.parts.forEach((part) => {
      partsMap[part.id] = {
        weight: String(part.weight),
        minPrice: String(part.minPrice),
        isIncluded: part.isIncluded,
      };
    });
    setEditPartsData(partsMap);
  };

  // 수정 저장
  const saveEditing = async () => {
    if (!editingId) return;
    
    // 2차 비밀번호 확인
    if (secondaryPassword !== '1234') {
      setPasswordError(true);
      return;
    }
    
    try {
      if (editMode === 'minPrice') {
        const currentAuction = auctions.find((a) => a.id === editingId);
        if (currentAuction) {
          const partUpdates = currentAuction.parts
            .filter((part) => {
              const edited = editPartsData[part.id];
              if (!edited) return false;
              return String(part.minPrice) !== edited.minPrice;
            })
            .map((part) => {
              const edited = editPartsData[part.id];
              return updatePartMutation.mutateAsync({
                listingId: editingId,
                partId: part.dbId,
                input: {
                  minPrice: parseInt(edited.minPrice) || 0,
                },
              });
            });
          await Promise.all(partUpdates);
        }
      } else {
      // 날짜 형식 변환 (YY.MM.DD -> YYYY-MM-DD)
      const convertDate = (dateStr: string) => {
        if (!dateStr) return null;
        const parts = dateStr.split('.');
        if (parts.length !== 3) return dateStr;
        const year = parts[0].length === 2 ? `20${parts[0]}` : parts[0];
        return `${year}-${parts[1]}-${parts[2]}`;
      };

      await updateListing.mutateAsync({
        id: editingId,
        input: {
          gender: editFormData.gender,
          grade: editFormData.grade,
          monthAge: parseInt(editFormData.monthAge) || null,
          backFat: parseFloat(editFormData.backFat) || null,
          eyeMuscle: parseFloat(editFormData.eyeMuscle) || null,
          marblingScore: parseInt(editFormData.fatMarbling) || null,
          meatColor: parseInt(editFormData.meatColor) || null,
          fatColor: parseInt(editFormData.fatColor) || null,
          texture: parseInt(editFormData.texture) || null,
          maturity: parseInt(editFormData.maturity) || null,
          traceNo: editFormData.traceNo || null,
          slaughterDate: convertDate(editFormData.slaughterDate),
          slaughterNo: editFormData.slaughterNo || null,
          carcassWeight: parseFloat(editFormData.carcassWeight) || null,
          processDate: convertDate(editFormData.processDate),
          processWeight: parseFloat(editFormData.processWeight) || null,
        },
      });

      const currentAuction = auctions.find((a) => a.id === editingId);
      if (currentAuction) {
        const partUpdates = currentAuction.parts
          .filter((part) => {
            const edited = editPartsData[part.id];
            if (!edited) return false;
            return (
              String(part.weight) !== edited.weight ||
              String(part.minPrice) !== edited.minPrice ||
              part.isIncluded !== edited.isIncluded
            );
          })
          .map((part) => {
            const edited = editPartsData[part.id];
            return updatePartMutation.mutateAsync({
              listingId: editingId,
              partId: part.dbId,
              input: {
                weight: parseFloat(edited.weight) || 0,
                minPrice: parseInt(edited.minPrice) || 0,
                isIncluded: edited.isIncluded,
              },
            });
          });
        await Promise.all(partUpdates);
      }
      }

      setEditingId(null);
      setEditMode('full');
      setSecondaryPassword('');
      setPasswordError(false);
      setEditPartsData({});
    } catch (error) {
      console.error('수정 실패:', error);
      alert('수정에 실패했습니다.');
    }
  };

  // 전체 승인
  const pendingAuctions = auctions.filter(a => a.status === '대기');
  const [isApprovingAll, setIsApprovingAll] = useState(false);

  const handleApproveAll = async () => {
    if (pendingAuctions.length === 0) {
      alert('승인할 대기 상장이 없습니다.');
      return;
    }
    if (!confirm(`대기 상태인 ${pendingAuctions.length}건을 전체 승인하시겠습니까?`)) return;

    setIsApprovingAll(true);
    let successCount = 0;
    let failCount = 0;

    for (const auction of pendingAuctions) {
      try {
        await approveListing.mutateAsync({ id: auction.id });
        successCount++;
      } catch {
        failCount++;
      }
    }

    setIsApprovingAll(false);
    if (failCount > 0) {
      alert(`${successCount}건 승인 완료, ${failCount}건 실패`);
    } else {
      alert(`${successCount}건 전체 승인 완료`);
    }
  };

  // 상태 변경 핸들러
  const handleStatusChange = async (auctionId: string, newStatus: AuctionStatus) => {
    if (newStatus === '승인') {
      try {
        await approveListing.mutateAsync({ id: auctionId });
      } catch (error) {
        console.error('승인 실패:', error);
        alert('승인에 실패했습니다.');
      }
    } else if (newStatus === '대기') {
      try {
        await updateListing.mutateAsync({
          id: auctionId,
          input: { status: 'pending' },
        });
      } catch (error) {
        console.error('대기 상태 변경 실패:', error);
        alert('상태 변경에 실패했습니다.');
      }
    }
  };

  // 상장 삭제 핸들러
  const handleDelete = async (auctionId: string) => {
    const auction = auctions.find(a => a.id === auctionId);
    if (!auction) return;
    
    if (auction.status === '승인' || auction.status === '경매중') {
      alert('승인 또는 경매중인 상장은 삭제할 수 없습니다.');
      return;
    }
    
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
      await deleteListing.mutateAsync(auctionId);
    } catch (error) {
      console.error('삭제 실패:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  // 부위 정보 수정 (로컬 상태 업데이트, 저장 시 API 호출)
  const handlePartChange = (partId: number, field: 'weight' | 'minPrice', value: string) => {
    setEditPartsData((prev) => ({
      ...prev,
      [partId]: { ...prev[partId], [field]: value },
    }));
  };

  // 부위 포함/제외 토글 (로컬 상태 업데이트, 저장 시 API 호출)
  const togglePartIncluded = (partId: number) => {
    setEditPartsData((prev) => ({
      ...prev,
      [partId]: { ...prev[partId], isIncluded: !prev[partId]?.isIncluded },
    }));
  };

  // 필터링된 데이터 (API에서 이미 필터링됨)
  const filteredAuctions = auctions;

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

  const handlePrint = () => {
    if (filteredAuctions.length === 0) {
      alert('인쇄할 데이터가 없습니다.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const statusBadge = (status: string) => {
      switch (status) {
        case '경매중': return '<span style="padding:1px 6px;font-size:9px;font-weight:600;color:#15803d;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:3px">경매중</span>';
        case '마감': return '<span style="padding:1px 6px;font-size:9px;font-weight:600;color:#6b7280;background:#f3f4f6;border-radius:3px">마감</span>';
        case '승인': return '<span style="padding:1px 6px;font-size:9px;font-weight:600;color:#1d4ed8;background:#eff6ff;border:1px solid #bfdbfe;border-radius:3px">승인</span>';
        default: return `<span style="font-size:9px;color:#6b7280">${status}</span>`;
      }
    };

    const listingsHtml = filteredAuctions.map((auction) => {
      const allParts = auction.parts;

      const partsGridHtml = [0, 1, 2].map(colIndex => {
        const rows = Array.from({ length: 7 }).map((_, idx) => {
          const part = allParts[colIndex * 7 + idx];
          if (!part) {
            return '<tr><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>';
          }
          const excluded = !part.isIncluded;
          const cls = excluded ? 'color:#9ca3af;' : '';
          const strike = excluded ? 'text-decoration:line-through;' : '';
          return `<tr style="${excluded ? 'background:#f3f4f6;' : ''}">
            <td style="${cls}${strike}">${part.isIncluded ? generateListingNo(auction.auctionNo, colIndex * 7 + idx) : '-'}</td>
            <td style="${cls}${strike}${!excluded ? 'font-weight:500;color:#111;' : ''}">${part.name}</td>
            <td style="${cls}">${part.isIncluded ? part.weight + 'kg' : '-'}</td>
            <td style="${cls}">${part.isIncluded ? part.minPrice.toLocaleString() : '-'}</td>
            <td>${part.isIncluded && part.bidPrice ? '<b style="color:#111">' + part.bidPrice.toLocaleString() + '</b>' : '<span style="color:#9ca3af">-</span>'}</td>
          </tr>`;
        }).join('');

        return `<table class="parts-col">
          <thead><tr><th>상장번호</th><th>부위</th><th>중량</th><th>최저가격</th><th>낙찰가격</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
      }).join('');

      return `
        <tbody class="listing-group">
        <tr class="listing-row">
          <td class="td bold">${auction.auctionNo}</td>
          <td class="td">${auction.breed}</td>
          <td class="td">${auction.gender}</td>
          <td class="td bold">${auction.grade}</td>
          <td class="td">${auction.monthAge}</td>
          <td class="td">${auction.backFat}</td>
          <td class="td">${auction.eyeMuscle}</td>
          <td class="td">${auction.fatMarbling || ''}</td>
          <td class="td">${auction.meatColor}</td>
          <td class="td">${auction.fatColor}</td>
          <td class="td">${auction.texture}</td>
          <td class="td">${auction.maturity}</td>
          <td class="td trace">002-${auction.traceNo || ''}</td>
          <td class="td">${auction.slaughterHouse || ''}</td>
          <td class="td">${auction.slaughterDate}</td>
          <td class="td">${auction.slaughterNo || ''}</td>
          <td class="td">${auction.carcassWeight}</td>
          <td class="td">${auction.company || ''}</td>
          <td class="td">${auction.processDate}</td>
          <td class="td">${auction.processWeight}</td>
          <td class="td">${statusBadge(auction.status)}</td>
        </tr>
        <tr>
          <td colspan="21" class="parts-cell">
            <div class="parts-label">부위: ${allParts.filter(p => p.isIncluded).length}/${allParts.length}</div>
            <div class="parts-grid">${partsGridHtml}</div>
          </td>
        </tr>
        </tbody>`;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>부분육 상장 조회</title>
          <style>
            @page { size: A4 landscape; margin: 8mm; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Malgun Gothic', sans-serif; font-size: 9px; color: #333; }
            .header { text-align: center; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 2px solid #333; }
            .header h1 { font-size: 14px; margin-bottom: 2px; }
            .header p { font-size: 9px; color: #666; }
            .main-table { width: 100%; border-collapse: collapse; }
            .main-table thead { display: table-header-group; }
            .th { padding: 4px 2px; text-align: center; font-size: 8px; font-weight: 600; color: #4b5563; white-space: nowrap; border: 1px solid #e5e7eb; background: #f9fafb; }
            .td { padding: 4px 2px; text-align: center; font-size: 8px; white-space: nowrap; border: 1px solid #e5e7eb; color: #4b5563; }
            .td.bold { font-weight: 600; color: #111827; }
            .td.trace { font-size: 7px; }
            .parts-cell { padding: 6px 8px; background: #fff; border: 1px solid #e5e7eb; }
            .parts-label { font-size: 9px; font-weight: 600; color: #374151; margin-bottom: 4px; }
            .parts-grid { display: flex; gap: 8px; }
            .parts-col { flex: 1; border-collapse: collapse; border: 1px solid #e5e7eb; }
            .parts-col th { padding: 3px 2px; text-align: center; font-size: 8px; font-weight: 600; color: #4b5563; background: #f9fafb; border-right: 1px solid #e5e7eb; }
            .parts-col td { padding: 2px 2px; text-align: center; font-size: 8px; border-top: 1px solid #f3f4f6; border-right: 1px solid #e5e7eb; }
            .parts-col th:last-child, .parts-col td:last-child { border-right: none; }
            .listing-group { page-break-inside: avoid; }
            .footer { font-size: 9px; color: #6b7280; padding-top: 6px; border-top: 1px solid #e5e7eb; margin-top: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>부분육 상장 조회</h1>
            <p>조회기간: ${searchStartDate} ~ ${searchEndDate} | 총 ${filteredAuctions.length}건</p>
          </div>
          <table class="main-table">
            <thead>
              <tr>
                <th class="th">접수번호</th>
                <th class="th">축종</th>
                <th class="th">성별</th>
                <th class="th">등급</th>
                <th class="th">개월령</th>
                <th class="th">등지방</th>
                <th class="th">등심면적</th>
                <th class="th">근내지방</th>
                <th class="th">육색</th>
                <th class="th">지방색</th>
                <th class="th">조직감</th>
                <th class="th">성숙도</th>
                <th class="th">이력번호</th>
                <th class="th">도축장</th>
                <th class="th">도축일</th>
                <th class="th">도축번호</th>
                <th class="th">도체중</th>
                <th class="th">상장업체</th>
                <th class="th">가공일</th>
                <th class="th">가공중량</th>
                <th class="th">상태</th>
              </tr>
            </thead>
            ${listingsHtml}
          </table>
          <div class="footer">총 ${filteredAuctions.length}개</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
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
          </div>

          {/* 상장업체 필터 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">상장업체</span>
            <select
              value={companyFilter}
              onChange={(e) => {
                setCompanyFilter(e.target.value);
              }}
              className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
            >
              <option value="all">전체</option>
              {companies.map(company => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleSearch}
            className="px-4 py-1.5 bg-gray-900 text-white text-xs hover:bg-gray-800"
          >
            조회
          </button>
          <button
            type="button"
            onClick={() => {
              setStartDate(tomorrowDateString);
              setEndDate(tomorrowDateString);
              setCompanyFilter('all');
              setSearchStartDate(tomorrowDateString);
              setSearchEndDate(tomorrowDateString);
              setSearchCompanyFilter('all');
              if (startDateRef.current) startDateRef.current.value = tomorrowDateString;
              if (endDateRef.current) endDateRef.current.value = tomorrowDateString;
            }}
            className="px-4 py-1.5 border border-gray-300 text-gray-600 text-xs hover:bg-gray-50"
          >
            초기화
          </button>

          <div className="flex items-center gap-2 ml-auto">
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
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-700 text-white text-xs hover:bg-gray-800"
            >
              <Printer className="w-3.5 h-3.5" />
              인쇄
            </button>
            <button
              type="button"
              onClick={handleApproveAll}
              disabled={isApprovingAll || pendingAuctions.length === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-xs hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-3.5 h-3.5" />
              전체 승인{pendingAuctions.length > 0 ? ` (${pendingAuctions.length}건)` : ''}
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
              {isLoading ? (
                <tr>
                  <td colSpan={23} className="px-4 py-8 text-center text-gray-500 border border-gray-200">
                    데이터를 불러오는 중...
                  </td>
                </tr>
              ) : filteredAuctions.length === 0 ? (
                <tr>
                  <td colSpan={23} className="px-4 py-8 text-center text-gray-500 border border-gray-200">
                    등록된 상장이 없습니다.
                  </td>
                </tr>
              ) : filteredAuctions.map((auction) => (
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
                    {editingId === auction.id && editMode === 'full' ? (
                      <>
                        <td className="px-1 py-1 text-center whitespace-nowrap border border-gray-200">
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
                        <td className="px-1 py-1 text-center whitespace-nowrap border border-gray-200">
                          <select
                            value={editFormData.grade}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setEditFormData({ ...editFormData, grade: e.target.value })}
                            className="w-20 px-1 py-1 text-xs border border-gray-300 outline-none bg-white text-center"
                          >
                            <option value="1++A">1++A</option>
                            <option value="1++B">1++B</option>
                            <option value="1++C">1++C</option>
                            <option value="1+A">1+A</option>
                            <option value="1+B">1+B</option>
                            <option value="1+C">1+C</option>
                            <option value="1A">1A</option>
                            <option value="1B">1B</option>
                            <option value="1C">1C</option>
                            <option value="2A">2A</option>
                            <option value="2B">2B</option>
                            <option value="2C">2C</option>
                          </select>
                        </td>
                        <td className="px-1 py-1 text-center whitespace-nowrap border border-gray-200">
                          <input type="number" value={editFormData.monthAge} onClick={(e) => e.stopPropagation()} onChange={(e) => setEditFormData({ ...editFormData, monthAge: e.target.value })} className="w-10 px-1 py-1 text-xs border border-gray-300 outline-none bg-white text-center" />
                        </td>
                        <td className="px-1 py-1 text-center whitespace-nowrap border border-gray-200">
                          <input type="number" value={editFormData.backFat} onClick={(e) => e.stopPropagation()} onChange={(e) => setEditFormData({ ...editFormData, backFat: e.target.value })} className="w-10 px-1 py-1 text-xs border border-gray-300 outline-none bg-white text-center" />
                        </td>
                        <td className="px-1 py-1 text-center whitespace-nowrap border border-gray-200">
                          <input type="number" value={editFormData.eyeMuscle} onClick={(e) => e.stopPropagation()} onChange={(e) => setEditFormData({ ...editFormData, eyeMuscle: e.target.value })} className="w-10 px-1 py-1 text-xs border border-gray-300 outline-none bg-white text-center" />
                        </td>
                        <td className="px-1 py-1 text-center whitespace-nowrap border border-gray-200">
                          <input type="number" value={editFormData.fatMarbling} onClick={(e) => e.stopPropagation()} onChange={(e) => setEditFormData({ ...editFormData, fatMarbling: e.target.value })} className="w-10 px-1 py-1 text-xs border border-gray-300 outline-none bg-white text-center" />
                        </td>
                        <td className="px-1 py-1 text-center whitespace-nowrap border border-gray-200">
                          <input type="number" value={editFormData.meatColor} onClick={(e) => e.stopPropagation()} onChange={(e) => setEditFormData({ ...editFormData, meatColor: e.target.value })} className="w-8 px-1 py-1 text-xs border border-gray-300 outline-none bg-white text-center" />
                        </td>
                        <td className="px-1 py-1 text-center whitespace-nowrap border border-gray-200">
                          <input type="number" value={editFormData.fatColor} onClick={(e) => e.stopPropagation()} onChange={(e) => setEditFormData({ ...editFormData, fatColor: e.target.value })} className="w-8 px-1 py-1 text-xs border border-gray-300 outline-none bg-white text-center" />
                        </td>
                        <td className="px-1 py-1 text-center whitespace-nowrap border border-gray-200">
                          <input type="number" value={editFormData.texture} onClick={(e) => e.stopPropagation()} onChange={(e) => setEditFormData({ ...editFormData, texture: e.target.value })} className="w-8 px-1 py-1 text-xs border border-gray-300 outline-none bg-white text-center" />
                        </td>
                        <td className="px-1 py-1 text-center whitespace-nowrap border border-gray-200">
                          <input type="number" value={editFormData.maturity} onClick={(e) => e.stopPropagation()} onChange={(e) => setEditFormData({ ...editFormData, maturity: e.target.value })} className="w-8 px-1 py-1 text-xs border border-gray-300 outline-none bg-white text-center" />
                        </td>
                        <td className="px-1 py-1 text-center whitespace-nowrap border border-gray-200">
                          <div className="flex items-center justify-center gap-0.5"><span className="text-[10px] text-gray-500">002-</span><input type="text" value={editFormData.traceNo} onClick={(e) => e.stopPropagation()} onChange={(e) => setEditFormData({ ...editFormData, traceNo: e.target.value })} className="w-20 px-1 py-1 text-[10px] border border-gray-300 outline-none bg-white text-center" /></div>
                        </td>
                        <td className="px-2 py-3 text-xs border border-gray-200 text-gray-600 text-center whitespace-nowrap cursor-default" title="농협 음성">{auction.slaughterHouse}</td>
                        <td className="px-1 py-1 text-center whitespace-nowrap border border-gray-200">
                          <input type="text" value={editFormData.slaughterDate} onClick={(e) => e.stopPropagation()} onChange={(e) => setEditFormData({ ...editFormData, slaughterDate: e.target.value })} className="w-20 px-1 py-1 text-xs border border-gray-300 outline-none bg-white text-center" />
                        </td>
                        <td className="px-1 py-1 text-center whitespace-nowrap border border-gray-200">
                          <input type="text" value={editFormData.slaughterNo} onClick={(e) => e.stopPropagation()} onChange={(e) => setEditFormData({ ...editFormData, slaughterNo: e.target.value })} className="w-12 px-1 py-1 text-xs border border-gray-300 outline-none bg-white text-center" />
                        </td>
                        <td className="px-1 py-1 text-center whitespace-nowrap border border-gray-200">
                          <input type="number" value={editFormData.carcassWeight} onClick={(e) => e.stopPropagation()} onChange={(e) => setEditFormData({ ...editFormData, carcassWeight: e.target.value })} className="w-12 px-1 py-1 text-xs border border-gray-300 outline-none bg-white text-center" />
                        </td>
                        <td className="px-2 py-3 text-xs border border-gray-200 text-gray-600 text-center whitespace-nowrap">{auction.company}</td>
                        <td className="px-1 py-1 text-center whitespace-nowrap border border-gray-200">
                          <input type="text" value={editFormData.processDate} onClick={(e) => e.stopPropagation()} onChange={(e) => setEditFormData({ ...editFormData, processDate: e.target.value })} className="w-20 px-1 py-1 text-xs border border-gray-300 outline-none bg-white text-center" />
                        </td>
                        <td className="px-1 py-1 text-center whitespace-nowrap border border-gray-200">
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
                        <td className="px-2 py-3 text-[10px] border border-gray-200 text-gray-600 text-center whitespace-nowrap">002-{auction.traceNo}</td>
                        <td className="px-2 py-3 text-xs border border-gray-200 text-gray-600 text-center whitespace-nowrap cursor-default" title="농협 음성">{auction.slaughterHouse}</td>
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
                      {auction.status === '경매중' ? (
                        <span className="px-2 py-0.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded">
                          경매중
                        </span>
                      ) : auction.status === '마감' ? (
                        <span className="px-2 py-0.5 text-xs font-medium text-gray-500 bg-gray-100 rounded">
                          마감
                        </span>
                      ) : (
                        <select
                          value={auction.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleStatusChange(auction.id, e.target.value as AuctionStatus)}
                          className="px-1 py-0.5 text-xs font-medium border border-gray-200 cursor-pointer outline-none bg-white text-gray-700"
                        >
                          {STATUS_OPTIONS.filter(o => o.value !== '마감' && o.value !== '경매중').map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      )}
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
                          {editingId === auction.id && editMode !== 'minPrice' && (
                            <span className="text-xs text-gray-500">(체크박스로 상장 제외 가능)</span>
                          )}
                          {editingId === auction.id && editMode === 'minPrice' && (
                            <span className="text-xs text-blue-500">(최저가격만 수정 가능)</span>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          {/* 3열로 부위 데이터 표시 */}
                          {[0, 1, 2].map((colIndex) => (
                            <table key={colIndex} className="w-full bg-white border border-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  {editingId === auction.id && editMode !== 'minPrice' && (
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
                                        {editingId === auction.id && editMode !== 'minPrice' && (
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
                                  const isMinPriceOnly = isEditing && editMode === 'minPrice';
                                  const editedPart = editPartsData[part.id];
                                  const isIncluded = isEditing && editedPart ? editedPart.isIncluded : part.isIncluded;
                                  
                                  return (
                                    <tr key={part.id} className={`border-t border-gray-100 ${!isIncluded ? 'bg-gray-100' : ''}`}>
                                      {isEditing && !isMinPriceOnly && (
                                        <td className={`px-1 py-1 text-center border-r border-gray-200 ${!isIncluded ? 'bg-gray-100' : ''}`}>
                                          <input
                                            type="checkbox"
                                            checked={isIncluded}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={() => togglePartIncluded(part.id)}
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
                                        {isEditing && !isMinPriceOnly && isIncluded ? (
                                          <input
                                            type="number"
                                            value={editedPart?.weight ?? String(part.weight)}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => handlePartChange(part.id, 'weight', e.target.value)}
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
                                            value={editedPart?.minPrice ?? String(part.minPrice)}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => handlePartChange(part.id, 'minPrice', e.target.value)}
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
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditing(auction);
                                }}
                                disabled={auction.status !== '대기'}
                                className="px-4 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                수정
                              </button>
                              {auction.status === '경매중' && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startMinPriceEditing(auction);
                                  }}
                                  className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                                >
                                  단가수정
                                </button>
                              )}
                            </>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(auction.id);
                            }}
                            disabled={auction.status === '승인' || auction.status === '경매중' || auction.status === '마감' || deleteListing.isPending}
                            className="px-4 py-1.5 text-xs font-medium text-white bg-gray-700 hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* 총 건수 */}
        <div className="px-6 py-3 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            총 {filteredAuctions.length}개
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
                <h3 className="text-lg font-bold text-gray-900">상장 사진 / 증명서</h3>
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
              {/* 상장 사진 */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">상장 사진</h4>
                {photoModalAuction.images.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {photoModalAuction.images.map((img, index) => (
                      <div key={index} className="space-y-2">
                        <p className="text-xs font-medium text-gray-600 text-center">사진 {index + 1}</p>
                        <img 
                          src={img} 
                          alt={`사진 ${index + 1}`}
                          className="w-full h-40 object-cover border border-gray-200"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">등록된 사진이 없습니다.</p>
                )}
              </div>

              {/* 증명서 */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">증명서</h4>
                <div className="flex gap-4 justify-center">
                  {/* 도축검사증명서 */}
                  <div className="space-y-2 w-32">
                    <p className="text-xs font-medium text-gray-600 text-center">도축검사증명서</p>
                    {photoModalAuction.slaughterCert?.fileData ? (
                      <div 
                        className="w-full border border-gray-200 cursor-pointer hover:opacity-80 overflow-hidden transition-opacity"
                        style={{ aspectRatio: '210/297' }}
                        onClick={() => setEnlargedImage(photoModalAuction.slaughterCert?.fileData || null)}
                      >
                        <img 
                          src={photoModalAuction.slaughterCert.fileData} 
                          alt="도축검사증명서"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div 
                        className="w-full border border-dashed border-gray-300 flex items-center justify-center bg-gray-50"
                        style={{ aspectRatio: '210/297' }}
                      >
                        <span className="text-xs text-gray-400">미등록</span>
                      </div>
                    )}
                  </div>
                  
                  {/* 등급판정확인서 */}
                  <div className="space-y-2 w-32">
                    <p className="text-xs font-medium text-gray-600 text-center">등급판정확인서</p>
                    {photoModalAuction.gradeCert?.fileData ? (
                      <div 
                        className="w-full border border-gray-200 cursor-pointer hover:opacity-80 overflow-hidden transition-opacity"
                        style={{ aspectRatio: '210/297' }}
                        onClick={() => setEnlargedImage(photoModalAuction.gradeCert?.fileData || null)}
                      >
                        <img 
                          src={photoModalAuction.gradeCert.fileData} 
                          alt="등급판정확인서"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div 
                        className="w-full border border-dashed border-gray-300 flex items-center justify-center bg-gray-50"
                        style={{ aspectRatio: '210/297' }}
                      >
                        <span className="text-xs text-gray-400">미등록</span>
                      </div>
                    )}
                  </div>
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

      {/* 확대 이미지 모달 */}
      {enlargedImage && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80"
          onClick={() => setEnlargedImage(null)}
        >
          <div className="relative mx-4 max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img 
              id="print-area"
              src={enlargedImage}
              alt="증명서"
              className="max-w-full max-h-[90vh] object-contain bg-white shadow-lg"
            />
            <div className="absolute top-2 right-2 flex gap-2">
              <button
                onClick={() => {
                  const printWindow = window.open('', '_blank');
                  if (!printWindow) return;
                  
                  printWindow.document.write(`
                    <html>
                      <head>
                        <title>증명서 인쇄</title>
                        <style>
                          @page { size: A4; margin: 10mm; }
                          body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                          img { max-width: 100%; max-height: 100%; object-fit: contain; }
                        </style>
                      </head>
                      <body>
                        <img src="${enlargedImage}" />
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                  printWindow.onload = () => {
                    printWindow.print();
                    printWindow.close();
                  };
                }}
                className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100 shadow-lg"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                onClick={() => setEnlargedImage(null)}
                className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100 shadow-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
