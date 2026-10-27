import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { partListingNo, type DateRange, type ListingView } from './listingView';

export function downloadListingsExcel(listings: ListingView[]) {
  const rows = listings.map((listing) => ({
    '접수번호': listing.listingNo,
    '축종': listing.breed,
    '성별': listing.gender,
    '등급': listing.grade,
    '개월령': listing.monthAge,
    '등지방': listing.backFat,
    '등심면적': listing.eyeMuscle,
    '근내지방': listing.marblingScore,
    '육색': listing.meatColor,
    '지방색': listing.fatColor,
    '조직감': listing.texture,
    '성숙도': listing.maturity,
    '이력번호': listing.traceNo,
    '도축장': listing.slaughterHouse,
    '도축일': listing.slaughterDate,
    '도축번호': listing.slaughterNo,
    '도체중': listing.carcassWeight,
    '상장업체': listing.companyName,
    '가공일': listing.processDate,
    '가공중량': listing.processWeight,
    '상태': listing.status,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 15 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 8 },
    { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 6 }, { wch: 8 },
    { wch: 8 }, { wch: 8 }, { wch: 14 }, { wch: 8 }, { wch: 12 },
    { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
    { wch: 8 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '부분육 상장 조회');
  XLSX.writeFile(workbook, `부분육_상장조회_${format(new Date(), 'yyyyMMdd')}.xlsx`);
}

const STATUS_BADGE_HTML: Record<ListingView['status'], string> = {
  경매중: '<span style="padding:1px 6px;font-size:9px;font-weight:600;color:#15803d;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:3px">경매중</span>',
  마감: '<span style="padding:1px 6px;font-size:9px;font-weight:600;color:#6b7280;background:#f3f4f6;border-radius:3px">마감</span>',
  승인: '<span style="padding:1px 6px;font-size:9px;font-weight:600;color:#fff;background:#17171c;border-radius:3px">승인</span>',
  대기: '<span style="padding:1px 6px;font-size:9px;font-weight:600;color:#475569;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:3px">대기</span>',
};

const escapeHtml = (value: string | number) =>
  String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);

const partsGridHtml = (listing: ListingView) =>
  [0, 1, 2]
    .map((colIndex) => {
      const rows = Array.from({ length: 7 })
        .map((_, idx) => {
          const part = listing.parts[colIndex * 7 + idx];
          if (!part) return '<tr><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>';
          const excluded = !part.isIncluded;
          const muted = excluded ? 'color:#9ca3af;' : '';
          const strike = excluded ? 'text-decoration:line-through;' : '';
          return `<tr style="${excluded ? 'background:#f3f4f6;' : ''}">
            <td style="${muted}${strike}">${part.isIncluded ? partListingNo(listing.listingNo, part.partNo) : '-'}</td>
            <td style="${muted}${strike}${excluded ? '' : 'font-weight:500;color:#111;'}">${escapeHtml(part.name)}</td>
            <td style="${muted}">${part.isIncluded ? `${part.weight}kg` : '-'}</td>
            <td style="${muted}">${part.isIncluded ? part.minPrice.toLocaleString() : '-'}</td>
            <td>${part.isIncluded && part.bidPrice ? `<b style="color:#111">${part.bidPrice.toLocaleString()}</b>` : '<span style="color:#9ca3af">-</span>'}</td>
          </tr>`;
        })
        .join('');
      return `<table class="parts-col">
        <thead><tr><th>상장번호</th><th>부위</th><th>중량</th><th>최저가격</th><th>낙찰가격</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    })
    .join('');

const listingHtml = (listing: ListingView) => {
  const includedCount = listing.parts.filter((part) => part.isIncluded).length;
  return `
    <tbody class="listing-group">
    <tr class="listing-row">
      <td class="td bold">${escapeHtml(listing.listingNo)}</td>
      <td class="td">${escapeHtml(listing.breed)}</td>
      <td class="td">${escapeHtml(listing.gender)}</td>
      <td class="td bold">${escapeHtml(listing.grade)}</td>
      <td class="td">${listing.monthAge}</td>
      <td class="td">${listing.backFat}</td>
      <td class="td">${listing.eyeMuscle}</td>
      <td class="td">${listing.marblingScore || ''}</td>
      <td class="td">${listing.meatColor}</td>
      <td class="td">${listing.fatColor}</td>
      <td class="td">${listing.texture}</td>
      <td class="td">${listing.maturity}</td>
      <td class="td trace">002-${escapeHtml(listing.traceNo)}</td>
      <td class="td">${escapeHtml(listing.slaughterHouse)}</td>
      <td class="td">${listing.slaughterDate}</td>
      <td class="td">${escapeHtml(listing.slaughterNo)}</td>
      <td class="td">${listing.carcassWeight}</td>
      <td class="td">${escapeHtml(listing.companyName)}</td>
      <td class="td">${listing.processDate}</td>
      <td class="td">${listing.processWeight}</td>
      <td class="td">${STATUS_BADGE_HTML[listing.status]}</td>
    </tr>
    <tr>
      <td colspan="21" class="parts-cell">
        <div class="parts-label">부위: ${includedCount}/${listing.parts.length}</div>
        <div class="parts-grid">${partsGridHtml(listing)}</div>
      </td>
    </tr>
    </tbody>`;
};

const HEADERS = [
  '접수번호', '축종', '성별', '등급', '개월령', '등지방', '등심면적', '근내지방', '육색', '지방색', '조직감',
  '성숙도', '이력번호', '도축장', '도축일', '도축번호', '도체중', '상장업체', '가공일', '가공중량', '상태',
];

/** 새 창에 A4 가로로 인쇄 · 실패(팝업 차단)하면 false */
export function printListings(listings: ListingView[], range: DateRange): boolean {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;

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
          <p>조회기간: ${range.start} ~ ${range.end} | 총 ${listings.length}건</p>
        </div>
        <table class="main-table">
          <thead><tr>${HEADERS.map((header) => `<th class="th">${header}</th>`).join('')}</tr></thead>
          ${listings.map(listingHtml).join('')}
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
  return true;
}
