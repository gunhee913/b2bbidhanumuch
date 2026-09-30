import type { AssignmentInfo } from "@/features/delivery/types";
import { formatGradeLabel } from "@/features/live-auction/lib/grade";
import { STATUS_LABEL, type DailyRow } from "./dailyRows";

const EXPORT_HEADER = [
  "일자",
  "상태",
  "회차",
  "입찰시간",
  "상장번호",
  "가공업체",
  "부위",
  "등급",
  "중량(kg)",
  "최저단가",
  "내 입찰가",
  "낙찰가",
  "총 금액",
  "거래처",
] as const;

type ExportCell = string | number;

function toExportRow(
  row: DailyRow,
  assignment: AssignmentInfo | null,
): ExportCell[] {
  const isSettled = row.status !== "active";
  return [
    row.dateStr,
    STATUS_LABEL[row.status],
    row.roundNo != null ? `${row.roundNo}차` : "",
    row.time,
    row.listingNo,
    row.companyName,
    row.partName,
    formatGradeLabel(row.grade, row.marblingScore),
    row.weight,
    row.minPrice,
    row.myBid,
    isSettled && row.winningBid != null ? row.winningBid : "",
    row.status === "lost" ? "" : row.totalAmount,
    assignment?.partnerName ?? "",
  ];
}

/**
 * 경매내역 행을 xlsx 로 내려받는다 · 정산·회계 대조용.
 * `xlsx` 는 무게가 커서 클릭 시점에 동적 import.
 */
export async function downloadHistoryXlsx({
  rows,
  assignments,
  fileLabel,
}: {
  rows: readonly DailyRow[];
  assignments: Record<string, AssignmentInfo>;
  /** 파일명 접미 (예: `2026-09-17` · `2026-09`) */
  fileLabel: string;
}): Promise<void> {
  const XLSX = await import("xlsx");
  const data: ExportCell[][] = [
    [...EXPORT_HEADER],
    ...rows.map((row) => toExportRow(row, assignments[row.partId] ?? null)),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(data);
  sheet["!cols"] = [
    { wch: 11 },
    { wch: 7 },
    { wch: 6 },
    { wch: 18 },
    { wch: 15 },
    { wch: 12 },
    { wch: 10 },
    { wch: 9 },
    { wch: 9 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 14 },
  ];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "경매내역");
  XLSX.writeFile(book, `경매내역_${fileLabel}.xlsx`);
}
