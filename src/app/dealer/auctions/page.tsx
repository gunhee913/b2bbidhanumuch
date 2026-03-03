'use client';

import React, { useState, useMemo } from 'react';
import DealerLayout from '@/components/dealer/DealerLayout';
import { ChevronDown, ChevronUp, Download, Loader2, X, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

interface PartData {
  id: string;
  partNo: number;
  partName: string;
  listingPartNo: string;
  weight: number;
  minPrice: number;
  bidPrice: number | null;
  isIncluded: boolean;
}

interface ListingData {
  id: string;
  listingNo: string;
  breed: string;
  gender: string;
  grade: string;
  marblingScore: number | null;
  monthAge: number;
  backFat: number;
  eyeMuscle: number;
  meatColor: number;
  fatColor: number;
  texture: number;
  maturity: number;
  traceNo: string;
  slaughterHouse: string;
  slaughterDate: string;
  slaughterNo: string;
  carcassWeight: number;
  companyName: string;
  processDate: string;
  processWeight: number;
  status: string;
  parts: PartData[];
  images: string[];
  slaughterCert: { fileName: string; fileData: string } | null;
  gradeCert: { fileName: string; fileData: string } | null;
}

const formatGrade = (grade: string, marblingScore: number | null) => {
  if (!grade) return '';
  if (grade.includes('(')) return grade;
  if (marblingScore && grade.startsWith('1++')) return `${grade}(${marblingScore})`;
  return grade;
};

const formatDateShort = (dateStr: string | null) => {
  if (!dateStr) return '-';
  try {
    return format(new Date(dateStr), 'yy.MM.dd');
  } catch {
    return '-';
  }
};

const getTomorrowDateString = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return format(tomorrow, 'yyyy-MM-dd');
};

const tomorrowDateString = getTomorrowDateString();

