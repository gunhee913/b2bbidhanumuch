import * as XLSX from 'xlsx';
import type { DashboardData } from '../types';
import type { DateRange } from './period';

const round1 = (value: number) => Math.round(value * 10) / 10;

/** 대시보드 전체를 시트 다섯 장짜리 엑셀로 내려받는다 */
export function downloadDashboardExcel(data: DashboardData, { start, end }: DateRange) {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      data.daily.map((d) => ({
        '일자': d.date,
        '경매 두수': d.cattleCount,
        '경매 건수': d.partCount,
        '낙찰 건수': d.wonCount,
        '낙찰대금(원)': d.wonAmount,
        '상장수수료(원)': d.feeAmount,
        '배송수수료(원)': d.deliveryFeeAmount,
      })),
    ),
    '일별경매',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      data.byPart.map((p) => ({
        '부위': p.name,
        '경매 건수': p.partCount,
        '낙찰 건수': p.count,
        '낙찰대금(원)': p.amount,
        '중량(kg)': round1(p.weight),
        '낙찰률(%)': p.bidRate,
        '비중(%)': p.ratio,
      })),
    ),
    '부위별경매',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      data.byGrade.map((g) => ({
        '등급': g.name,
        '경매 두수': g.cattleCount,
        '경매 건수': g.partCount,
        '낙찰 건수': g.wonCount,
        '낙찰대금(원)': g.wonAmount,
        '낙찰률(%)': g.bidRate,
        '비중(%)': g.ratio,
      })),
    ),
    '등급별경매',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      data.byCompany.map((c) => ({
        '상장업체': c.name,
        '경매 두수': c.cattleCount,
        '경매 건수': c.partCount,
        '낙찰 건수': c.wonCount,
        '낙찰대금(원)': c.wonAmount,
        '낙찰률(%)': c.bidRate,
        '비중(%)': c.ratio,
      })),
    ),
    '상장업체별경매',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      data.byDealer.map((d, index) => ({
        '순위': index + 1,
        '중도매인': d.name,
        '입찰 수': d.bidCount,
        '낙찰 수': d.wonCount,
        '낙찰대금(원)': d.wonAmount,
        '낙찰률(%)': d.bidRate,
        '비중(%)': d.ratio,
      })),
    ),
    '중도매인별낙찰',
  );

  XLSX.writeFile(wb, `플랫폼운영현황_${start}_${end}.xlsx`);
}
