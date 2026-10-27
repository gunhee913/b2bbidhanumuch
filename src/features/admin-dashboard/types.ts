export interface DashboardSummary {
  cattleCount: number;
  partCount: number;
  wonCount: number;
  wonAmount: number;
  feeRate: number;
  feeAmount: number;
  deliveryFeeRate: number;
  deliveryFeeAmount: number;
}

export interface DailyRow {
  date: string;
  cattleCount: number;
  partCount: number;
  wonCount: number;
  wonAmount: number;
  feeAmount: number;
  deliveryFeeAmount: number;
}

export interface PartRow {
  name: string;
  partCount: number;
  count: number;
  amount: number;
  weight: number;
  bidRate: number;
  ratio: number;
}

export interface GradeRow {
  name: string;
  cattleCount: number;
  partCount: number;
  wonCount: number;
  wonAmount: number;
  weight: number;
  bidRate: number;
  ratio: number;
}

export type CompanyRow = GradeRow;

export interface DealerRow {
  name: string;
  cattleCount: number;
  bidCount: number;
  wonCount: number;
  wonAmount: number;
  bidRate: number;
  ratio: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  daily: DailyRow[];
  byPart: PartRow[];
  byGrade: GradeRow[];
  byCompany: CompanyRow[];
  byDealer: DealerRow[];
}

export const EMPTY_SUMMARY: DashboardSummary = {
  cattleCount: 0,
  partCount: 0,
  wonCount: 0,
  wonAmount: 0,
  feeRate: 1.5,
  feeAmount: 0,
  deliveryFeeRate: 0,
  deliveryFeeAmount: 0,
};
