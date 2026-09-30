'use client';

import { useEffect, useMemo, useState } from 'react';
import { addMonths, format, isSameMonth } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useSession } from 'next-auth/react';
import { ChevronLeft, ChevronRight, Save } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { SLAUGHTER_HOUSES } from '@/constants/slaughterHouses';
import {
  useAuctionCalendarMonth,
  useSaveAuctionDays,
} from '@/features/auction-days/hooks/useAuctionCalendarMonth';
import type { AuctionDay } from '@/features/auction-days/types';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;
/** 부분육 경매가 실제로 서는 요일 · 일괄 버튼의 기본값 */
const DEFAULT_OPEN_WEEKDAYS = [2, 4];

/** 화면에서 다루는 한 날의 상태 · 저장 전까지는 여기에만 있다 */
interface DraftDay {
  isOpen: boolean;
  note: string;
}

type Draft = Map<string, DraftDay>;

export default function AuctionCalendarSettingsPage() {
  const { data: session } = useSession();
  const adminName =
    (session as unknown as { user?: { name?: string } } | null)?.user?.name ??
    '관리자';

  const [slaughterHouse, setSlaughterHouse] = useState<string>(
    SLAUGHTER_HOUSES[0],
  );
  const [anchor, setAnchor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const month = format(anchor, 'yyyy-MM');

  const { data, isLoading, isFetching } = useAuctionCalendarMonth(
    month,
    slaughterHouse,
  );
  const save = useSaveAuctionDays();

  const [draft, setDraft] = useState<Draft>(new Map());
  const [savedFlash, setSavedFlash] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 서버 응답이 오면 초안을 그 값으로 다시 깐다 (달·공판장을 바꿔도 같은 경로)
  useEffect(() => {
    if (!data) return;
    const next: Draft = new Map();
    data.days.forEach((d) => {
      if (d.status === 'unset') return;
      next.set(d.date, { isOpen: d.status === 'open', note: d.note ?? '' });
    });
    setDraft(next);
  }, [data]);

  const serverByDate = useMemo(() => {
    const map = new Map<string, AuctionDay>();
    data?.days.forEach((d) => map.set(d.date, d));
    return map;
  }, [data]);

  const cells = useMemo(() => buildMonthGrid(anchor), [anchor]);
  const openCount = useMemo(
    () => [...draft.values()].filter((d) => d.isOpen).length,
    [draft],
  );
  const closedCount = draft.size - openCount;

  const patch = (date: string, next: DraftDay | null) =>
    setDraft((prev) => {
      const map = new Map(prev);
      if (next === null) map.delete(date);
      else map.set(date, next);
      return map;
    });

  /** 개장 → 휴장 → 미정 → 개장 순환 · 세 상태를 한 손가락으로 오간다 */
  const cycle = (date: string) => {
    const current = draft.get(date);
    if (!current) patch(date, { isOpen: true, note: '' });
    else if (current.isOpen) patch(date, { ...current, isOpen: false });
    else patch(date, null);
  };

  const applyWeekdays = () => {
    const next: Draft = new Map(draft);
    cells.forEach((day) => {
      if (!day) return;
      const key = format(day, 'yyyy-MM-dd');
      if (!DEFAULT_OPEN_WEEKDAYS.includes(day.getDay())) return;
      const prev = next.get(key);
      next.set(key, { isOpen: true, note: prev?.note ?? '' });
    });
    setDraft(next);
  };

  const clearMonth = () => setDraft(new Map());

  const handleSave = async () => {
    setErrorMsg(null);
    try {
      await save.mutateAsync({
        slaughterHouse,
        month,
        days: [...draft.entries()].map(([date, d]) => ({
          date,
          isOpen: d.isOpen,
          note: d.note || null,
        })),
        updatedBy: adminName,
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1600);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '저장에 실패했습니다.');
    }
  };

  const busy = save.isPending || isFetching;

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">경매 일정 설정</h1>
        <p className="mt-1 text-sm text-gray-500">
          공판장별로 장이 서는 날과 쉬는 날을 미리 선언합니다. 경매장 사이드 메뉴의
          「경매 일정」 달력에 그대로 보입니다.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded border border-gray-200 bg-white p-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">공판장</span>
          <select
            value={slaughterHouse}
            onChange={(e) => setSlaughterHouse(e.target.value)}
            className="h-9 rounded border border-gray-300 px-2 text-sm"
          >
            {SLAUGHTER_HOUSES.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">기준 월</span>
          <div className="flex h-9 items-center gap-1">
            <button
              type="button"
              onClick={() => setAnchor((m) => addMonths(m, -1))}
              aria-label="이전 달"
              className="inline-flex h-9 w-9 items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="w-28 text-center text-sm font-bold tabular-nums text-gray-900">
              {format(anchor, 'yyyy년 M월', { locale: ko })}
            </span>
            <button
              type="button"
              onClick={() => setAnchor((m) => addMonths(m, 1))}
              aria-label="다음 달"
              className="inline-flex h-9 w-9 items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={applyWeekdays}
            disabled={busy}
            className="h-9 rounded border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            매주 화·목 개장
          </button>
          <button
            type="button"
            onClick={clearMonth}
            disabled={busy}
            className="h-9 rounded border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            이 달 비우기
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            className="inline-flex h-9 items-center gap-1.5 rounded bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {save.isPending ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      {errorMsg ? (
        <p className="mb-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errorMsg}
        </p>
      ) : null}
      {savedFlash ? (
        <p className="mb-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          저장되었습니다.
        </p>
      ) : null}

      <div className="rounded border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            날짜를 누를 때마다{' '}
            <span className="font-semibold text-gray-900">개장 → 휴장 → 미정</span>{' '}
            순으로 바뀝니다.
          </p>
          <p className="text-sm tabular-nums text-gray-600">
            개장 <span className="font-bold text-gray-900">{openCount}</span>일 ·
            휴장 <span className="font-bold text-gray-900">{closedCount}</span>일
          </p>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((w, i) => (
            <span
              key={w}
              className={`py-1 text-center text-xs font-semibold ${
                i === 0 ? 'text-rose-500' : 'text-gray-500'
              }`}
            >
              {w}
            </span>
          ))}

          {cells.map((day, i) => {
            if (!day) return <span key={`pad-${i}`} aria-hidden />;
            const key = format(day, 'yyyy-MM-dd');
            const entry = draft.get(key);
            const server = serverByDate.get(key);
            return (
              <DayCell
                key={key}
                day={day}
                draft={entry}
                roundCount={server?.roundCount ?? 0}
                totalListings={server?.totalListings ?? 0}
                onClick={() => cycle(key)}
                onNote={(note) => entry && patch(key, { ...entry, note })}
              />
            );
          })}
        </div>

        {isLoading ? (
          <p className="mt-3 text-sm text-gray-500">불러오는 중...</p>
        ) : null}
      </div>
    </AdminLayout>
  );
}

