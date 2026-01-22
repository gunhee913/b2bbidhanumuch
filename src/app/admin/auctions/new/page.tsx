'use client';

import React, { useState, useRef } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Save, Upload, X, Plus, ChevronDown, ChevronUp, Trash2, Download, FileSpreadsheet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';

// number input 스피너, date input 달력 아이콘 숨기기 스타일
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
  weight: string;
  minPrice: string;
  isIncluded: boolean; // 등록 포함 여부
}

// 증명서 데이터 타입
interface CertificateData {
  fileName: string;
  fileData: string; // base64
  fileType: string; // 'image' | 'pdf'
}

// 개체 데이터 타입
interface CattleData {
  id: number;
  seqNo: string;
  breed: string;
  gender: string;
  grade: string;
  marbling: string;
  monthAge: string;
  carcassWeight: string;
  traceNo: string;
  backFat: string;
  eyeMuscle: string;
  fatMarbling: string;
  meatColor: string;
  fatColor: string;
  texture: string;
  maturity: string;
  slaughterHouse: string;
  slaughterDate: string;
  slaughterNo: string;
  processDate: string;
  processWeight: string;
  parts: PartData[];
  images: string[];
  slaughterCert: CertificateData | null; // 도축검사증명서
  gradeCert: CertificateData | null;     // 등급판정확인서
  isExpanded: boolean;
}

// 기본 19개 부위 생성
const createDefaultParts = (): PartData[] => [
  { id: 1, name: '등심(좌)', weight: '', minPrice: '', isIncluded: true },
  { id: 2, name: '등심(우)', weight: '', minPrice: '', isIncluded: true },
  { id: 3, name: '안심', weight: '', minPrice: '', isIncluded: true },
  { id: 4, name: '채끝', weight: '', minPrice: '', isIncluded: true },
  { id: 5, name: '갈비(좌)', weight: '', minPrice: '', isIncluded: true },
  { id: 6, name: '갈비(우)', weight: '', minPrice: '', isIncluded: true },
  { id: 7, name: '특수부위', weight: '', minPrice: '', isIncluded: true },
  { id: 8, name: '설도(좌)', weight: '', minPrice: '', isIncluded: true },
  { id: 9, name: '설도(우)', weight: '', minPrice: '', isIncluded: true },
  { id: 10, name: '앞다리', weight: '', minPrice: '', isIncluded: true },
  { id: 11, name: '우둔', weight: '', minPrice: '', isIncluded: true },
  { id: 12, name: '목심', weight: '', minPrice: '', isIncluded: true },
  { id: 13, name: '양지(좌)', weight: '', minPrice: '', isIncluded: true },
  { id: 14, name: '양지(우)', weight: '', minPrice: '', isIncluded: true },
  { id: 15, name: '사태', weight: '', minPrice: '', isIncluded: true },
  { id: 16, name: '꼬리', weight: '', minPrice: '', isIncluded: true },
  { id: 17, name: '족', weight: '', minPrice: '', isIncluded: true },
  { id: 18, name: '사골', weight: '', minPrice: '', isIncluded: true },
  { id: 19, name: '잡뼈', weight: '', minPrice: '', isIncluded: true },
];

// 새 개체 생성
const createNewCattle = (id: number, seqNo: string): CattleData => ({
  id,
  seqNo,
  breed: '한우',
  gender: '',
  grade: '',
  marbling: '',
  monthAge: '',
  carcassWeight: '',
  traceNo: '',
  backFat: '',
  eyeMuscle: '',
  fatMarbling: '',
  meatColor: '',
  fatColor: '',
  texture: '',
  maturity: '',
  slaughterHouse: '음성',
  slaughterDate: '',
  slaughterNo: '',
  processDate: '',
  processWeight: '',
  parts: createDefaultParts(),
  images: [],
  slaughterCert: null,
  gradeCert: null,
  isExpanded: true,
});

// 가공업체별 접수번호 prefix
const COMPANY_PREFIX: Record<string, string> = {
  '건화': '100',
  '대진엠에스': '200',
  '안심엘피씨': '300',
  '정직한고기': '400',
};

// 내일 날짜 (YYYY-MM-DD) - input date용
const getTomorrowDateString = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const tomorrowDateString = getTomorrowDateString();

