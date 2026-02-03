'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  updateAdminStatus,
} from './api';
import { Admin, CreateAdminInput, UpdateAdminInput } from './types';

// Query Keys
export const adminKeys = {
  all: ['admins'] as const,
  lists: () => [...adminKeys.all, 'list'] as const,
};

// 관리자 목록 조회
export function useAdmins() {
  return useQuery({
    queryKey: adminKeys.lists(),
    queryFn: getAdmins,
  });
}

// 관리자 생성
export function useCreateAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAdminInput) => createAdmin(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.lists() });
    },
  });
}

// 관리자 수정
export function useUpdateAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAdminInput }) =>
      updateAdmin(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.lists() });
    },
  });
}

// 관리자 삭제
export function useDeleteAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteAdmin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.lists() });
    },
  });
}

// 관리자 상태 변경 (Optimistic Update)
export function useUpdateAdminStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' }) =>
      updateAdminStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: adminKeys.lists() });

      const previousAdmins = queryClient.getQueryData<Admin[]>(adminKeys.lists());

      queryClient.setQueryData<Admin[]>(adminKeys.lists(), (old) =>
        old?.map((admin) =>
          admin.id === id ? { ...admin, status } : admin
        )
      );

      return { previousAdmins };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousAdmins) {
        queryClient.setQueryData(adminKeys.lists(), context.previousAdmins);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.lists() });
    },
  });
}
