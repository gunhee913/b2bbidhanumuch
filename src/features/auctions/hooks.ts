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
  fetchBids,
  createBid,
} from './api';
import {
  Auction,
  Bid,
  CreateAuctionInput,
  UpdateAuctionInput,
  CreateBidInput,
  AuctionFilter,
} from './types';

// Query Keys
export const auctionKeys = {
  all: ['auctions'] as const,
  lists: () => [...auctionKeys.all, 'list'] as const,
  list: (filter?: AuctionFilter) => [...auctionKeys.lists(), filter] as const,
  details: () => [...auctionKeys.all, 'detail'] as const,
  detail: (id: string) => [...auctionKeys.details(), id] as const,
  bids: (auctionId: string) => [...auctionKeys.all, 'bids', auctionId] as const,
};

// 경매 목록 조회 훅
export function useAuctions(filter?: AuctionFilter) {
  return useQuery({
    queryKey: auctionKeys.list(filter),
    queryFn: () => fetchAuctions(filter),
  });
}

// 경매 상세 조회 훅
export function useAuction(id: string) {
  return useQuery({
    queryKey: auctionKeys.detail(id),
    queryFn: () => fetchAuction(id),
    enabled: !!id,
  });
}

// 경매 생성 훅
export function useCreateAuction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAuctionInput) => createAuction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: auctionKeys.lists() });
    },
  });
}

// 경매 수정 훅
export function useUpdateAuction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAuctionInput }) =>
      updateAuction(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: auctionKeys.lists() });
      queryClient.setQueryData(auctionKeys.detail(data.id), (old: unknown) =>
        old ? { ...old, ...data } : data
      );
    },
  });
}

// 경매 삭제 훅
export function useDeleteAuction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteAuction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: auctionKeys.lists() });
    },
  });
}

// 경매 시작 훅
export function useOpenAuction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => openAuction(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: auctionKeys.lists() });
      queryClient.setQueryData(auctionKeys.detail(data.id), (old: unknown) =>
        old ? { ...old, ...data } : data
      );
    },
  });
}

// 경매 마감 훅
export function useCloseAuction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => closeAuction(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: auctionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: auctionKeys.detail(data.id) });
    },
  });
}

// 입찰 목록 조회 훅
export function useBids(auctionId: string, options?: { partId?: string; dealerId?: string }) {
  return useQuery({
    queryKey: [...auctionKeys.bids(auctionId), options],
    queryFn: () => fetchBids(auctionId, options),
    enabled: !!auctionId,
  });
}

// 입찰 등록 훅
export function useCreateBid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateBidInput) => createBid(input),
    onSuccess: (data, variables) => {
      // 입찰 목록 갱신
      queryClient.invalidateQueries({ queryKey: auctionKeys.bids(variables.auctionId) });
      // 경매 상세 갱신
      queryClient.invalidateQueries({ queryKey: auctionKeys.detail(variables.auctionId) });
    },
  });
}

// 진행 중인 경매 조회 (편의 훅)
export function useOpenAuctions() {
  return useAuctions({ status: 'open' });
}

// 예정된 경매 조회 (편의 훅)
export function useScheduledAuctions() {
  return useAuctions({ status: 'scheduled' });
}
