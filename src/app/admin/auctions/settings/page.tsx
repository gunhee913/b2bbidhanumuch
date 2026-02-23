'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useListings } from '@/features/listings/hooks';
import { CattleListing } from '@/features/listings/types';
import {
  Play,
  Plus,
  Trash2,
  Clock,
  Timer,
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
  DragOverEvent,
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

interface SortableListingItemProps {
  listingId: string;
  listing: CattleListing | undefined;
  roundIdx: number;
  roundCount: number;
  readOnly?: boolean;
  onAssignToRound: (listingId: string, targetRoundIdx: number) => void;
  onUnassign: (listingId: string) => void;
}

function SortableListingItem({
  listingId,
  listing,
  roundIdx,
  roundCount,
  readOnly,
  onAssignToRound,
  onUnassign,
}: SortableListingItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: listingId, disabled: readOnly });

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
        <div className="flex items-center gap-1">
          {roundCount > 1 && (
            <select
              value={roundIdx}
              onChange={(e) => {
                const target = parseInt(e.target.value);
                if (target !== roundIdx) {
                  onAssignToRound(listingId, target);
                }
              }}
              className="w-16 px-1 py-0.5 text-[10px] border border-gray-300 text-gray-600 bg-white outline-none cursor-pointer"
            >
              {Array.from({ length: roundCount }, (_, idx) => (
                <option key={idx} value={idx}>{idx + 1}회차</option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => onUnassign(listingId)}
            className="p-1 text-gray-400 hover:text-red-600"
            title="배정 취소"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function AuctionSettingsPage() {
  const [auctionDate, setAuctionDate] = useState(getTomorrowDateString());
  const [auctionStartTime, setAuctionStartTime] = useState('08:30');
  const [roundDurationMin, setRoundDurationMin] = useState(5);
  const [termDurationMin, setTermDurationMin] = useState(2);
  const [perRound, setPerRound] = useState(5);
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

        const first = data[0];
        if (first.round_duration_min) setRoundDurationMin(first.round_duration_min);
        if (first.term_duration_min != null) setTermDurationMin(first.term_duration_min);
        if (first.start_time) {
          setAuctionStartTime(first.start_time.slice(0, 5));
        }

        setRounds(
          data.map((r: any) => ({
            id: r.id,
            listingIds: r.listingIds || [],
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

  // 이미 회차에 배정된 상장 ID 목록
  const assignedListingIds = useMemo(() => {
    const ids = new Set<string>();
    rounds.forEach((r) => r.listingIds.forEach((id) => ids.add(id)));
    return ids;
  }, [rounds]);

  // 미배정 상장 목록 (접수번호 오름차순 정렬)
  const unassignedListings = useMemo(() => {
    if (!listings) return [];
    return listings
      .filter((l: CattleListing) => !assignedListingIds.has(l.id))
      .sort((a: CattleListing, b: CattleListing) => {
        const suffixA = parseInt((a.listingNo || '0').split('-').pop() || '0', 10);
        const suffixB = parseInt((b.listingNo || '0').split('-').pop() || '0', 10);
        return suffixA - suffixB;
      });
  }, [listings, assignedListingIds]);

  // 자동 배정
  const handleAutoAssign = useCallback(() => {
    if (!listings || listings.length === 0) return;

    const available = listings.filter(
      (l: CattleListing) => !assignedListingIds.has(l.id)
    );

    if (available.length === 0) {
      alert('배정할 상장이 없습니다.');
      return;
    }

    const newRounds: RoundConfig[] = [];
    for (let i = 0; i < available.length; i += perRound) {
      const chunk = available.slice(i, i + perRound);
      newRounds.push({
        id: `round-${Date.now()}-${i}`,
        listingIds: chunk.map((l: CattleListing) => l.id),
      });
    }

    setRounds((prev) => [...prev, ...newRounds]);
  }, [listings, assignedListingIds, perRound]);

  // 전체 초기화 (클라이언트 상태만)
  const handleReset = useCallback(() => {
    if (rounds.length === 0) return;
    if (!confirm('모든 회차 배정을 초기화하시겠습니까?')) return;
    setRounds([]);
    setStartResult(null);
  }, [rounds]);

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
      setRoundDurationMin(5);
      setTermDurationMin(2);
      setPerRound(5);
      setAuctionStartTime('08:30');
      refetchListings();
      setTimeout(() => setStartResult(null), 5000);
    } catch {
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setIsResetting(false);
    }
  }, [auctionDate, refetchListings]);

  // 빈 회차 추가
  const handleAddRound = useCallback(() => {
    setRounds((prev) => [
      ...prev,
      { id: `round-${Date.now()}`, listingIds: [] },
    ]);
  }, []);

  // 회차 삭제
  const handleRemoveRound = useCallback((roundIdx: number) => {
    setRounds((prev) => prev.filter((_, i) => i !== roundIdx));
  }, []);

  // 상장을 특정 회차로 이동
  const handleAssignToRound = useCallback(
    (listingId: string, targetRoundIdx: number) => {
      setRounds((prev) =>
        prev.map((r, i) => {
          if (i === targetRoundIdx) {
            if (r.listingIds.includes(listingId)) return r;
            return { ...r, listingIds: [...r.listingIds, listingId] };
          }
          return { ...r, listingIds: r.listingIds.filter((id) => id !== listingId) };
        })
      );
    },
    []
  );

  // 상장을 회차에서 제거 (미배정으로)
  const handleUnassign = useCallback((listingId: string) => {
    setRounds((prev) =>
      prev.map((r) => ({
        ...r,
        listingIds: r.listingIds.filter((id) => id !== listingId),
      }))
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
          rounds: validRounds.map((r) => ({ listingIds: r.listingIds })),
          roundDurationMin,
          termDurationMin,
          auctionStartTime,
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

    if (!confirm(`${validRounds.length}개 회차로 경매를 시작하시겠습니까?\n1회차가 즉시 시작됩니다.`)) {
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
          rounds: validRounds.map((r) => ({ listingIds: r.listingIds })),
          roundDurationMin,
          termDurationMin,
          auctionStartTime,
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

  const totalAssigned = rounds.reduce((sum, r) => sum + r.listingIds.length, 0);
  const totalListings = listings?.length || 0;

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const findRoundByListingId = useCallback(
    (listingId: string): number => {
      return rounds.findIndex((r) => r.listingIds.includes(listingId));
    },
    [rounds]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeListingId = active.id as string;
      const overId = over.id as string;

      const activeRoundIdx = findRoundByListingId(activeListingId);
      let overRoundIdx = findRoundByListingId(overId);

      if (overRoundIdx === -1) {
        overRoundIdx = rounds.findIndex((r) => r.id === overId);
      }

      if (activeRoundIdx === -1 || overRoundIdx === -1 || activeRoundIdx === overRoundIdx) return;

      setRounds((prev) => {
        const updated = prev.map((r) => ({ ...r, listingIds: [...r.listingIds] }));
        updated[activeRoundIdx].listingIds = updated[activeRoundIdx].listingIds.filter(
          (id) => id !== activeListingId
        );
        const overIndex = updated[overRoundIdx].listingIds.indexOf(overId);
        if (overIndex >= 0) {
          updated[overRoundIdx].listingIds.splice(overIndex, 0, activeListingId);
        } else {
          updated[overRoundIdx].listingIds.push(activeListingId);
        }
        return updated;
      });
    },
    [findRoundByListingId, rounds]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || active.id === over.id) return;

      const activeListingId = active.id as string;
      const overId = over.id as string;
      const roundIdx = findRoundByListingId(activeListingId);

      if (roundIdx === -1) return;

      const round = rounds[roundIdx];
      const oldIndex = round.listingIds.indexOf(activeListingId);
      const newIndex = round.listingIds.indexOf(overId);

      if (oldIndex === -1 || newIndex === -1) return;

      setRounds((prev) =>
        prev.map((r, i) =>
          i === roundIdx
            ? { ...r, listingIds: arrayMove(r.listingIds, oldIndex, newIndex) }
            : r
        )
      );
    },
    [findRoundByListingId, rounds]
  );

  const activeListing = activeId ? getListingInfo(activeId) : null;

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">경매 설정</h1>
        <p className="text-sm text-gray-500 mt-1">
          승인된 상장을 회차별로 배정하고 경매를 시작합니다.
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
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-xs text-gray-600">경매 시작시간</span>
            <input
              type="time"
              value={auctionStartTime}
              onChange={(e) => setAuctionStartTime(e.target.value)}
              disabled={isReadOnly}
              className="px-2 py-1.5 border border-gray-200 text-xs outline-none bg-white disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">회당 경매시간</span>
            <input
              type="number"
              value={roundDurationMin}
              onChange={(e) => setRoundDurationMin(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
              disabled={isReadOnly}
              className="w-14 px-2 py-1.5 border border-gray-200 text-xs outline-none bg-white text-center disabled:bg-gray-100 disabled:text-gray-500"
            />
            <span className="text-xs text-gray-500">분</span>
          </div>
          <div className="flex items-center gap-2">
            <Timer className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-xs text-gray-600">회차 간 텀</span>
            <input
              type="number"
              value={termDurationMin}
              onChange={(e) => setTermDurationMin(Math.max(0, parseInt(e.target.value) || 0))}
              min={0}
              disabled={isReadOnly}
              className="w-14 px-2 py-1.5 border border-gray-200 text-xs outline-none bg-white text-center disabled:bg-gray-100 disabled:text-gray-500"
            />
            <span className="text-xs text-gray-500">분</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">회당 두수</span>
            <input
              type="number"
              value={perRound}
              onChange={(e) => setPerRound(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
              disabled={isReadOnly}
              className="w-14 px-2 py-1.5 border border-gray-200 text-xs outline-none bg-white text-center disabled:bg-gray-100 disabled:text-gray-500"
            />
            <span className="text-xs text-gray-500">두</span>
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
            배정 완료: <strong className="text-gray-900">{totalAssigned}두</strong>
          </span>
          <span>
            미배정: <strong className="text-orange-600">{totalListings - totalAssigned}두</strong>
          </span>
          <span>
            회차 수: <strong className="text-gray-900">{rounds.length}회</strong>
          </span>
        </div>
        {!isReadOnly && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutoAssign}
              disabled={unassignedListings.length === 0}
              className="px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              자동 배정
            </button>
            <button
              type="button"
              onClick={handleAddRound}
              className="px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> 회차 추가
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
          저장된 배정 데이터를 불러왔습니다. ({rounds.length}회차)
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

      <div className="flex gap-4">
        {/* 미배정 상장 목록 (좌측) */}
        <div className="w-80 flex-shrink-0">
          <div className="bg-white border border-gray-200 overflow-hidden sticky top-4">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700">
                미배정 상장 ({unassignedListings.length})
              </h3>
            </div>
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-100">
              {isLoading ? (
                <div className="p-8 text-center text-sm text-gray-400">로딩 중...</div>
              ) : unassignedListings.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400">
                  {totalListings === 0 ? '승인된 상장이 없습니다.' : '모든 상장이 배정되었습니다.'}
                </div>
              ) : (
                unassignedListings.map((listing: CattleListing) => (
                  <div
                    key={listing.id}
                    className="px-3 py-2.5 flex items-center justify-between hover:bg-gray-50 group"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-gray-900">
                          {listing.listingNo}
                        </span>
                        {statusBadge(listing.status)}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {listing.companyName} | {listing.grade} | {listing.gender}
                      </div>
                    </div>
                    {!isReadOnly && rounds.length > 0 && (
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAssignToRound(listing.id, parseInt(e.target.value));
                            e.target.value = '';
                          }
                        }}
                        className="w-16 px-1 py-1 text-[10px] border border-gray-300 text-gray-600 bg-white outline-none cursor-pointer"
                      >
                        <option value="">배정</option>
                        {rounds.map((_, idx) => (
                          <option key={idx} value={idx}>{idx + 1}회차</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 회차별 배정 (우측) */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
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
                    ? '이 날짜에 배정된 회차가 없습니다.'
                    : '회차가 없습니다. "자동 배정" 또는 "회차 추가" 버튼을 클릭하세요.'}
                </div>
                {!isReadOnly && (
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={handleAutoAssign}
                      disabled={totalListings === 0}
                      className="px-4 py-2 text-xs font-medium bg-gray-800 text-white hover:bg-gray-900 disabled:opacity-50"
                    >
                      자동 배정
                    </button>
                    <button
                      type="button"
                      onClick={handleAddRound}
                      className="px-4 py-2 text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      빈 회차 추가
                    </button>
                  </div>
                )}
              </div>
            ) : (
              rounds.map((round, roundIdx) => (
                <div key={round.id} className="bg-white border border-gray-200 overflow-hidden">
                  {/* 회차 헤더 */}
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-900">
                        {roundIdx + 1}회차
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
                        {round.listingIds.length}두 배정
                      </span>
                      {round.startTime && round.endTime ? (
                        <span className="text-xs text-gray-400">
                          {round.startTime} ~ {round.endTime}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">
                          ({roundDurationMin}분)
                        </span>
                      )}
                    </div>
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRound(roundIdx)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* 배정된 상장 목록 */}
                  <SortableContext
                    items={round.listingIds}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="divide-y divide-gray-100 min-h-[48px]">
                      {round.listingIds.length === 0 ? (
                        <div className="px-4 py-6 text-center text-xs text-gray-400">
                          상장이 배정되지 않았습니다. 좌측에서 회차 버튼을 클릭하여 배정하세요.
                        </div>
                      ) : (
                        round.listingIds.map((listingId) => (
                          <SortableListingItem
                            key={listingId}
                            listingId={listingId}
                            listing={getListingInfo(listingId)}
                            roundIdx={roundIdx}
                            roundCount={rounds.length}
                            readOnly={isReadOnly}
                            onAssignToRound={handleAssignToRound}
                            onUnassign={handleUnassign}
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
        </DndContext>
      </div>
    </AdminLayout>
  );
}
