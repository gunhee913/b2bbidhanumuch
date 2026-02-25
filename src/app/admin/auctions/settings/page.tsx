'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useListings } from '@/features/listings/hooks';
import { CattleListing } from '@/features/listings/types';
import {
  Play,
  Trash2,
  GripVertical,
  AlertCircle,
  CheckCircle,
  Loader2,
  Save,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


interface RoundConfig {
  id: string;
  listingIds: string[];
  durationMin: number;
  termDurationMin: number;
  inputStartTime: string;
  status?: string;
  startTime?: string;
  endTime?: string;
}

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTomorrowDateString = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const statusBadge = (status?: string) => {
  switch (status) {
    case 'auction':
      return <span className="px-1.5 py-0.5 text-[9px] font-medium bg-blue-100 text-blue-700 rounded">경매중</span>;
    case 'completed':
      return <span className="px-1.5 py-0.5 text-[9px] font-medium bg-green-100 text-green-700 rounded">마감</span>;
    case 'closed':
      return <span className="px-1.5 py-0.5 text-[9px] font-medium bg-gray-100 text-gray-600 rounded">마감</span>;
    case 'approved':
      return <span className="px-1.5 py-0.5 text-[9px] font-medium bg-amber-100 text-amber-700 rounded">승인</span>;
    default:
      return null;
  }
};

function ListingItem({
  listing,
  rounds,
  readOnly,
  onAssign,
}: {
  listing: CattleListing;
  rounds: RoundConfig[];
  readOnly?: boolean;
  onAssign: (listingId: string, roundIdx: number) => void;
}) {
  const assignedRoundIdxs = rounds
    .map((r, i) => (r.listingIds.includes(listing.id) ? i : -1))
    .filter((i) => i >= 0);

  return (
    <div className="px-3 py-2 flex items-center justify-between hover:bg-gray-50 group">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-900">
            {listing.listingNo}
          </span>
          {statusBadge(listing.status)}
          {assignedRoundIdxs.length > 0 && (
            <span className="text-[9px] text-blue-600 font-medium">
              {assignedRoundIdxs.map((i) => `${i + 1}차`).join(', ')}
            </span>
          )}
        </div>
        <div className="text-[10px] text-gray-500 truncate">
          {listing.companyName} | {listing.grade} | {listing.gender}
        </div>
      </div>
      {!readOnly && rounds.length > 0 && (
        <div className="flex items-center gap-1 flex-shrink-0">
          {rounds.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onAssign(listing.id, idx)}
              className={`px-1.5 py-0.5 text-[10px] font-medium border rounded transition-colors ${
                rounds[idx].listingIds.includes(listing.id)
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : 'border-gray-300 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {idx + 1}차
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface SortableRoundItemProps {
  compositeId: string;
  listingId: string;
  listing: CattleListing | undefined;
  roundIdx: number;
  readOnly?: boolean;
  onUnassign: (listingId: string, roundIdx: number) => void;
}

function SortableRoundItem({
  compositeId,
  listingId,
  listing,
  roundIdx,
  readOnly,
  onUnassign,
}: SortableRoundItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: compositeId, disabled: readOnly });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 group"
    >
      <div className="flex items-center gap-2">
        {!readOnly && (
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing touch-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-3 h-3 text-gray-300" />
          </button>
        )}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-900">
            {listing?.listingNo || listingId.slice(0, 8)}
          </span>
          {statusBadge(listing?.status)}
          <span className="text-[10px] text-gray-500">
            {listing?.companyName} | {listing?.grade} | {listing?.gender}
          </span>
        </div>
      </div>
      {!readOnly && (
        <button
          type="button"
          onClick={() => onUnassign(listingId, roundIdx)}
          className="p-1 text-gray-400 hover:text-red-600"
          title="배정 취소"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export default function AuctionSettingsPage() {
  const [auctionDate, setAuctionDate] = useState(getTomorrowDateString());
  const DEFAULT_DURATION_MIN = 20;
  const DEFAULT_TERM_MIN = 10;
  const DEFAULT_START_TIME = '08:30';
  const [rounds, setRounds] = useState<RoundConfig[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const [startResult, setStartResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isLoadingRounds, setIsLoadingRounds] = useState(false);
  const [auctionStatus, setAuctionStatus] = useState<'none' | 'scheduled' | 'started'>('none');
  const [isResetting, setIsResetting] = useState(false);

  // 경매일 변경 시 DB에서 기존 배정 데이터 불러오기
  useEffect(() => {
    const fetchExistingRounds = async () => {
      setIsLoadingRounds(true);
      setStartResult(null);
      try {
        const res = await fetch(`/api/auctions/rounds?auctionDate=${auctionDate}`);
        if (!res.ok) {
          setRounds([]);
          setAuctionStatus('none');
          return;
        }
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) {
          setRounds([]);
          setAuctionStatus('none');
          return;
        }

        const hasStarted = data.some((r: any) => r.status === 'open' || r.status === 'closed');
        setAuctionStatus(hasStarted ? 'started' : 'scheduled');

        setRounds(
          data.map((r: any) => ({
            id: r.id,
            listingIds: r.listingIds || [],
            durationMin: r.round_duration_min || DEFAULT_DURATION_MIN,
            termDurationMin: r.term_duration_min ?? DEFAULT_TERM_MIN,
            inputStartTime: r.start_time?.slice(0, 5) || DEFAULT_START_TIME,
            status: r.status,
            startTime: r.start_time?.slice(0, 5),
            endTime: r.end_time?.slice(0, 5),
          }))
        );
      } catch {
        setRounds([]);
        setAuctionStatus('none');
      } finally {
        setIsLoadingRounds(false);
      }
    };

    fetchExistingRounds();
  }, [auctionDate]);

  const isReadOnly = auctionStatus === 'started';

  // 승인된 + 경매중 + 마감 상장 목록 조회
  const { data: listings, isLoading, refetch: refetchListings } = useListings({
    status: 'approved,auction,completed,closed' as any,
    listingDateFrom: auctionDate,
    listingDateTo: auctionDate,
    includeParts: false,
  });

  const allListingsSorted = useMemo(() => {
    if (!listings) return [];
    return [...listings].sort((a: CattleListing, b: CattleListing) => {
      const suffixA = parseInt((a.listingNo || '0').split('-').pop() || '0', 10);
      const suffixB = parseInt((b.listingNo || '0').split('-').pop() || '0', 10);
      return suffixA - suffixB;
    });
  }, [listings]);

  const sortByListingNo = useCallback(
    (ids: string[]) => {
      if (!listings) return ids;
      return [...ids].sort((a, b) => {
        const la = listings.find((l: CattleListing) => l.id === a);
        const lb = listings.find((l: CattleListing) => l.id === b);
        const suffixA = parseInt((la?.listingNo || '0').split('-').pop() || '0', 10);
        const suffixB = parseInt((lb?.listingNo || '0').split('-').pop() || '0', 10);
        return suffixA - suffixB;
      });
    },
    [listings]
  );

  // DB 로드 후 회차 내 상장을 접수번호 오름차순 정렬
  useEffect(() => {
    if (!listings || listings.length === 0 || rounds.length === 0) return;
    const needsSort = rounds.some((r) => {
      const sorted = sortByListingNo(r.listingIds);
      return sorted.some((id, i) => id !== r.listingIds[i]);
    });
    if (needsSort) {
      setRounds((prev) =>
        prev.map((r) => ({ ...r, listingIds: sortByListingNo(r.listingIds) }))
      );
    }
  }, [listings]);

  // 전체 배정: 1차에 모든 상장 배정
  const handleAutoAssign = useCallback(() => {
    if (!allListingsSorted || allListingsSorted.length === 0) return;

    const allIds = allListingsSorted.map((l: CattleListing) => l.id);

    if (rounds.length === 0) {
      setRounds([{ id: `round-${Date.now()}`, listingIds: allIds, durationMin: DEFAULT_DURATION_MIN, termDurationMin: DEFAULT_TERM_MIN, inputStartTime: DEFAULT_START_TIME }]);
    } else {
      setRounds((prev) => [
        { ...prev[0], listingIds: allIds },
        ...prev.slice(1),
      ]);
    }
  }, [allListingsSorted, rounds]);

  // 전체 초기화 (DB에 저장된 경우 DB도 함께 삭제)
  const handleReset = useCallback(async () => {
    if (rounds.length === 0) return;
    if (!confirm('모든 배정을 초기화하시겠습니까?')) return;

    if (auctionStatus === 'scheduled') {
      try {
        const res = await fetch(`/api/auctions/rounds?auctionDate=${auctionDate}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          const data = await res.json();
          alert(data.error || '초기화 실패');
          return;
        }
        setAuctionStatus('none');
        refetchListings();
      } catch {
        alert('네트워크 오류가 발생했습니다.');
        return;
      }
    }

    setRounds([]);
    setStartResult(null);
  }, [rounds, auctionStatus, auctionDate, refetchListings]);

  // 경매 초기화 (DB에서 경매 삭제 + 상장 상태 복원)
  const handleResetAuction = useCallback(async () => {
    if (!confirm(
      `${auctionDate} 경매를 초기화하시겠습니까?\n\n` +
      '• 모든 회차 데이터가 삭제됩니다.\n' +
      '• 입찰 데이터가 삭제됩니다.\n' +
      '• 상장 상태가 "승인"으로 복원됩니다.\n\n' +
      '이 작업은 되돌릴 수 없습니다.'
    )) return;

    setIsResetting(true);
    try {
      const res = await fetch(`/api/auctions/rounds?auctionDate=${auctionDate}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || '경매 초기화 실패');
        return;
      }

      setRounds([]);
      setAuctionStatus('none');
      setStartResult({ success: true, message: data.message });
      refetchListings();
      setTimeout(() => setStartResult(null), 5000);
    } catch {
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setIsResetting(false);
    }
  }, [auctionDate, refetchListings]);


  // 상장을 특정 회차로 이동
  const handleAddRound = useCallback(() => {
    setRounds((prev) => {
      const lastRound = prev[prev.length - 1];
      let nextStartTime = DEFAULT_START_TIME;
      if (lastRound?.inputStartTime) {
        const [h, m] = lastRound.inputStartTime.split(':').map(Number);
        const totalMin = h * 60 + m + lastRound.durationMin + lastRound.termDurationMin;
        nextStartTime = `${String(Math.floor(totalMin / 60)).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;
      }
      return [
        ...prev,
        { id: `round-${Date.now()}`, listingIds: [], durationMin: DEFAULT_DURATION_MIN, termDurationMin: DEFAULT_TERM_MIN, inputStartTime: nextStartTime },
      ];
    });
  }, []);

  const handleRemoveRound = useCallback((roundIdx: number) => {
    setRounds((prev) => prev.filter((_, i) => i !== roundIdx));
  }, []);

  const handleRoundDurationChange = useCallback((roundIdx: number, value: number) => {
    setRounds((prev) =>
      prev.map((r, i) => (i === roundIdx ? { ...r, durationMin: value } : r))
    );
  }, []);

  const handleRoundStartTimeChange = useCallback((roundIdx: number, value: string) => {
    setRounds((prev) =>
      prev.map((r, i) => (i === roundIdx ? { ...r, inputStartTime: value } : r))
    );
  }, []);

  const handleRoundTermChange = useCallback((roundIdx: number, value: number) => {
    setRounds((prev) =>
      prev.map((r, i) => (i === roundIdx ? { ...r, termDurationMin: value } : r))
    );
  }, []);

  const handleToggleAssign = useCallback(
    (listingId: string, targetRoundIdx: number) => {
      setRounds((prev) =>
        prev.map((r, i) => {
          if (i !== targetRoundIdx) return r;
          if (r.listingIds.includes(listingId)) {
            return { ...r, listingIds: r.listingIds.filter((id) => id !== listingId) };
          }
          return { ...r, listingIds: [...r.listingIds, listingId] };
        })
      );
    },
    []
  );

  const handleUnassignFromRound = useCallback((listingId: string, roundIdx: number) => {
    setRounds((prev) =>
      prev.map((r, i) =>
        i === roundIdx ? { ...r, listingIds: r.listingIds.filter((id) => id !== listingId) } : r
      )
    );
  }, []);

  // 배정 저장 (DB에 저장, 경매 시작 없이)
  const handleSaveToDb = async () => {
    const validRounds = rounds.filter((r) => r.listingIds.length > 0);
    if (validRounds.length === 0) {
      alert('최소 1개 회차에 상장을 배정해주세요.');
      return;
    }

    setIsSavingToDb(true);
    try {
      const res = await fetch('/api/auctions/rounds', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auctionDate,
          rounds: validRounds.map((r) => ({
            listingIds: r.listingIds,
            durationMin: r.durationMin,
            termDurationMin: r.termDurationMin,
            startTime: r.inputStartTime,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || '배정 저장 실패');
        return;
      }

      setStartResult({ success: true, message: data.message || '배정이 저장되었습니다.' });
      setTimeout(() => setStartResult(null), 3000);
    } catch {
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setIsSavingToDb(false);
    }
  };

  // 경매 시작
  const handleStartAuction = async () => {
    const validRounds = rounds.filter((r) => r.listingIds.length > 0);
    if (validRounds.length === 0) {
      alert('최소 1개 회차에 상장을 배정해주세요.');
      return;
    }

    const totalCount = validRounds.reduce((sum, r) => sum + r.listingIds.length, 0);
    if (!confirm(`${validRounds.length}개 차수, ${totalCount}두로 경매를 시작하시겠습니까?`)) {
      return;
    }

    setIsStarting(true);
    setStartResult(null);

    try {
      const res = await fetch('/api/auctions/rounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auctionDate,
          title: `${format(new Date(auctionDate), 'yyyy년 MM월 dd일')} 경매`,
          rounds: validRounds.map((r) => ({
            listingIds: r.listingIds,
            durationMin: r.durationMin,
            termDurationMin: r.termDurationMin,
            startTime: r.inputStartTime,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStartResult({ success: false, message: data.error || '경매 시작 실패' });
        return;
      }

      setStartResult({
        success: true,
        message: data.message || '경매가 시작되었습니다.',
      });
      setAuctionStatus('started');
    } catch (err) {
      setStartResult({ success: false, message: '네트워크 오류가 발생했습니다.' });
    } finally {
      setIsStarting(false);
    }
  };

  // 상장 정보 찾기
  const getListingInfo = (listingId: string) => {
    return listings?.find((l: CattleListing) => l.id === listingId);
  };

  const totalListings = listings?.length || 0;
  const uniqueAssigned = useMemo(() => {
    const ids = new Set<string>();
    rounds.forEach((r) => r.listingIds.forEach((id) => ids.add(id)));
    return ids.size;
  }, [rounds]);
  const totalAssigned = rounds.reduce((sum, r) => sum + r.listingIds.length, 0);

  const makeCompositeId = (roundIdx: number, listingId: string) => `${roundIdx}::${listingId}`;
  const parseCompositeId = (compositeId: string) => {
    const [roundIdxStr, ...rest] = compositeId.split('::');
    return { roundIdx: parseInt(roundIdxStr), listingId: rest.join('::') };
  };

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || active.id === over.id) return;

      const activeComposite = active.id as string;
      const overComposite = over.id as string;

      const activeParsed = parseCompositeId(activeComposite);
      const overParsed = parseCompositeId(overComposite);

      if (activeParsed.roundIdx !== overParsed.roundIdx) return;

      const roundIdx = activeParsed.roundIdx;
      setRounds((prev) => {
        const round = prev[roundIdx];
        if (!round) return prev;
        const oldIndex = round.listingIds.indexOf(activeParsed.listingId);
        const newIndex = round.listingIds.indexOf(overParsed.listingId);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return prev.map((r, i) =>
          i === roundIdx ? { ...r, listingIds: arrayMove(r.listingIds, oldIndex, newIndex) } : r
        );
      });
    },
    []
  );

  const activeListing = activeId ? getListingInfo(parseCompositeId(activeId).listingId) : null;

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">경매 설정</h1>
        <p className="text-sm text-gray-500 mt-1">
          승인된 상장을 경매에 배정하고 시작합니다.
        </p>
      </div>

      {/* 기본 설정 */}
      <style>{`
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
      <div className="bg-white border border-gray-200 p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">경매 기본 설정</h2>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">경매일</span>
            <input
              type="date"
              value={auctionDate}
              onChange={(e) => setAuctionDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
            />
          </div>
        </div>
      </div>

      {/* 요약 + 액션 바 */}
      <div className="bg-white border border-gray-200 p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <span>
            승인 상장: <strong className="text-gray-900">{totalListings}두</strong>
          </span>
          <span>
            배정 개체: <strong className="text-gray-900">{uniqueAssigned}두</strong>
          </span>
          <span>
            총 배정 건수: <strong className="text-gray-900">{totalAssigned}건</strong>
            {totalAssigned > uniqueAssigned && (
              <span className="text-[10px] text-blue-600 ml-1">(중복 {totalAssigned - uniqueAssigned}건 포함)</span>
            )}
          </span>
        </div>
        {!isReadOnly && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddRound}
              className="px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              차수 추가
            </button>
            <button
              type="button"
              onClick={handleAutoAssign}
              disabled={!allListingsSorted.length}
              className="px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              전체 배정
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={rounds.length === 0}
              className="px-3 py-1.5 text-xs font-medium border border-gray-300 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              초기화
            </button>
            <button
              type="button"
              onClick={handleSaveToDb}
              disabled={isSavingToDb || rounds.filter((r) => r.listingIds.length > 0).length === 0}
              className="px-4 py-1.5 text-xs font-medium border border-gray-800 text-gray-800 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isSavingToDb ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              배정 저장
            </button>
            <button
              type="button"
              onClick={handleStartAuction}
              disabled={isStarting || rounds.filter((r) => r.listingIds.length > 0).length === 0 || !!startResult?.success}
              className="px-4 py-1.5 text-xs font-medium bg-gray-800 text-white hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isStarting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              경매 시작
            </button>
          </div>
        )}
      </div>

      {/* 경매 진행중 알림 */}
      {isReadOnly && (
        <div className="p-3 mb-4 flex items-center justify-between bg-blue-50 border border-blue-200 text-blue-800">
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
            이 날짜의 경매가 이미 시작되었습니다. 설정을 변경할 수 없습니다.
            <a
              href="/admin/auctions/live"
              className="ml-1 underline font-medium hover:no-underline"
            >
              실시간 현황 보기
            </a>
          </div>
          <button
            type="button"
            onClick={handleResetAuction}
            disabled={isResetting}
            className="ml-4 px-3 py-1.5 text-xs font-medium border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 flex-shrink-0"
          >
            {isResetting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            경매 초기화
          </button>
        </div>
      )}

      {/* 저장된 배정 복원 알림 */}
      {auctionStatus === 'scheduled' && rounds.length > 0 && !startResult && (
        <div className="p-3 mb-4 flex items-center gap-2 text-sm bg-gray-50 border border-gray-200 text-gray-700">
          <CheckCircle className="w-4 h-4 text-gray-500" />
          저장된 배정 데이터를 불러왔습니다.
        </div>
      )}

      {/* 시작 결과 알림 */}
      {startResult && (
        <div
          className={`p-3 mb-4 flex items-center gap-2 text-sm ${
            startResult.success
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {startResult.success ? (
            <CheckCircle className="w-4 h-4 text-green-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600" />
          )}
          {startResult.message}
          {startResult.success && (
            <a
              href="/admin/auctions/live"
              className="ml-2 underline font-medium hover:no-underline"
            >
              실시간 현황 보기
            </a>
          )}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
      <div className="flex gap-4">
        {/* 전체 상장 목록 (좌측) */}
        <div className="w-80 flex-shrink-0">
          <div className="bg-white border border-gray-200 overflow-hidden sticky top-4">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700">
                전체 상장 ({allListingsSorted.length})
              </h3>
            </div>
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-100">
              {isLoading ? (
                <div className="p-8 text-center text-sm text-gray-400">로딩 중...</div>
              ) : allListingsSorted.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400">
                  승인된 상장이 없습니다.
                </div>
              ) : (
                allListingsSorted.map((listing: CattleListing) => (
                  <ListingItem
                    key={listing.id}
                    listing={listing}
                    rounds={rounds}
                    readOnly={isReadOnly}
                    onAssign={handleToggleAssign}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* 경매 배정 (우측) */}
          <div className="flex-1 space-y-4">
            {isLoadingRounds ? (
              <div className="bg-white border border-gray-200 p-12 text-center">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto mb-2" />
                <div className="text-sm text-gray-500">배정 데이터를 불러오는 중...</div>
              </div>
            ) : rounds.length === 0 ? (
              <div className="bg-white border border-gray-200 p-12 text-center">
                <div className="text-sm text-gray-500 mb-4">
                  {isReadOnly
                    ? '이 날짜에 배정된 경매가 없습니다.'
                    : '경매 배정이 없습니다. "전체 배정" 버튼을 클릭하세요.'}
                </div>
                {!isReadOnly && (
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={handleAutoAssign}
                      disabled={totalListings === 0}
                      className="px-4 py-2 text-xs font-medium bg-gray-800 text-white hover:bg-gray-900 disabled:opacity-50"
                    >
                      전체 배정
                    </button>
                  </div>
                )}
              </div>
            ) : (
              rounds.map((round, roundIdx) => (
                <div key={round.id} className="bg-white border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-900">
                        {roundIdx + 1}차
                      </span>
                      {round.status === 'open' && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded animate-pulse">진행중</span>
                      )}
                      {round.status === 'closed' && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-200 text-gray-600 rounded">마감</span>
                      )}
                      {round.status === 'scheduled' && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded">대기</span>
                      )}
                      <span className="text-xs text-gray-500">
                        {round.listingIds.length}두
                      </span>
                      {!isReadOnly ? (
                        <div className="flex items-center gap-2 ml-2">
                          <span className="text-[10px] text-gray-500">시작</span>
                          <input
                            type="time"
                            value={round.inputStartTime}
                            onChange={(e) => handleRoundStartTimeChange(roundIdx, e.target.value)}
                            className="px-1.5 py-0.5 border border-gray-200 text-[11px] outline-none bg-white"
                          />
                          <span className="text-gray-300">|</span>
                          <span className="text-[10px] text-gray-500">경매</span>
                          <input
                            type="number"
                            value={round.durationMin}
                            onChange={(e) => handleRoundDurationChange(roundIdx, Math.max(1, parseInt(e.target.value) || 1))}
                            min={1}
                            className="w-12 px-1.5 py-0.5 border border-gray-200 text-[11px] outline-none bg-white text-center"
                          />
                          <span className="text-[10px] text-gray-500">분</span>
                          <span className="text-gray-300">|</span>
                          <span className="text-[10px] text-gray-500">휴식</span>
                          <input
                            type="number"
                            value={round.termDurationMin}
                            onChange={(e) => handleRoundTermChange(roundIdx, Math.max(0, parseInt(e.target.value) || 0))}
                            min={0}
                            className="w-12 px-1.5 py-0.5 border border-gray-200 text-[11px] outline-none bg-white text-center"
                          />
                          <span className="text-[10px] text-gray-500">분</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">
                          {round.startTime && round.endTime
                            ? `${round.startTime} ~ ${round.endTime}`
                            : `${round.inputStartTime} (${round.durationMin}분)`}
                        </span>
                      )}
                    </div>
                    {!isReadOnly && rounds.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRound(roundIdx)}
                        className="text-xs text-red-500 hover:text-red-700 px-2 py-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <SortableContext
                    items={round.listingIds.map((lid) => makeCompositeId(roundIdx, lid))}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="divide-y divide-gray-100 min-h-[48px]">
                      {round.listingIds.length === 0 ? (
                        <div className="px-4 py-6 text-center text-xs text-gray-400">
                          좌측에서 차수 버튼을 클릭하여 배정하세요.
                        </div>
                      ) : (
                        round.listingIds.map((listingId) => (
                          <SortableRoundItem
                            key={makeCompositeId(roundIdx, listingId)}
                            compositeId={makeCompositeId(roundIdx, listingId)}
                            listingId={listingId}
                            listing={getListingInfo(listingId)}
                            roundIdx={roundIdx}
                            readOnly={isReadOnly}
                            onUnassign={handleUnassignFromRound}
                          />
                        ))
                      )}
                    </div>
                  </SortableContext>
                </div>
              ))
            )}
          </div>

          <DragOverlay>
            {activeId && activeListing ? (
              <div className="px-4 py-2.5 flex items-center gap-2 bg-white border border-gray-300 shadow-lg rounded">
                <GripVertical className="w-3 h-3 text-gray-400" />
                <span className="text-xs font-medium text-gray-900">
                  {activeListing.listingNo || activeId.slice(0, 8)}
                </span>
                <span className="text-[10px] text-gray-500 ml-1">
                  {activeListing.companyName} | {activeListing.grade} | {activeListing.gender}
                </span>
              </div>
            ) : null}
          </DragOverlay>
      </div>
      </DndContext>
    </AdminLayout>
  );
}
