"use client";

import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { useMemo, useState } from "react";
import { CATTLE_PART_NAMES } from "@/constants/cattleParts";
import {
  fetchLiveSettlements,
  type LiveSettlementItem,
} from "@/features/main/api";
import { FilterSelect } from "@/features/main/components/FilterSelect";

const NUMBER_FORMATTER = new Intl.NumberFormat("ko-KR");

const QUALITY_GRADES = ["1++", "1+", "1", "2", "3"] as const;
const QUANTITY_GRADES = ["A", "B", "C"] as const;

function formatSettledAt(iso: string | null): string {
  if (!iso) return "-";
  try {
    return format(parseISO(iso), "yyyy-MM-dd HH:mm");
  } catch {
    return "-";
  }
}

function formatWeight(kg: number): string {
  if (!Number.isFinite(kg) || kg <= 0) return "-";
  return `${kg.toFixed(1)} kg`;
}

function formatPrice(won: number): string {
  if (!Number.isFinite(won) || won <= 0) return "-";
  return `${NUMBER_FORMATTER.format(won)} 원/kg`;
}

function formatAmount(won: number): string {
  if (!Number.isFinite(won) || won <= 0) return "-";
  return `${NUMBER_FORMATTER.format(won)} 원`;
}

function parseGrade(grade: string): { quality: string; quantity: string } {
  if (!grade) return { quality: "", quantity: "" };
  const match = grade.match(/^(1\+\+|1\+|1|2|3)([A-C])?/);
  if (!match) return { quality: "", quantity: "" };
  return { quality: match[1] ?? "", quantity: match[2] ?? "" };
}

export function LiveAuctionSection() {
  const [quality, setQuality] = useState("");
  const [quantity, setQuantity] = useState("");
  const [partName, setPartName] = useState("");

  const { data: records = [], isLoading } = useQuery<LiveSettlementItem[]>({
    queryKey: ["main", "live-settlements"],
    queryFn: () => fetchLiveSettlements(20),
    refetchInterval: 5_000,
    staleTime: 0,
  });

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (partName && r.partName !== partName) return false;
      const parsed = parseGrade(r.grade);
      if (quality && parsed.quality !== quality) return false;
      if (quantity && parsed.quantity !== quantity) return false;
      return true;
    });
  }, [records, quality, quantity, partName]);


  return (
    <section id="live" className="bg-surface py-14">
      <div className="mx-auto max-w-[1360px] min-[1700px]:max-w-[1600px] px-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-content">
            실시간 경매 내역
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect
              value={quality}
              onChange={setQuality}
              label="육질등급"
              options={QUALITY_GRADES}
            />
            <FilterSelect
              value={quantity}
              onChange={setQuantity}
              label="육량등급"
              options={QUANTITY_GRADES}
            />
            <FilterSelect
              value={partName}
              onChange={setPartName}
              label="품목"
              options={CATTLE_PART_NAMES}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[8%]" />
              <col className="w-[8%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[8%]" />
              <col className="w-[11%]" />
              <col className="w-[11%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead className="bg-surface-muted text-xs font-semibold text-content-mid">
              <tr>
                <th className="border-b border-line px-4 py-3 text-center">
                  경락일시
                </th>
                <th className="border-b border-line px-4 py-3 text-center">
                  상장업체명
                </th>
                <th className="border-b border-line px-4 py-3 text-center">
                  축종
                </th>
                <th className="border-b border-line px-4 py-3 text-center">
                  성별
                </th>
                <th className="border-b border-line px-4 py-3 text-center">
                  등급
                </th>
                <th className="border-b border-line px-4 py-3 text-center">
                  품목
                </th>
                <th className="border-b border-line px-4 py-3 text-center">
                  중량
                </th>
                <th className="border-b border-line px-4 py-3 text-center">
                  경락단가
                </th>
                <th className="border-b border-line px-4 py-3 text-center">
                  총경락금액
                </th>
                <th className="border-b border-line px-4 py-3 text-center">
                  도축장명
                </th>
              </tr>
            </thead>
          </table>
          <div className="max-h-[360px] overflow-y-auto">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-[12%]" />
                <col className="w-[12%]" />
                <col className="w-[8%]" />
                <col className="w-[8%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[8%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="w-[10%]" />
              </colgroup>
              <tbody className="divide-y divide-line-soft">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-10 text-center text-content-faint"
                    >
                      불러오는 중...
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-10 text-center text-content-faint"
                    >
                      최근 경매 내역이 없습니다.
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-10 text-center text-content-faint"
                    >
                      필터에 해당하는 경매 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-surface-muted">
                      <td className="px-4 py-3 whitespace-nowrap text-center text-content-mid">
                        {formatSettledAt(r.settledAt)}
                      </td>
                      <td className="px-4 py-3 truncate text-center text-content-mid">
                        {r.companyName || "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-content-mid">
                        {r.breed || "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-content-mid">
                        {r.gender || "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center tabular-nums font-semibold text-content">
                        {r.grade || "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center font-medium text-content">
                        {r.partName || "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right tabular-nums text-content-mid">
                        {formatWeight(r.weight)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right tabular-nums text-content-mid">
                        {formatPrice(r.bidPrice)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right tabular-nums font-semibold text-content">
                        {formatAmount(r.bidAmount)}
                      </td>
                      <td className="px-4 py-3 truncate text-center text-content-soft">
                        {r.slaughterHouse || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
