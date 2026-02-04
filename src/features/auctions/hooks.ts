'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAuctions,
  fetchAuction,
  createAuction,
  updateAuction,
  deleteAuction,
  openAuction,
  closeAuction,
  fetchAuctionListings,
  addAuctionListings,
  removeAuctionListing,
  fetchBids,
  createBid,
  fetchLiveBids,
  fetchTodayOpenAuction,
} from './api';
import type {
  AuctionFilter,
  BidFilter,
  CreateAuctionInput,
  CreateBidInput,
  UpdateAuctionInput,
} from './types';

// =============================================
// 경매 Hooks
// =============================================

// 경매 목록 조회
export function useAuctions(filter?: AuctionFilter) {
  return useQuery({
    queryKey: ['auctions', filter],
    queryFn: () => fetchAuctions(filter),
  });
}

// 경매 상세 조회
export function useAuction(id: string | null) {
  return useQuery({
    queryKey: ['auction', id],
    queryFn: () => fetchAuction(id!),
    enabled: !!id,
  });
}

// 오늘 진행중인 경매 조회
export function useTodayOpenAuction() {
  return useQuery({
    queryKey: ['todayOpenAuction'],
    queryFn: fetchTodayOpenAuction,
    refetchInterval: 30000, // 30초마다 재조회
  });
}

// 경매 생성
export function useCreateAuction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAuctionInput) => createAuction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
    },
  });
}

// 경매 수정
export function useUpdateAuction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAuctionInput }) =>
      updateAuction(id, input),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      queryClient.invalidateQueries({ queryKey: ['auction', id] });
    },
  });
}

// 경매 삭제
export function useDeleteAuction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAuction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
    },
  });
}

// 경매 시작
export function useOpenAuction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => openAuction(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      queryClient.invalidateQueries({ queryKey: ['auction', id] });
      queryClient.invalidateQueries({ queryKey: ['todayOpenAuction'] });
    },
  });
}

// 경매 마감
export function useCloseAuction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => closeAuction(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      queryClient.invalidateQueries({ queryKey: ['auction', id] });
      queryClient.invalidateQueries({ queryKey: ['todayOpenAuction'] });
      queryClient.invalidateQueries({ queryKey: ['liveBids'] });
    },
  });
}

// =============================================
// 경매-상장 Hooks
// =============================================

// 경매에 포함된 상장 조회
export function useAuctionListings(auctionId: string | null) {
  return useQuery({
    queryKey: ['auctionListings', auctionId],
    queryFn: () => fetchAuctionListings(auctionId!),
    enabled: !!auctionId,
  });
}

// 경매에 상장 추가
export function useAddAuctionListings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ auctionId, listingIds }: { auctionId: string; listingIds: string[] }) =>
      addAuctionListings(auctionId, listingIds),
    onSuccess: (_, { auctionId }) => {
      queryClient.invalidateQueries({ queryKey: ['auctionListings', auctionId] });
      queryClient.invalidateQueries({ queryKey: ['auction', auctionId] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}

// 경매에서 상장 제거
export function useRemoveAuctionListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ auctionId, listingId }: { auctionId: string; listingId: string }) =>
      removeAuctionListing(auctionId, listingId),
    onSuccess: (_, { auctionId }) => {
      queryClient.invalidateQueries({ queryKey: ['auctionListings', auctionId] });
      queryClient.invalidateQueries({ queryKey: ['auction', auctionId] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}

// =============================================
// 입찰 Hooks
// =============================================

// 입찰 목록 조회
export function useBids(filter?: BidFilter) {
  return useQuery({
    queryKey: ['bids', filter],
    queryFn: () => fetchBids(filter),
    enabled: !!(filter?.auctionId || filter?.dealerId),
  });
}

// 입찰 등록
export function useCreateBid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBidInput) => createBid(input),
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ['bids'] });
      queryClient.invalidateQueries({ queryKey: ['liveBids', input.auctionId] });
    },
  });
}

// 실시간 입찰 현황 조회
export function useLiveBids(auctionId: string | null, options?: { refetchInterval?: number | false }) {
  return useQuery({
    queryKey: ['liveBids', auctionId],
    queryFn: () => fetchLiveBids(auctionId!),
    enabled: !!auctionId,
    refetchInterval: options?.refetchInterval ?? 5000, // 기본 5초마다 갱신
  });
}
