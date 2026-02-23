'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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

interface RoundConfig {
  id: string;
  listingIds: string[];
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

const STORAGE_KEY_PREFIX = 'auction-settings-';

interface SavedSettings {
  auctionStartTime: string;
  roundDurationMin: number;
  termDurationMin: number;
  perRound: number;
  rounds: RoundConfig[];
  savedAt: string;
}

const saveSettings = (date: string, data: Omit<SavedSettings, 'savedAt'>) => {
  try {
    const payload: SavedSettings = { ...data, savedAt: new Date().toISOString() };
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${date}`, JSON.stringify(payload));
  } catch {}
};

const loadSettings = (date: string): SavedSettings | null => {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${date}`);
    if (!raw) return null;
    return JSON.parse(raw) as SavedSettings;
  } catch {
    return null;
  }
};

const clearSettings = (date: string) => {
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${date}`);
  } catch {}
};

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
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'restored'>('idle');

  const isInitialLoad = useRef(true);

  // 페이지 진입 시 / 경매일 변경 시 저장된 설정 복원
  useEffect(() => {
    const saved = loadSettings(auctionDate);
    if (saved) {
      setAuctionStartTime(saved.auctionStartTime || '08:30');
      setRoundDurationMin(saved.roundDurationMin);
      setTermDurationMin(saved.termDurationMin);
      setPerRound(saved.perRound);
      setRounds(saved.rounds);
      setSaveStatus('restored');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } else {
      if (!isInitialLoad.current) {
        setRounds([]);
      }
      setSaveStatus('idle');
    }
    isInitialLoad.current = false;
  }, [auctionDate]);

  // 설정 변경 시 자동 저장
  useEffect(() => {
    if (isInitialLoad.current) return;
    if (rounds.length === 0 && roundDurationMin === 5 && termDurationMin === 2 && perRound === 5) return;

    saveSettings(auctionDate, { auctionStartTime, roundDurationMin, termDurationMin, perRound, rounds });
    setSaveStatus('saved');
    const timer = setTimeout(() => setSaveStatus('idle'), 2000);
    return () => clearTimeout(timer);
  }, [rounds, auctionStartTime, roundDurationMin, termDurationMin, perRound, auctionDate]);

  // 승인된 상장 목록 조회
  const { data: listings, isLoading } = useListings({
    status: 'approved',
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

  // 전체 초기화
  const handleReset = useCallback(() => {
    if (rounds.length === 0) return;
    if (!confirm('모든 회차 배정을 초기화하시겠습니까?')) return;
    setRounds([]);
    setStartResult(null);
    clearSettings(auctionDate);
    setSaveStatus('idle');
  }, [rounds, auctionDate]);

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
      clearSettings(auctionDate);
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
              onChange={(e) => {
                setAuctionDate(e.target.value);
                setRounds([]);
              }}
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
              className="px-2 py-1.5 border border-gray-200 text-xs outline-none bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">회당 경매시간</span>
            <input
              type="number"
              value={roundDurationMin}
              onChange={(e) => setRoundDurationMin(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
              className="w-14 px-2 py-1.5 border border-gray-200 text-xs outline-none bg-white text-center"
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
              className="w-14 px-2 py-1.5 border border-gray-200 text-xs outline-none bg-white text-center"
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
              className="w-14 px-2 py-1.5 border border-gray-200 text-xs outline-none bg-white text-center"
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
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-green-600">
              <Save className="w-3 h-3" /> 자동 저장됨
            </span>
          )}
          {saveStatus === 'restored' && (
            <span className="flex items-center gap-1 text-blue-600">
              <Save className="w-3 h-3" /> 저장된 설정 불러옴
            </span>
          )}
        </div>
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
      </div>

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
                      <div className="text-xs font-medium text-gray-900">
                        {listing.listingNo}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {listing.companyName} | {listing.grade} | {listing.gender}
                      </div>
                    </div>
                    {rounds.length > 0 && (
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
        <div className="flex-1 space-y-4">
          {rounds.length === 0 ? (
            <div className="bg-white border border-gray-200 p-12 text-center">
              <div className="text-sm text-gray-500 mb-4">
                회차가 없습니다. &quot;자동 배정&quot; 또는 &quot;회차 추가&quot; 버튼을 클릭하세요.
              </div>
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
                    <span className="text-xs text-gray-500">
                      {round.listingIds.length}두 배정
                    </span>
                    <span className="text-xs text-gray-400">
                      ({roundDurationMin}분)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveRound(roundIdx)}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 배정된 상장 목록 */}
                <div className="divide-y divide-gray-100">
                  {round.listingIds.length === 0 ? (
                    <div className="px-4 py-6 text-center text-xs text-gray-400">
                      상장이 배정되지 않았습니다. 좌측에서 회차 버튼을 클릭하여 배정하세요.
                    </div>
                  ) : (
                    round.listingIds.map((listingId) => {
                      const listing = getListingInfo(listingId);
                      return (
                        <div
                          key={listingId}
                          className="px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 group"
                        >
                          <div className="flex items-center gap-2">
                            <GripVertical className="w-3 h-3 text-gray-300" />
                            <div>
                              <span className="text-xs font-medium text-gray-900">
                                {listing?.listingNo || listingId.slice(0, 8)}
                              </span>
                              <span className="text-[10px] text-gray-500 ml-2">
                                {listing?.companyName} | {listing?.grade} | {listing?.gender}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {rounds.length > 1 && (
                              <select
                                value={roundIdx}
                                onChange={(e) => {
                                  const target = parseInt(e.target.value);
                                  if (target !== roundIdx) {
                                    handleAssignToRound(listingId, target);
                                  }
                                }}
                                className="w-16 px-1 py-0.5 text-[10px] border border-gray-300 text-gray-600 bg-white outline-none cursor-pointer"
                              >
                                {rounds.map((_, idx) => (
                                  <option key={idx} value={idx}>{idx + 1}회차</option>
                                ))}
                              </select>
                            )}
                            <button
                              type="button"
                              onClick={() => handleUnassign(listingId)}
                              className="p-1 text-gray-400 hover:text-red-600"
                              title="배정 취소"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