/**
 * 날짜 한 칸.
 *
 * 개장으로 잡아 뒀는데 회차 시간표가 비어 있으면 경고를 띄운다. 두 설정이 따로 있어서
 * 「장은 여는데 몇 시에 여는지는 아무도 모르는 날」이 조용히 생길 수 있는데,
 * 그 날은 경매장 화면에서 링이 돌지 않아 현장에서야 발견된다.
 */
function DayCell({
  day,
  draft,
  roundCount,
  totalListings,
  onClick,
  onNote,
}: {
  day: Date;
  draft: DraftDay | undefined;
  roundCount: number;
  totalListings: number;
  onClick: () => void;
  onNote: (note: string) => void;
}) {
  const isOpen = draft?.isOpen === true;
  const isClosed = draft?.isOpen === false;
  const needsSchedule = isOpen && roundCount === 0;

  return (
    <div
      className={`flex min-h-[86px] flex-col rounded border p-1.5 ${
        isOpen
          ? 'border-gray-900 bg-gray-900/[0.04]'
          : isClosed
            ? 'border-gray-200 bg-gray-50'
            : 'border-gray-200 bg-white'
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex items-center justify-between text-left"
      >
        <span
          className={`text-sm tabular-nums ${
            isOpen
              ? 'font-bold text-gray-900'
              : isClosed
                ? 'font-medium text-gray-400'
                : 'font-medium text-gray-500'
          }`}
        >
          {day.getDate()}
        </span>
        <span
          className={`rounded px-1 text-[10px] font-bold ${
            isOpen
              ? 'bg-gray-900 text-white'
              : isClosed
                ? 'bg-gray-200 text-gray-600'
                : 'text-gray-300'
          }`}
        >
          {isOpen ? '개장' : isClosed ? '휴장' : '미정'}
        </span>
      </button>

      {isOpen ? (
        <p className="mt-1 text-[10px] tabular-nums text-gray-500">
          {roundCount > 0 ? `${roundCount}회차` : null}
          {totalListings > 0 ? ` · 상장 ${totalListings}두` : null}
          {needsSchedule ? (
            <span className="font-semibold text-amber-600">시간표 없음</span>
          ) : null}
        </p>
      ) : null}

      {draft ? (
        <input
          value={draft.note}
          onChange={(e) => onNote(e.target.value)}
          placeholder={isClosed ? '휴장 사유' : '메모'}
          className="mt-auto w-full rounded border border-gray-200 px-1 py-0.5 text-[11px] placeholder:text-gray-300 focus:border-gray-400 focus:outline-none"
        />
      ) : null}
    </div>
  );
}

/** 앞뒤 빈 칸을 `null` 로 채운 6주 그리드 */
function buildMonthGrid(anchor: Date): (Date | null)[] {
  const pad = new Date(anchor.getFullYear(), anchor.getMonth(), 1).getDay();
  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(anchor.getFullYear(), anchor.getMonth(), i - pad + 1);
    return isSameMonth(day, anchor) ? day : null;
  });
}