export default function DealerAuctionsPage() {
  const { data: session } = useSession();
  const dealerName = session?.dealer?.name || session?.employee?.name || '';

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [photoModalListing, setPhotoModalListing] = useState<any | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(tomorrowDateString);
  const [endDate, setEndDate] = useState(tomorrowDateString);
  const [searchStartDate, setSearchStartDate] = useState(tomorrowDateString);
  const [searchEndDate, setSearchEndDate] = useState(tomorrowDateString);

  const handleSearch = () => {
    setSearchStartDate(startDate);
    setSearchEndDate(endDate);
  };

  const { data: listingsData, isLoading } = useQuery<ListingData[]>({
    queryKey: ['dealer-listings', searchStartDate, searchEndDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchStartDate) params.set('listingDateFrom', searchStartDate);
      if (searchEndDate) params.set('listingDateTo', searchEndDate);
      params.set('includeParts', 'true');

      const res = await fetch(`/api/listings?${params.toString()}`);
      if (!res.ok) throw new Error('조회 실패');
      return res.json();
    },
  });

  const listings = useMemo(() => {
    if (!listingsData) return [];
    return listingsData
      .map((l: any) => ({
        ...l,
        grade: formatGrade(l.grade, l.marblingScore),
        parts: (l.parts || []).map((p: any) => ({
          id: p.id,
          partNo: p.partNo,
          partName: p.partName,
          listingPartNo: p.listingPartNo || `${l.listingNo}-${String(p.partNo).padStart(2, '0')}`,
          weight: p.weight || 0,
          minPrice: p.minPrice || 0,
          bidPrice: p.bidPrice,
          isIncluded: p.isIncluded,
        })),
      }))
      .sort((a: any, b: any) => {
        const suffixA = parseInt(a.listingNo.split('-').pop() || '0', 10);
        const suffixB = parseInt(b.listingNo.split('-').pop() || '0', 10);
        return suffixA - suffixB;
      });
  }, [listingsData]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'pending': return '대기';
      case 'approved': return '승인';
      case 'auction': return '경매중';
      case 'closed':
      case 'completed': return '마감';
      default: return status;
    }
  };

  const handleExcelDownload = () => {
    const excelData = listings.map((l: any) => ({
      '접수번호': l.listingNo,
      '축종': l.breed,
      '성별': l.gender,
      '등급': l.grade,
      '개월령': l.monthAge,
      '등지방': l.backFat,
      '등심면적': l.eyeMuscle,
      '근내지방': l.marblingScore,
      '육색': l.meatColor,
      '지방색': l.fatColor,
      '조직감': l.texture,
      '성숙도': l.maturity,
      '이력번호': l.traceNo,
      '도축장': l.slaughterHouse,
      '도축일': formatDateShort(l.slaughterDate),
      '도축번호': l.slaughterNo,
      '도체중': l.carcassWeight,
      '상장업체': l.companyName,
      '가공일': formatDateShort(l.processDate),
      '가공중량': l.processWeight,
      '상태': statusLabel(l.status),
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '부분육 상장 조회');
    XLSX.writeFile(wb, `${dealerName}_부분육_상장조회_${searchStartDate}_${searchEndDate}.xlsx`);
  };

  const handlePrint = () => {
    if (listings.length === 0) {
      alert('인쇄할 데이터가 없습니다.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const statusBadge = (status: string) => {
      switch (status) {
        case 'auction': return '<span style="padding:1px 6px;font-size:9px;font-weight:600;color:#15803d;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:3px">경매중</span>';
        case 'closed':
        case 'completed': return '<span style="padding:1px 6px;font-size:9px;font-weight:600;color:#6b7280;background:#f3f4f6;border-radius:3px">마감</span>';
        case 'approved': return '<span style="padding:1px 6px;font-size:9px;font-weight:600;color:#1d4ed8;background:#eff6ff;border:1px solid #bfdbfe;border-radius:3px">승인</span>';
        default: return `<span style="font-size:9px;color:#6b7280">${statusLabel(status)}</span>`;
      }
    };

    const listingsHtml = listings.map((listing: any) => {
      const allParts = listing.parts || [];

      const partsGridHtml = [0, 1, 2].map(colIndex => {
        const rows = Array.from({ length: 7 }).map((_, idx) => {
          const part = allParts[colIndex * 7 + idx] as PartData | undefined;
          if (!part) {
            return '<tr><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>';
          }
          const excluded = !part.isIncluded;
          const cls = excluded ? 'color:#9ca3af;' : '';
          const strike = excluded ? 'text-decoration:line-through;' : '';
          return `<tr style="${excluded ? 'background:#f3f4f6;' : ''}">
            <td style="${cls}${strike}">${part.isIncluded ? part.listingPartNo : '-'}</td>
            <td style="${cls}${strike}${!excluded ? 'font-weight:500;color:#111;' : ''}">${part.partName}</td>
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
          <td class="td bold">${listing.listingNo}</td>
          <td class="td">${listing.breed}</td>
          <td class="td">${listing.gender}</td>
          <td class="td bold">${listing.grade}</td>
          <td class="td">${listing.monthAge}</td>
          <td class="td">${listing.backFat}</td>
          <td class="td">${listing.eyeMuscle}</td>
          <td class="td">${listing.marblingScore ?? ''}</td>
          <td class="td">${listing.meatColor}</td>
          <td class="td">${listing.fatColor}</td>
          <td class="td">${listing.texture}</td>
          <td class="td">${listing.maturity}</td>
          <td class="td trace">002-${listing.traceNo || ''}</td>
          <td class="td">${listing.slaughterHouse || ''}</td>
          <td class="td">${formatDateShort(listing.slaughterDate)}</td>
          <td class="td">${listing.slaughterNo || ''}</td>
          <td class="td">${listing.carcassWeight}</td>
          <td class="td">${listing.companyName || ''}</td>
          <td class="td">${formatDateShort(listing.processDate)}</td>
          <td class="td">${listing.processWeight}</td>
          <td class="td">${statusBadge(listing.status)}</td>
        </tr>
        <tr>
          <td colspan="21" class="parts-cell">
            <div class="parts-label">부위: ${allParts.filter((p: PartData) => p.isIncluded).length}/${allParts.length}</div>
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
            <p>조회기간: ${searchStartDate} ~ ${searchEndDate} | ${dealerName} | 총 ${listings.length}건</p>
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
          <div class="footer">총 ${listings.length}개</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  const thClass = "px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50";
  const tdClass = "px-2 py-3 text-xs border border-gray-200 text-gray-600 text-center whitespace-nowrap";

  return (
    <DealerLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">부분육 상장 조회</h1>
        <p className="text-sm text-gray-500 mt-1">{dealerName}</p>
      </div>

      <div className="bg-white border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">상장일자</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-36 px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
            />
            <span className="text-gray-400">~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-36 px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
            />
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
                setSearchStartDate(tomorrowDateString);
                setSearchEndDate(tomorrowDateString);
              }}
              className="px-4 py-1.5 border border-gray-300 text-gray-600 text-xs hover:bg-gray-50"
            >
              초기화
            </button>
          </div>

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
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="w-8 px-1 py-2 border border-gray-200 bg-gray-50"></th>
                <th className={thClass}>접수번호</th>
                <th className={thClass}>축종</th>
                <th className={thClass}>성별</th>
                <th className={thClass}>등급</th>
                <th className={thClass}>개월령</th>
                <th className={thClass}>등지방</th>
                <th className={thClass}>등심면적</th>
                <th className={thClass}>근내지방</th>
                <th className={thClass}>육색</th>
                <th className={thClass}>지방색</th>
                <th className={thClass}>조직감</th>
                <th className={thClass}>성숙도</th>
                <th className={thClass}>이력번호</th>
                <th className={thClass}>도축장</th>
                <th className={thClass}>도축일</th>
                <th className={thClass}>도축번호</th>
                <th className={thClass}>도체중</th>
                <th className={thClass}>상장업체</th>
                <th className={thClass}>가공일</th>
                <th className={thClass}>가공중량</th>
                <th className={thClass}>사진</th>
                <th className={thClass}>상태</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={23} className="px-4 py-8 text-center text-gray-500 border border-gray-200">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto mb-2" />
                    데이터를 불러오는 중...
                  </td>
                </tr>
              ) : listings.length === 0 ? (
                <tr>
                  <td colSpan={23} className="px-4 py-8 text-center text-gray-500 border border-gray-200">
                    등록된 상장이 없습니다.
                  </td>
                </tr>
              ) : listings.map((listing: any) => (
                <React.Fragment key={listing.id}>
                  <tr
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => toggleExpand(listing.id)}
                  >
                    <td className="px-2 py-3 text-center border border-gray-200">
                      {expandedId === listing.id ? (
                        <ChevronUp className="w-3 h-3 text-gray-400 mx-auto" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-gray-400 mx-auto" />
                      )}
                    </td>
                    <td className={`${tdClass} font-medium text-gray-900`}>{listing.listingNo}</td>
                    <td className={tdClass}>{listing.breed}</td>
                    <td className={tdClass}>{listing.gender}</td>
                    <td className={`${tdClass} font-medium text-gray-900`}>{listing.grade}</td>
                    <td className={tdClass}>{listing.monthAge}</td>
                    <td className={tdClass}>{listing.backFat}</td>
                    <td className={tdClass}>{listing.eyeMuscle}</td>
                    <td className={tdClass}>{listing.marblingScore}</td>
                    <td className={tdClass}>{listing.meatColor}</td>
                    <td className={tdClass}>{listing.fatColor}</td>
                    <td className={tdClass}>{listing.texture}</td>
                    <td className={tdClass}>{listing.maturity}</td>
                    <td className={`${tdClass} text-[10px]`}>002-{listing.traceNo}</td>
                    <td className={tdClass}>{listing.slaughterHouse}</td>
                    <td className={tdClass}>{formatDateShort(listing.slaughterDate)}</td>
                    <td className={tdClass}>{listing.slaughterNo}</td>
                    <td className={tdClass}>{listing.carcassWeight}</td>
                    <td className={tdClass}>{listing.companyName}</td>
                    <td className={tdClass}>{formatDateShort(listing.processDate)}</td>
                    <td className={tdClass}>{listing.processWeight}</td>
                    <td className="px-2 py-3 text-center whitespace-nowrap border border-gray-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPhotoModalListing(listing);
                        }}
                        className="px-2 py-0.5 text-xs font-medium text-white bg-gray-700 hover:bg-gray-800 transition-colors"
                      >
                        보기
                      </button>
                    </td>
                    <td className="px-2 py-3 text-center whitespace-nowrap border border-gray-200">
                      {listing.status === 'auction' ? (
                        <span className="px-2 py-0.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded">경매중</span>
                      ) : listing.status === 'closed' || listing.status === 'completed' ? (
                        <span className="px-2 py-0.5 text-xs font-medium text-gray-500 bg-gray-100 rounded">마감</span>
                      ) : listing.status === 'approved' ? (
                        <span className="px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded">승인</span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs font-medium text-gray-500">{statusLabel(listing.status)}</span>
                      )}
                    </td>
                  </tr>
                  {expandedId === listing.id && (
                    <tr>
                      <td colSpan={23} className="px-4 py-4 bg-white">
                        <div className="mb-3">
                          <span className="text-sm font-medium text-gray-700">
                            부위: {listing.parts.filter((p: PartData) => p.isIncluded).length}/{listing.parts.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
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
                                  const part = listing.parts[globalIdx] as PartData | undefined;

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

                                  return (
                                    <tr key={part.id} className={`border-t border-gray-100 ${!part.isIncluded ? 'bg-gray-100' : ''}`}>
                                      <td className={`px-2 py-2 text-xs text-center border-r border-gray-200 ${!part.isIncluded ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                                        {part.isIncluded ? part.listingPartNo : '-'}
                                      </td>
                                      <td className={`px-2 py-2 text-xs text-center border-r border-gray-200 ${!part.isIncluded ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{part.partName}</td>
                                      <td className={`px-2 py-2 text-xs text-center border-r border-gray-200 ${!part.isIncluded ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {part.isIncluded ? `${part.weight}kg` : '-'}
                                      </td>
                                      <td className={`px-2 py-2 text-xs text-center border-r border-gray-200 ${!part.isIncluded ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {part.isIncluded ? part.minPrice.toLocaleString() : '-'}
                                      </td>
                                      <td className="px-2 py-2 text-xs text-center">
                                        {part.isIncluded && part.bidPrice ? (
                                          <span className="text-gray-900 font-medium">{part.bidPrice.toLocaleString()}</span>
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

        <div className="px-6 py-3 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            총 {listings.length}개
          </div>
        </div>
      </div>

      {/* 사진 보기 모달 */}
      {photoModalListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setPhotoModalListing(null)}
          />
          <div className="relative bg-white shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">상장 사진 / 증명서</h3>
                <p className="text-sm text-gray-500">
                  접수번호: {photoModalListing.listingNo} | {photoModalListing.companyName} | {photoModalListing.grade}
                </p>
              </div>
              <button
                onClick={() => setPhotoModalListing(null)}
                className="p-2 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[calc(90vh-100px)]">
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">상장 사진</h4>
                {photoModalListing.images && photoModalListing.images.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {photoModalListing.images.map((img: string, index: number) => (
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

              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">증명서</h4>
                <div className="flex gap-4 justify-center">
                  <div className="space-y-2 w-32">
                    <p className="text-xs font-medium text-gray-600 text-center">도축검사증명서</p>
                    {photoModalListing.slaughterCert?.fileData ? (
                      <div
                        className="w-full border border-gray-200 cursor-pointer hover:opacity-80 overflow-hidden transition-opacity"
                        style={{ aspectRatio: '210/297' }}
                        onClick={() => setEnlargedImage(photoModalListing.slaughterCert?.fileData || null)}
                      >
                        <img
                          src={photoModalListing.slaughterCert.fileData}
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

                  <div className="space-y-2 w-32">
                    <p className="text-xs font-medium text-gray-600 text-center">등급판정확인서</p>
                    {photoModalListing.gradeCert?.fileData ? (
                      <div
                        className="w-full border border-gray-200 cursor-pointer hover:opacity-80 overflow-hidden transition-opacity"
                        style={{ aspectRatio: '210/297' }}
                        onClick={() => setEnlargedImage(photoModalListing.gradeCert?.fileData || null)}
                      >
                        <img
                          src={photoModalListing.gradeCert.fileData}
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

            <div className="p-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setPhotoModalListing(null)}
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
    </DealerLayout>
  );
}
