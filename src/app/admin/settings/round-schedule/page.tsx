'use client';

import { useEffect, useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';
import { useSession } from 'next-auth/react';
import { Copy, Plus, Save, Trash2 } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { SLAUGHTER_HOUSES } from '@/constants/slaughterHouses';
import {
  useAdminRoundSchedule,
  useCopyRoundSchedules,
  useDeleteRoundSchedules,
  useUpsertRoundSchedules,
} from '@/features/round-schedules/hooks/useAdminRoundSchedule';

interface Row {
  roundNo: number;
  plannedStart: string;
  plannedEnd: string;
  note: string;
}

const DEFAULT_DURATION_MIN = 10;

function toHmm(time: string): string {
  if (!time) return '';
  if (/^\d{2}:\d{2}$/.test(time)) return time;
  if (/^\d{2}:\d{2}:\d{2}$/.test(time)) return time.slice(0, 5);
  return time;
}

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const total = h * 60 + m + minutes;
  const nh = Math.floor((total % (24 * 60)) / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

export default function RoundSchedulePage() {
  const { data: session } = useSession();
  const adminName =
    (session as unknown as { user?: { name?: string } } | null)?.user?.name ??
    '관리자';

  const [slaughterHouse, setSlaughterHouse] = useState<string>(
    SLAUGHTER_HOUSES[0],
  );
  const [date, setDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  const [rows, setRows] = useState<Row[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const { data, isLoading, isFetching } = useAdminRoundSchedule(
    slaughterHouse,
    date,
  );

  useEffect(() => {
    if (!data) return;
    if (data.schedules.length === 0) {
      setRows([]);
      return;
    }
    setRows(
      data.schedules.map((s) => ({
        roundNo: s.roundNo,
        plannedStart: toHmm(s.plannedStart),
        plannedEnd: toHmm(s.plannedEnd),
        note: s.note ?? '',
      })),
    );
  }, [data]);

  const upsert = useUpsertRoundSchedules();
  const del = useDeleteRoundSchedules();
  const copy = useCopyRoundSchedules();

  const busy =
    upsert.isPending || del.isPending || copy.isPending || isFetching;

  const yesterday = useMemo(
    () => format(subDays(new Date(date + 'T00:00:00'), 1), 'yyyy-MM-dd'),
    [date],
  );

  const addRow = () => {
    setRows((prev) => {
      const nextNo = prev.length === 0 ? 1 : prev[prev.length - 1].roundNo + 1;
      const last = prev[prev.length - 1];
      const start = last ? last.plannedEnd || '08:00' : '08:00';
      const end = addMinutes(start, DEFAULT_DURATION_MIN);
      return [
        ...prev,
        { roundNo: nextNo, plannedStart: start, plannedEnd: end, note: '' },
      ];
    });
  };

  const removeRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateRow = (idx: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const handleSave = async () => {
    setErrorMsg(null);
    try {
      await upsert.mutateAsync({
        slaughterHouse,
        auctionDate: date,
        schedules: rows.map((r) => ({
          roundNo: r.roundNo,
          plannedStart: r.plannedStart,
          plannedEnd: r.plannedEnd,
          note: r.note || null,
        })),
        updatedBy: adminName,
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '저장에 실패했습니다.');
    }
  };

  const handleReset = async () => {
    if (!confirm(`${date} ${slaughterHouse} 예정 시간표를 초기화할까요?`)) return;
    setErrorMsg(null);
    try {
      await del.mutateAsync({ slaughterHouse, date });
      setRows([]);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '초기화에 실패했습니다.');
    }
  };

  const handleCopyYesterday = async () => {
    setErrorMsg(null);
    try {
      const res = await copy.mutateAsync({
        slaughterHouse,
        fromDate: yesterday,
        toDate: date,
        updatedBy: adminName,
      });
      setRows(
        res.schedules.map((s) => ({
          roundNo: s.roundNo,
          plannedStart: toHmm(s.plannedStart),
          plannedEnd: toHmm(s.plannedEnd),
          note: s.note ?? '',
        })),
      );
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch (e) {
      setErrorMsg(
        e instanceof Error ? e.message : '이전 날짜에 스케줄이 없습니다.',
      );
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">경매 예정시간 설정</h1>
            <p className="mt-1 text-xs text-gray-500">
              공판장·일자별로 회차 예정 시간표를 등록하면 실시간 경매 페이지에
              그대로 노출됩니다. 자동 시작/종료는 하지 않으며 담당자 수동
              진행을 유지합니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={busy || rows.length === 0}
              className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              초기화
            </button>
            <button
              type="button"
              onClick={handleCopyYesterday}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              <Copy className="h-3.5 w-3.5" />
              이전 날짜 복제
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {upsert.isPending ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border border-gray-200 bg-white p-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500">공판장</label>
            <select
              value={slaughterHouse}
              onChange={(e) => setSlaughterHouse(e.target.value)}
              disabled={busy}
              className="border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-gray-400"
            >
              {SLAUGHTER_HOUSES.map((sh) => (
                <option key={sh} value={sh}>
                  {sh}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500">날짜</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={busy}
              className="border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>
          <div className="ml-auto text-xs text-gray-400">
            {isLoading ? '불러오는 중...' : `등록된 회차 ${rows.length}개`}
            {savedFlash && (
              <span className="ml-3 text-emerald-600">저장되었습니다</span>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {errorMsg}
          </div>
        )}

        <div className="border border-gray-200 bg-white">
          <table className="w-full">
            <colgroup>
              <col className="w-16" />
              <col className="w-32" />
              <col className="w-32" />
              <col />
              <col className="w-16" />
            </colgroup>
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
                <th className="px-3 py-2 text-left font-medium">회차</th>
                <th className="px-3 py-2 text-left font-medium">시작</th>
                <th className="px-3 py-2 text-left font-medium">종료</th>
                <th className="px-3 py-2 text-left font-medium">비고</th>
                <th className="px-3 py-2 text-center font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-10 text-center text-xs text-gray-400"
                  >
                    등록된 회차가 없습니다. 아래 &quot;+ 회차 추가&quot; 로
                    시간표를 만들어 주세요.
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-100 last:border-b-0"
                  >
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={1}
                        value={row.roundNo}
                        onChange={(e) =>
                          updateRow(idx, {
                            roundNo: Number(e.target.value) || 0,
                          })
                        }
                        className="w-full border border-gray-200 px-2 py-1 text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-gray-400"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="time"
                        value={row.plannedStart}
                        onChange={(e) =>
                          updateRow(idx, { plannedStart: e.target.value })
                        }
                        className="w-full border border-gray-200 px-2 py-1 text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-gray-400"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="time"
                        value={row.plannedEnd}
                        onChange={(e) =>
                          updateRow(idx, { plannedEnd: e.target.value })
                        }
                        className="w-full border border-gray-200 px-2 py-1 text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-gray-400"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={row.note}
                        onChange={(e) =>
                          updateRow(idx, { note: e.target.value })
                        }
                        placeholder="선택 사항 (예: 특별 회차)"
                        className="w-full border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-gray-400"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        className="inline-flex h-6 w-6 items-center justify-center text-gray-400 hover:text-red-600"
                        title="삭제"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="border-t border-gray-100 p-2">
            <button
              type="button"
              onClick={addRow}
              className="inline-flex w-full items-center justify-center gap-1 border border-dashed border-gray-300 py-2 text-xs font-medium text-gray-600 hover:border-gray-400 hover:text-gray-900"
            >
              <Plus className="h-3.5 w-3.5" />
              회차 추가
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