export default function NewAuctionPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 공통 정보
  const [listingDate, setListingDate] = useState(tomorrowDateString);
  const [company, setCompany] = useState('');
  
  // 이미지 확대 모달
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  
  // 개체 목록
  const [cattleList, setCattleList] = useState<CattleData[]>([
    createNewCattle(1, '1')
  ]);

  // 상장일자 기반 날짜 코드 생성 (YYMMDD)
  const getDateCode = () => {
    if (!listingDate) return '';
    const date = new Date(listingDate);
    const year = String(date.getFullYear()).slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };

  // 접수번호 생성
  const getAuctionNo = (seqNo: string) => {
    if (!company) return '-';
    const dateCode = getDateCode();
    const basePrefix = COMPANY_PREFIX[company] || '100';
    const prefixBase = basePrefix.charAt(0);
    const seq = String(seqNo || '1').padStart(2, '0');
    return `${dateCode}-${prefixBase}${seq}`;
  };

  // 상장번호 생성
  const getListingNo = (seqNo: string, partIndex: number) => {
    if (!company) return '-';
    const dateCode = getDateCode();
    const basePrefix = COMPANY_PREFIX[company] || '100';
    const prefixBase = basePrefix.charAt(0);
    const seq = String(seqNo || '1').padStart(2, '0');
    return `${dateCode}-${prefixBase}${seq}-${String(partIndex + 1).padStart(2, '0')}`;
  };

  // 이력번호 포맷팅
  const formatTraceNo = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, '');
    if (numbers.length <= 4) return numbers;
    if (numbers.length <= 8) return `${numbers.slice(0, 4)}-${numbers.slice(4)}`;
    return `${numbers.slice(0, 4)}-${numbers.slice(4, 8)}-${numbers.slice(8, 9)}`;
  };

  // 개체 추가
  const addCattle = () => {
    if (cattleList.length >= 10) {
      alert('최대 10두까지 등록할 수 있습니다.');
      return;
    }
    const newSeqNo = String(cattleList.length + 1);
    setCattleList([...cattleList, createNewCattle(Date.now(), newSeqNo)]);
  };

  // 개체 삭제
  const removeCattle = (id: number) => {
    if (cattleList.length === 1) {
      alert('최소 1두는 등록해야 합니다.');
      return;
    }
    const newList = cattleList.filter(c => c.id !== id);
    // 순번 재정렬
    setCattleList(newList.map((c, idx) => ({ ...c, seqNo: String(idx + 1) })));
  };

  // 개체 정보 수정
  const updateCattle = (id: number, field: keyof CattleData, value: string | boolean) => {
    setCattleList(cattleList.map(c => {
      if (c.id !== id) return c;
      if (field === 'grade' && !String(value).startsWith('1++')) {
        return { ...c, [field]: String(value), marbling: '' };
      }
      if (field === 'traceNo') {
        return { ...c, [field]: formatTraceNo(String(value)) };
      }
      if (field === 'isExpanded') {
        return { ...c, [field]: Boolean(value) };
      }
      return { ...c, [field]: String(value) };
    }));
  };

  // 부위 정보 수정
  const updatePart = (cattleId: number, partId: number, field: 'weight' | 'minPrice', value: string) => {
    // 최저가격은 콤마 제거하고 숫자만 저장
    const cleanValue = field === 'minPrice' ? value.replace(/,/g, '').replace(/[^0-9]/g, '') : value;
    setCattleList(cattleList.map(c => {
      if (c.id !== cattleId) return c;
      return {
        ...c,
        parts: c.parts.map(p => p.id === partId ? { ...p, [field]: cleanValue } : p)
      };
    }));
  };

  // 부위 포함/제외 토글
  const togglePartIncluded = (cattleId: number, partId: number) => {
    setCattleList(cattleList.map(c => {
      if (c.id !== cattleId) return c;
      return {
        ...c,
        parts: c.parts.map(p => p.id === partId ? { ...p, isIncluded: !p.isIncluded } : p)
      };
    }));
  };
  
  // 가격 표시용 포맷 (천단위 콤마)
  const displayPrice = (value: string) => {
    if (!value) return '';
    const num = parseInt(value.replace(/,/g, ''), 10);
    if (isNaN(num)) return '';
    return num.toLocaleString('ko-KR');
  };

  // 접기/펼치기
  const toggleExpand = (id: number) => {
    setCattleList(cattleList.map(c => 
      c.id === id ? { ...c, isExpanded: !c.isExpanded } : c
    ));
  };

  // 이미지 업로드 ref
  const imageInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  // 이미지 업로드 처리
  const handleImageUpload = (cattleId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const cattle = cattleList.find(c => c.id === cattleId);
    if (!cattle) return;

    const remainingSlots = 4 - cattle.images.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach(file => {
      if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드 가능합니다.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        setCattleList(prev => prev.map(c => {
          if (c.id !== cattleId) return c;
          if (c.images.length >= 4) return c;
          return { ...c, images: [...c.images, imageUrl] };
        }));
      };
      reader.readAsDataURL(file);
    });

    // input 초기화 (같은 파일 다시 선택 가능하도록)
    e.target.value = '';
  };

  // 이미지 삭제
  const removeImage = (cattleId: number, index: number) => {
    setCattleList(cattleList.map(c => {
      if (c.id !== cattleId) return c;
      return { ...c, images: c.images.filter((_, i) => i !== index) };
    }));
  };

  // 증명서 업로드 ref
  const slaughterCertInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const gradeCertInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  // 증명서 업로드 처리
  const handleCertUpload = (
    cattleId: number, 
    certType: 'slaughterCert' | 'gradeCert', 
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 제한 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('파일 크기는 5MB 이하만 가능합니다.');
      e.target.value = '';
      return;
    }

    // 파일 형식 확인 (이미지만)
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const fileData = event.target?.result as string;
      const certData: CertificateData = {
        fileName: file.name,
        fileData,
        fileType: 'image'
      };
      
      setCattleList(prev => prev.map(c => {
        if (c.id !== cattleId) return c;
        return { ...c, [certType]: certData };
      }));
    };
    reader.readAsDataURL(file);

    e.target.value = '';
  };

  // 증명서 삭제
  const removeCert = (cattleId: number, certType: 'slaughterCert' | 'gradeCert') => {
    setCattleList(cattleList.map(c => {
      if (c.id !== cattleId) return c;
      return { ...c, [certType]: null };
    }));
  };

  // 증명서 열기 (모달로 크게 보기)
  const openCert = (cert: CertificateData) => {
    setViewingImage(cert.fileData);
  };

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    alert(`${cattleList.length}두 상장 등록이 완료되었습니다.`);
    router.push('/admin/auctions');
  };

  // 숫자 천단위 콤마 포맷
  const formatNumber = (num: number) => num.toLocaleString('ko-KR');
  
  // 콤마 제거하고 숫자로 파싱
  const parseNumber = (str: string) => String(str).replace(/,/g, '');

  // 엑셀 템플릿 다운로드
  const downloadExcelTemplate = () => {
    // 개체 정보 시트
    const cattleHeaders = [
      '순번', '축종', '성별', '등급', '근내지방등급', '개월령', '도체중', '이력번호',
      '등지방', '등심면적', '근내지방', '육색', '지방색', '조직감', '성숙도',
      '도축장', '도축일', '도축번호', '가공일', '가공중량'
    ];
    
    const sampleCattleData = [
      ['1', '한우', '거세', '1++A', '9', '32', '520', '0023-4567-8', '15', '98', '9', '5', '3', '1', '2', '음성', '2026-01-15', '201', '2026-01-16', '312'],
      ['2', '한우', '암', '1+A', '', '30', '480', '0023-4567-9', '12', '92', '6', '4', '3', '1', '2', '음성', '2026-01-15', '202', '2026-01-16', '290'],
    ];
    
    const cattleSheet = XLSX.utils.aoa_to_sheet([cattleHeaders, ...sampleCattleData]);
    cattleSheet['!cols'] = cattleHeaders.map(() => ({ wch: 12 }));

    // 부위별 정보 시트
    const partHeaders = ['순번', '부위명', '중량(kg)', '최저가격(원)'];
    const partNames = createDefaultParts().map(p => p.name);
    
    const samplePartData = [
      // 1번 개체 (최저가격에 천단위 콤마 적용)
      ...partNames.map((name, idx) => ['1', name, (10 + idx * 0.5).toFixed(1), formatNumber(100000 + idx * 5000)]),
      // 2번 개체
      ...partNames.map((name, idx) => ['2', name, (9 + idx * 0.4).toFixed(1), formatNumber(95000 + idx * 4500)]),
    ];
    
    const partsSheet = XLSX.utils.aoa_to_sheet([partHeaders, ...samplePartData]);
    partsSheet['!cols'] = [{ wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];

    // 워크북 생성
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, cattleSheet, '개체정보');
    XLSX.utils.book_append_sheet(workbook, partsSheet, '부위별정보');

    // 다운로드
    XLSX.writeFile(workbook, '부분육_상장등록_템플릿.xlsx');
  };

  // 엑셀 파일 업로드 ref
  const excelInputRef = useRef<HTMLInputElement>(null);

  // 엑셀 파일 업로드 처리
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // 개체정보 시트 파싱
        const cattleSheet = workbook.Sheets['개체정보'];
        if (!cattleSheet) {
          alert('개체정보 시트를 찾을 수 없습니다.');
          return;
        }
        const cattleData = XLSX.utils.sheet_to_json<Record<string, string>>(cattleSheet);

        // 부위별정보 시트 파싱
        const partsSheet = workbook.Sheets['부위별정보'];
        if (!partsSheet) {
          alert('부위별정보 시트를 찾을 수 없습니다.');
          return;
        }
        const partsData = XLSX.utils.sheet_to_json<Record<string, string>>(partsSheet);

        // 개체별로 그룹핑
        const newCattleList: CattleData[] = cattleData.map((row, index) => {
          const seqNo = String(row['순번'] || index + 1);
          const cattle = createNewCattle(Date.now() + index, seqNo);
          
          // 개체 정보 매핑
          cattle.breed = row['축종'] || '한우';
          cattle.gender = row['성별'] || '';
          cattle.grade = row['등급'] || '';
          cattle.marbling = row['근내지방등급'] || '';
          cattle.monthAge = row['개월령'] || '';
          cattle.carcassWeight = row['도체중'] || '';
          cattle.traceNo = formatTraceNo(row['이력번호'] || '');
          cattle.backFat = row['등지방'] || '';
          cattle.eyeMuscle = row['등심면적'] || '';
          cattle.fatMarbling = row['근내지방'] || '';
          cattle.meatColor = row['육색'] || '';
          cattle.fatColor = row['지방색'] || '';
          cattle.texture = row['조직감'] || '';
          cattle.maturity = row['성숙도'] || '';
          cattle.slaughterHouse = row['도축장'] || '음성';
          cattle.slaughterDate = row['도축일'] || '';
          cattle.slaughterNo = row['도축번호'] || '';
          cattle.processDate = row['가공일'] || '';
          cattle.processWeight = row['가공중량'] || '';

          // 해당 개체의 부위 정보 찾기
          const cattleParts = partsData.filter(p => String(p['순번']) === seqNo);
          if (cattleParts.length > 0) {
            cattle.parts = cattle.parts.map(part => {
              const partData = cattleParts.find(p => p['부위명'] === part.name);
              if (partData) {
                return {
                  ...part,
                  weight: parseNumber(String(partData['중량(kg)'] || '')),
                  minPrice: parseNumber(String(partData['최저가격(원)'] || '')),
                };
              }
              return part;
            });
          }

          return cattle;
        });

        if (newCattleList.length === 0) {
          alert('업로드할 개체 데이터가 없습니다.');
          return;
        }

        if (newCattleList.length > 10) {
          alert('최대 10두까지만 등록할 수 있습니다. 처음 10두만 등록됩니다.');
          setCattleList(newCattleList.slice(0, 10));
        } else {
          setCattleList(newCattleList);
        }

        alert(`${Math.min(newCattleList.length, 10)}두의 데이터를 불러왔습니다.`);
      } catch (error) {
        console.error('엑셀 파싱 오류:', error);
        alert('엑셀 파일을 읽는 중 오류가 발생했습니다. 템플릿 형식을 확인해주세요.');
      }
    };

    reader.readAsArrayBuffer(file);
    // 같은 파일 다시 선택 가능하도록 초기화
    e.target.value = '';
  };

  // 공통 스타일
  const thClass = "px-2 py-2 text-xs font-medium text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50 text-center";
  const tdClass = "px-2 py-2 text-xs border border-gray-200 text-center";
  const selectClass = "w-full px-2 py-1 border border-gray-200 text-xs text-center outline-none bg-white";
  const inputClass = "px-2 py-1 border border-gray-200 text-xs text-center outline-none bg-white";

  return (
    <AdminLayout>
      <style dangerouslySetInnerHTML={{ __html: hideSpinnerStyle }} />
      
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">부분육상장등록</h1>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium text-gray-900">{cattleList.length}두</span>
          <span>/ 최대 10두</span>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* 공통 정보 */}
        <div className="bg-white shadow-sm border border-gray-100 p-4 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">상장일자</span>
                <input
                  type="date"
                  value={listingDate}
                  onChange={(e) => setListingDate(e.target.value)}
                  required
                  className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">상장업체</span>
                <select
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  required
                  className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white min-w-[120px]"
                >
                  <option value="">선택</option>
                  <option value="건화">건화</option>
                  <option value="대진엠에스">대진엠에스</option>
                  <option value="안심엘피씨">안심엘피씨</option>
                  <option value="정직한고기">정직한고기</option>
                </select>
              </div>
            </div>
            
            {/* 엑셀 업로드/다운로드 및 등록 버튼 */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={downloadExcelTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-600 text-xs hover:bg-gray-50"
              >
                <Download className="w-3.5 h-3.5" />
                템플릿 다운로드
              </button>
              <button
                type="button"
                onClick={() => excelInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 text-white text-xs hover:bg-gray-700"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                엑셀 업로드
              </button>
              <input
                ref={excelInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelUpload}
                className="hidden"
              />
              <button 
                type="submit" 
                disabled={isSubmitting} 
                className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-700 text-white text-xs hover:bg-gray-800 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    등록 중...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    {cattleList.length}두 일괄 등록
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 개체 목록 */}
        {cattleList.map((cattle, cattleIndex) => (
          <div key={cattle.id} className="bg-white shadow-sm border border-gray-100 mb-4 overflow-hidden">
            {/* 개체 헤더 */}
            <div 
              className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 cursor-pointer"
              onClick={() => toggleExpand(cattle.id)}
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-7 h-7 bg-gray-700 text-white text-sm font-bold">
                  {cattleIndex + 1}
                </span>
                <span className="font-medium text-gray-900">
                  {cattle.gender || '성별'} / {cattle.grade || '등급'}{cattle.marbling ? `(${cattle.marbling})` : ''} / {cattle.traceNo || '이력번호'}
                </span>
                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5">
                  접수번호: {getAuctionNo(cattle.seqNo)}
                </span>
                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5">
                  부위: {cattle.parts.filter(p => p.isIncluded).length}/{cattle.parts.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {cattleList.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeCattle(cattle.id); }}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    삭제
                  </button>
                )}
                {cattle.isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </div>
            </div>

            {/* 개체 내용 (접기/펼치기) */}
            {cattle.isExpanded && (
              <div className="p-4 space-y-4">
                {/* 개체 정보 테이블 */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr>
                        <th className={thClass}>순번</th>
                        <th className={thClass}>접수번호</th>
                        <th className={thClass}>축종</th>
                        <th className={thClass}>성별</th>
                        <th className={thClass}>등급</th>
                        <th className={thClass}>근내지방</th>
                        <th className={thClass}>개월령</th>
                        <th className={thClass}>도체중</th>
                        <th className={thClass}>이력번호</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className={`${tdClass} font-medium bg-gray-50`}>{cattle.seqNo}</td>
                        <td className={`${tdClass} font-medium text-gray-900 bg-gray-100`}>{getAuctionNo(cattle.seqNo)}</td>
                        <td className={tdClass}>
                          <select value={cattle.breed} onChange={(e) => updateCattle(cattle.id, 'breed', e.target.value)} className={selectClass}>
                            <option value="한우">한우</option>
                          </select>
                        </td>
                        <td className={tdClass}>
                          <select value={cattle.gender} onChange={(e) => updateCattle(cattle.id, 'gender', e.target.value)} required className={selectClass}>
                            <option value="">선택</option>
                            <option value="거세">거세</option>
                            <option value="암">암</option>
                          </select>
                        </td>
                        <td className={tdClass}>
                          <select value={cattle.grade} onChange={(e) => updateCattle(cattle.id, 'grade', e.target.value)} required className={selectClass}>
                            <option value="">선택</option>
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
                        <td className={tdClass}>
                          <select value={cattle.marbling} onChange={(e) => updateCattle(cattle.id, 'marbling', e.target.value)} disabled={!cattle.grade.startsWith('1++')} className={`${selectClass} disabled:bg-gray-100`}>
                            <option value="">-</option>
                            <option value="9">9</option>
                            <option value="8">8</option>
                            <option value="7">7</option>
                          </select>
                        </td>
                        <td className={tdClass}>
                          <input type="number" value={cattle.monthAge} onChange={(e) => updateCattle(cattle.id, 'monthAge', e.target.value)} placeholder="32" required className={`w-14 ${inputClass}`} />
                        </td>
                        <td className={tdClass}>
                          <input type="number" value={cattle.carcassWeight} onChange={(e) => updateCattle(cattle.id, 'carcassWeight', e.target.value)} placeholder="520" required className={`w-14 ${inputClass}`} />
                        </td>
                        <td className={tdClass}>
                          <input type="text" value={cattle.traceNo} onChange={(e) => updateCattle(cattle.id, 'traceNo', e.target.value)} placeholder="0000-0000-0" maxLength={11} required className={`w-28 ${inputClass}`} />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 등급 판정 + 도축/가공 정보 */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr>
                        <th className={thClass}>등지방</th>
                        <th className={thClass}>등심면적</th>
                        <th className={thClass}>근내지방</th>
                        <th className={thClass}>육색</th>
                        <th className={thClass}>지방색</th>
                        <th className={thClass}>조직감</th>
                        <th className={thClass}>성숙도</th>
                        <th className={thClass}>도축장</th>
                        <th className={thClass}>도축일</th>
                        <th className={thClass}>도축번호</th>
                        <th className={thClass}>가공일</th>
                        <th className={thClass}>가공중량</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className={tdClass}>
                          <input type="number" value={cattle.backFat} onChange={(e) => updateCattle(cattle.id, 'backFat', e.target.value)} placeholder="15" required className={`w-12 ${inputClass}`} />
                        </td>
                        <td className={tdClass}>
                          <input type="number" value={cattle.eyeMuscle} onChange={(e) => updateCattle(cattle.id, 'eyeMuscle', e.target.value)} placeholder="98" required className={`w-12 ${inputClass}`} />
                        </td>
                        <td className={tdClass}>
                          <input type="number" value={cattle.fatMarbling} onChange={(e) => updateCattle(cattle.id, 'fatMarbling', e.target.value)} placeholder="9" required className={`w-12 ${inputClass}`} />
                        </td>
                        <td className={tdClass}>
                          <input type="number" value={cattle.meatColor} onChange={(e) => updateCattle(cattle.id, 'meatColor', e.target.value)} placeholder="5" required className={`w-12 ${inputClass}`} />
                        </td>
                        <td className={tdClass}>
                          <input type="number" value={cattle.fatColor} onChange={(e) => updateCattle(cattle.id, 'fatColor', e.target.value)} placeholder="3" required className={`w-12 ${inputClass}`} />
                        </td>
                        <td className={tdClass}>
                          <input type="number" value={cattle.texture} onChange={(e) => updateCattle(cattle.id, 'texture', e.target.value)} placeholder="1" required className={`w-12 ${inputClass}`} />
                        </td>
                        <td className={tdClass}>
                          <input type="number" value={cattle.maturity} onChange={(e) => updateCattle(cattle.id, 'maturity', e.target.value)} placeholder="2" required className={`w-12 ${inputClass}`} />
                        </td>
                        <td className={tdClass}>
                          <select value={cattle.slaughterHouse} onChange={(e) => updateCattle(cattle.id, 'slaughterHouse', e.target.value)} className={`w-14 ${selectClass}`}>
                            <option value="음성">음성</option>
                          </select>
                        </td>
                        <td className={tdClass}>
                          <input 
                            type="date" 
                            value={cattle.slaughterDate} 
                            onChange={(e) => updateCattle(cattle.id, 'slaughterDate', e.target.value)} 
                            required 
                            className={`w-36 ${inputClass}`} 
                          />
                        </td>
                        <td className={tdClass}>
                          <input type="text" value={cattle.slaughterNo} onChange={(e) => updateCattle(cattle.id, 'slaughterNo', e.target.value)} placeholder="201" required className={`w-14 ${inputClass}`} />
                        </td>
                        <td className={tdClass}>
                          <input 
                            type="date" 
                            value={cattle.processDate} 
                            onChange={(e) => updateCattle(cattle.id, 'processDate', e.target.value)} 
                            required 
                            className={`w-36 ${inputClass}`} 
                          />
                        </td>
                        <td className={tdClass}>
                          <input type="number" value={cattle.processWeight} onChange={(e) => updateCattle(cattle.id, 'processWeight', e.target.value)} placeholder="312" required className={`w-14 ${inputClass}`} />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 부위별 정보 테이블 */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse table-fixed">
                    <thead>
                      <tr>
                        {[0, 1, 2].map(col => (
                          <React.Fragment key={col}>
                            <th className={`${thClass} w-[28px]`}></th>
                            <th className={`${thClass} w-[110px]`}>상장번호</th>
                            <th className={`${thClass} w-[70px]`}>부위</th>
                            <th className={`${thClass} w-[70px]`}>중량</th>
                            <th className={`${thClass} w-[85px]`}>최저가격</th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[0, 1, 2, 3, 4, 5, 6].map((rowIndex) => (
                        <tr key={rowIndex}>
                          {[0, 1, 2].map((colIndex) => {
                            const partIndex = rowIndex + colIndex * 7;
                            const part = cattle.parts[partIndex];
                            
                            if (!part) {
                              return (
                                <React.Fragment key={colIndex}>
                                  <td className={`${tdClass} text-gray-400`}></td>
                                  <td className={`${tdClass} text-gray-400`}>-</td>
                                  <td className={`${tdClass} text-gray-400`}>-</td>
                                  <td className={`${tdClass} text-gray-400`}>-</td>
                                  <td className={`${tdClass} text-gray-400`}>-</td>
                                </React.Fragment>
                              );
                            }
                            
                            const isIncluded = part.isIncluded;
                            
                            return (
                              <React.Fragment key={colIndex}>
                                <td className={`${tdClass} ${!isIncluded ? 'bg-gray-100' : ''}`}>
                                  <input
                                    type="checkbox"
                                    checked={isIncluded}
                                    onChange={() => togglePartIncluded(cattle.id, part.id)}
                                    className="w-4 h-4 rounded appearance-none bg-white border border-gray-300 checked:bg-gray-700 checked:border-gray-700 relative cursor-pointer
                                      after:content-['✓'] after:absolute after:inset-0 after:flex after:items-center after:justify-center after:text-white after:text-xs after:font-bold after:opacity-0 checked:after:opacity-100"
                                  />
                                </td>
                                <td className={`${tdClass} whitespace-nowrap text-[10px] ${!isIncluded ? 'bg-gray-100 text-gray-400 line-through' : 'text-gray-600'}`}>
                                  {isIncluded ? getListingNo(cattle.seqNo, partIndex) : '-'}
                                </td>
                                <td className={`${tdClass} font-medium whitespace-nowrap ${!isIncluded ? 'bg-gray-100 text-gray-400 line-through' : 'text-gray-900 bg-gray-50'}`}>
                                  {part.name}
                                </td>
                                <td className={`${tdClass} ${!isIncluded ? 'bg-gray-100' : ''}`}>
                                  <input
                                    type="number"
                                    value={part.weight}
                                    onChange={(e) => updatePart(cattle.id, part.id, 'weight', e.target.value)}
                                    placeholder="0.0"
                                    required={isIncluded}
                                    disabled={!isIncluded}
                                    step="0.1"
                                    className={`w-16 ${inputClass} ${!isIncluded ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
                                  />
                                </td>
                                <td className={`${tdClass} ${!isIncluded ? 'bg-gray-100' : ''}`}>
                                  <input
                                    type="text"
                                    value={displayPrice(part.minPrice)}
                                    onChange={(e) => updatePart(cattle.id, part.id, 'minPrice', e.target.value)}
                                    placeholder="0"
                                    required={isIncluded}
                                    disabled={!isIncluded}
                                    className={`w-20 ${inputClass} ${!isIncluded ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
                                  />
                                </td>
                              </React.Fragment>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 사진 및 증명서 업로드 (한 줄) */}
                <div className="flex items-center gap-3 pt-2 flex-wrap">
                  {/* 사진 */}
                  <span className="text-xs font-medium text-gray-600">사진:</span>
                  <span className="text-[10px] text-gray-400">({cattle.images.length}/4)</span>
                  {cattle.images.map((img, index) => (
                    <div key={index} className="relative w-14 h-14 border border-gray-200 overflow-hidden bg-gray-50">
                      <img 
                        src={img} 
                        alt={`상품 ${index + 1}`} 
                        className="w-full h-full object-cover cursor-pointer hover:opacity-80" 
                        onClick={() => setViewingImage(img)}
                      />
                      <button 
                        type="button" 
                        onClick={() => removeImage(cattle.id, index)} 
                        className="absolute top-0 right-0 w-4 h-4 bg-gray-700 text-white flex items-center justify-center hover:bg-gray-800"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                  {cattle.images.length < 4 && (
                    <>
                      <input
                        ref={el => { imageInputRefs.current[cattle.id] = el; }}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleImageUpload(cattle.id, e)}
                        className="hidden"
                      />
                      <button 
                        type="button" 
                        onClick={() => imageInputRefs.current[cattle.id]?.click()} 
                        className="w-14 h-14 border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-gray-500 hover:text-gray-500 transition-colors bg-white"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span className="text-[9px] mt-0.5">업로드</span>
                      </button>
                    </>
                  )}

                  {/* 구분선 */}
                  <div className="w-px h-10 bg-gray-200 mx-2"></div>

                  {/* 도축검사증명서 */}
                  <span className="text-xs font-medium text-gray-600">도축검사증명서:</span>
                  {cattle.slaughterCert ? (
                    <div className="relative w-14 h-14 border border-gray-200 overflow-hidden bg-gray-50">
                      <img 
                        src={cattle.slaughterCert.fileData} 
                        alt="도축검사증명서" 
                        className="w-full h-full object-cover cursor-pointer hover:opacity-80"
                        onClick={() => openCert(cattle.slaughterCert!)}
                      />
                      <button
                        type="button"
                        onClick={() => removeCert(cattle.id, 'slaughterCert')}
                        className="absolute top-0 right-0 w-4 h-4 bg-gray-700 text-white flex items-center justify-center hover:bg-gray-800"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        ref={el => { slaughterCertInputRefs.current[cattle.id] = el; }}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleCertUpload(cattle.id, 'slaughterCert', e)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => slaughterCertInputRefs.current[cattle.id]?.click()}
                        className="w-14 h-14 border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-gray-500 hover:text-gray-500 transition-colors bg-white"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span className="text-[9px] mt-0.5">업로드</span>
                      </button>
                    </>
                  )}

                  {/* 등급판정확인서 */}
                  <span className="text-xs font-medium text-gray-600">등급판정확인서:</span>
                  {cattle.gradeCert ? (
                    <div className="relative w-14 h-14 border border-gray-200 overflow-hidden bg-gray-50">
                      <img 
                        src={cattle.gradeCert.fileData} 
                        alt="등급판정확인서" 
                        className="w-full h-full object-cover cursor-pointer hover:opacity-80"
                        onClick={() => openCert(cattle.gradeCert!)}
                      />
                      <button
                        type="button"
                        onClick={() => removeCert(cattle.id, 'gradeCert')}
                        className="absolute top-0 right-0 w-4 h-4 bg-gray-700 text-white flex items-center justify-center hover:bg-gray-800"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        ref={el => { gradeCertInputRefs.current[cattle.id] = el; }}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleCertUpload(cattle.id, 'gradeCert', e)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => gradeCertInputRefs.current[cattle.id]?.click()}
                        className="w-14 h-14 border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-gray-500 hover:text-gray-500 transition-colors bg-white"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span className="text-[9px] mt-0.5">업로드</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* 개체 추가 버튼 */}
        {cattleList.length < 10 && (
          <button
            type="button"
            onClick={addCattle}
            className="w-full py-3 border-2 border-dashed border-gray-300 text-gray-500 hover:border-gray-500 hover:text-gray-600 transition-colors flex items-center justify-center gap-2 mb-4"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">개체 추가</span>
          </button>
        )}

      </form>

      {/* 이미지 확대 모달 */}
      {viewingImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80"
          onClick={() => setViewingImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img 
              src={viewingImage} 
              alt="확대 이미지" 
              className="max-w-full max-h-[90vh] object-contain"
            />
            <button
              type="button"
              onClick={() => setViewingImage(null)}
              className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
