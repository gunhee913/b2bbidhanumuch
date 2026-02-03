'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  updateCompanyStatus,
  createCompanyEmployee,
  updateCompanyEmployee,
  deleteCompanyEmployee,
  updateCompanyEmployeeStatus,
} from './api';
import {
  CompanyWithEmployees,
  CreateCompanyInput,
  UpdateCompanyInput,
  CreateCompanyEmployeeInput,
  UpdateCompanyEmployeeInput,
} from './types';

// Query Keys
export const companyKeys = {
  all: ['companies'] as const,
  lists: () => [...companyKeys.all, 'list'] as const,
};

// ============ 상장업체 Hooks ============

// 상장업체 목록 조회 (직원 포함)
export function useCompanies() {
  return useQuery({
    queryKey: companyKeys.lists(),
    queryFn: getCompanies,
  });
}

// 상장업체 생성
export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCompanyInput) => createCompany(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
    },
  });
}

// 상장업체 수정
export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCompanyInput }) =>
      updateCompany(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
    },
  });
}

// 상장업체 삭제
export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCompany(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
    },
  });
}

// 상장업체 상태 변경 (Optimistic Update)
export function useUpdateCompanyStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' }) =>
      updateCompanyStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: companyKeys.lists() });

      const previousCompanies = queryClient.getQueryData<CompanyWithEmployees[]>(companyKeys.lists());

      queryClient.setQueryData<CompanyWithEmployees[]>(companyKeys.lists(), (old) =>
        old?.map((company) =>
          company.id === id ? { ...company, status } : company
        )
      );

      return { previousCompanies };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousCompanies) {
        queryClient.setQueryData(companyKeys.lists(), context.previousCompanies);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
    },
  });
}

// ============ 직원 Hooks ============

// 직원 생성
export function useCreateCompanyEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCompanyEmployeeInput) => createCompanyEmployee(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
    },
  });
}

// 직원 수정
export function useUpdateCompanyEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCompanyEmployeeInput }) =>
      updateCompanyEmployee(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
    },
  });
}

// 직원 삭제
export function useDeleteCompanyEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCompanyEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
    },
  });
}

// 직원 상태 변경 (Optimistic Update)
export function useUpdateCompanyEmployeeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' }) =>
      updateCompanyEmployeeStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: companyKeys.lists() });

      const previousCompanies = queryClient.getQueryData<CompanyWithEmployees[]>(companyKeys.lists());

      queryClient.setQueryData<CompanyWithEmployees[]>(companyKeys.lists(), (old) =>
        old?.map((company) => ({
          ...company,
          employees: company.employees.map((emp) =>
            emp.id === id ? { ...emp, status } : emp
          ),
        }))
      );

      return { previousCompanies };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousCompanies) {
        queryClient.setQueryData(companyKeys.lists(), context.previousCompanies);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
    },
  });
}
