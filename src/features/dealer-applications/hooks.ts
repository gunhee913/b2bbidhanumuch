"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  fetchAdminDealerApplication,
  fetchAdminDealerApplications,
  patchAdminDealerApplication,
  submitDealerApplication,
  type AdminListParams,
} from "./api";
import type { HandleStatus } from "./types";

const LIST_KEY = ["admin", "dealer-applications", "list"] as const;
const DETAIL_KEY = ["admin", "dealer-applications", "detail"] as const;

export function useSubmitDealerApplication() {
  return useMutation({
    mutationFn: submitDealerApplication,
  });
}

export function useAdminDealerApplications(params: AdminListParams = {}) {
  return useQuery({
    queryKey: [...LIST_KEY, params],
    queryFn: () => fetchAdminDealerApplications(params),
    staleTime: 30_000,
  });
}

export function useAdminDealerApplication(id: string | null) {
  return useQuery({
    queryKey: [...DETAIL_KEY, id],
    queryFn: () => fetchAdminDealerApplication(id!),
    enabled: !!id,
  });
}

export function usePatchAdminDealerApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: {
        handleStatus?: HandleStatus;
        adminNote?: string | null;
        handledBy?: string | null;
      };
    }) => patchAdminDealerApplication(id, patch),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: LIST_KEY });
      qc.setQueryData([...DETAIL_KEY, data.id], data);
    },
  });
}
