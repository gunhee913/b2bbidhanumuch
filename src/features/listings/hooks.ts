'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchListings,
  fetchListing,
  fetchListingByNo,
  createListing,
  updateListing,
  deleteListing,
  approveListing,
  updatePart,
  fetchLiveListings,
  LiveListingsFilter,
} from './api';
import {
  CattleListing,
  CreateListingInput,
  UpdateListingInput,
  UpdatePartInput,
  ListingFilter,
} from './types';

// Query Keys
export const listingKeys = {
  all: ['listings'] as const,
  lists: () => [...listingKeys.all, 'list'] as const,
  list: (filter?: ListingFilter & { includeParts?: boolean }) =>
    [...listingKeys.lists(), filter] as const,
  details: () => [...listingKeys.all, 'detail'] as const,
  detail: (id: string) => [...listingKeys.details(), id] as const,
  byNo: (listingNo: string) => [...listingKeys.all, 'byNo', listingNo] as const,
};

// 상장 목록 조회 훅
export function useListings(filter?: ListingFilter & { includeParts?: boolean }, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: listingKeys.list(filter),
    queryFn: () => fetchListings(filter),
    enabled: options?.enabled !== false,
  });
}

// 상장 상세 조회 훅
export function useListing(id: string) {
  return useQuery({
    queryKey: listingKeys.detail(id),
    queryFn: () => fetchListing(id),
    enabled: !!id,
  });
}

// 상장 등록 훅
export function useCreateListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateListingInput) => createListing(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listingKeys.lists() });
    },
  });
}

// 상장 수정 훅
export function useUpdateListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateListingInput }) =>
      updateListing(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: listingKeys.lists() });
      queryClient.setQueryData(listingKeys.detail(data.id), data);
    },
  });
}

// 상장 삭제 훅
export function useDeleteListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteListing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listingKeys.lists() });
    },
  });
}

// 상장 승인 훅
export function useApproveListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, approvedBy }: { id: string; approvedBy?: string }) =>
      approveListing(id, approvedBy),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: listingKeys.lists() });
      queryClient.setQueryData(listingKeys.detail(data.id), data);
    },
  });
}

// 부위 수정 훅
export function useUpdatePart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      listingId,
      partId,
      input,
    }: {
      listingId: string;
      partId: string;
      input: UpdatePartInput;
    }) => updatePart(listingId, partId, input),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: listingKeys.lists() });
      queryClient.setQueryData<CattleListing>(
        listingKeys.detail(variables.listingId),
        (old) => {
          if (!old || !old.parts) return old;
          return {
            ...old,
            parts: old.parts.map((part) =>
              part.id === variables.partId ? { ...part, ...data } : part
            ),
          };
        }
      );
    },
  });
}

// 상장 상태별 조회 (편의 훅)
export function usePendingListings(companyId?: string) {
  return useListings({ status: 'pending', companyId, includeParts: true });
}

export function useApprovedListings(companyId?: string) {
  return useListings({ status: 'approved', companyId, includeParts: true });
}

export function useCompanyListings(companyId: string, includeParts = false) {
  return useListings({ companyId, includeParts });
}

// 상장번호로 상장 조회 훅
export function useListingByNo(listingNo: string | null) {
  return useQuery({
    queryKey: listingKeys.byNo(listingNo || ''),
    queryFn: () => fetchListingByNo(listingNo!),
    enabled: !!listingNo,
  });
}

// 실시간 상장 현황 조회 훅 (입찰 정보 포함)
export function useLiveListings(
  filter?: LiveListingsFilter,
  options?: { refetchInterval?: number | false }
) {
  return useQuery({
    queryKey: [...listingKeys.all, 'live', filter] as const,
    queryFn: () => fetchLiveListings(filter),
    refetchInterval: options?.refetchInterval,
  });
}
