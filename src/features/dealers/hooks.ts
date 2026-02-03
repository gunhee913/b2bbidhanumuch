'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDealers,
  getDealerById,
  createDealer,
  updateDealer,
  deleteDealer,
  updateDealerStatus,
  createDealerEmployee,
  updateDealerEmployee,
  deleteDealerEmployee,
  updateDealerEmployeeStatus,
} from './api';
import {
  DealerWithEmployees,
  CreateDealerInput,
  UpdateDealerInput,
  CreateDealerEmployeeInput,
  UpdateDealerEmployeeInput,
} from './types';

// Query Keys
export const dealerKeys = {
  all: ['dealers'] as const,
  lists: () => [...dealerKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...dealerKeys.lists(), filters] as const,
  details: () => [...dealerKeys.all, 'detail'] as const,
  detail: (id: string) => [...dealerKeys.details(), id] as const,
};

// ============================================
// 중도매인 Hooks
// ============================================

/**
 * 모든 중도매인 조회
 */
export function useDealers() {
  return useQuery({
    queryKey: dealerKeys.lists(),
    queryFn: getDealers,
  });
}

/**
 * 중도매인 상세 조회
 */
export function useDealer(id: string) {
  return useQuery({
    queryKey: dealerKeys.detail(id),
    queryFn: () => getDealerById(id),
    enabled: !!id,
  });
}

/**
 * 중도매인 생성
 */
export function useCreateDealer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDealerInput) => createDealer(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealerKeys.lists() });
    },
  });
}

/**
 * 중도매인 수정
 */
export function useUpdateDealer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateDealerInput }) =>
      updateDealer(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: dealerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dealerKeys.detail(variables.id) });
    },
  });
}

/**
 * 중도매인 삭제
 */
export function useDeleteDealer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteDealer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealerKeys.lists() });
    },
  });
}

/**
 * 중도매인 상태 변경
 */
export function useUpdateDealerStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' }) =>
      updateDealerStatus(id, status),
    onMutate: async ({ id, status }) => {
      // Optimistic Update
      await queryClient.cancelQueries({ queryKey: dealerKeys.lists() });

      const previousDealers = queryClient.getQueryData<DealerWithEmployees[]>(dealerKeys.lists());

      if (previousDealers) {
        queryClient.setQueryData<DealerWithEmployees[]>(
          dealerKeys.lists(),
          previousDealers.map((dealer) =>
            dealer.id === id ? { ...dealer, status } : dealer
          )
        );
      }

      return { previousDealers };
    },
    onError: (_, __, context) => {
      if (context?.previousDealers) {
        queryClient.setQueryData(dealerKeys.lists(), context.previousDealers);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: dealerKeys.lists() });
    },
  });
}

// ============================================
// 직원/경매대리인 Hooks
// ============================================

/**
 * 직원 생성
 */
export function useCreateDealerEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDealerEmployeeInput) => createDealerEmployee(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: dealerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dealerKeys.detail(variables.dealerId) });
    },
  });
}

/**
 * 직원 수정
 */
export function useUpdateDealerEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateDealerEmployeeInput }) =>
      updateDealerEmployee(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealerKeys.lists() });
    },
  });
}

/**
 * 직원 삭제
 */
export function useDeleteDealerEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteDealerEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealerKeys.lists() });
    },
  });
}

/**
 * 직원 상태 변경
 */
export function useUpdateDealerEmployeeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' }) =>
      updateDealerEmployeeStatus(id, status),
    onMutate: async ({ id, status }) => {
      // Optimistic Update
      await queryClient.cancelQueries({ queryKey: dealerKeys.lists() });

      const previousDealers = queryClient.getQueryData<DealerWithEmployees[]>(dealerKeys.lists());

      if (previousDealers) {
        queryClient.setQueryData<DealerWithEmployees[]>(
          dealerKeys.lists(),
          previousDealers.map((dealer) => ({
            ...dealer,
            employees: dealer.employees.map((emp) =>
              emp.id === id ? { ...emp, status } : emp
            ),
          }))
        );
      }

      return { previousDealers };
    },
    onError: (_, __, context) => {
      if (context?.previousDealers) {
        queryClient.setQueryData(dealerKeys.lists(), context.previousDealers);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: dealerKeys.lists() });
    },
  });
}
