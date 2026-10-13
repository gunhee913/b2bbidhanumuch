"use client";

import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useCompanies } from "@/features/companies/hooks";
import {
  PART_IMAGE_MAX_FILE_MB,
  PartGroupImageGrid,
  usePartGroupImageSets,
} from "@/features/part-group-images/components/PartGroupImageGrid";

/** <select> 의 「전체 기본」 값 · 업체 id 는 UUID 라 겹치지 않는다 */
const DEFAULT_SCOPE = "";

/**
 * 부위 대표이미지 설정(관리자) · 전체 기본 한 벌 + 업체별 한 벌.
 *
 * 부위 사진(상장등록 때 부위마다 올리는 것)이 없는 줄에 대신 거는 사진이다. 화면은
 * 업체 것 → 전체 기본 → 없음 순으로 찾는다. 업체를 고르면 그 업체 전용 사진을 다루고,
 * 업체 전용이 없는 부위는 전체 기본을 흐리게 보여 「지금 이게 나간다」 를 알린다.
 * 업체도 제 것은 직접 고칠 수 있다(`/company/settings/part-images`).
 */
export default function PartImagesPage() {
  const { data: companies } = useCompanies();
  const [scope, setScope] = useState<string>(DEFAULT_SCOPE);
  const companyId = scope === DEFAULT_SCOPE ? null : scope;
  const { groups, registeredCount } = usePartGroupImageSets(companyId);
  const scopeLabel = companyId
    ? (companies?.find((c) => c.id === companyId)?.name ?? "업체")
    : "전체 기본";

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              부위 대표이미지 설정
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              부위 사진을 따로 올리지 않은 부위에 대신 보여 주는 사진입니다.
              업체 것이 없으면 전체 기본이, 그것도 없으면 빈 이미지가 나갑니다.
              권장 비율 4:3 · {PART_IMAGE_MAX_FILE_MB}MB 이하.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <span className="font-medium">대상</span>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="min-w-[160px] border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none"
              >
                <option value={DEFAULT_SCOPE}>전체 기본</option>
                {(companies ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <span className="text-xs tabular-nums text-gray-500">
              {scopeLabel} 등록{" "}
              <span className="font-semibold text-gray-900">
                {registeredCount}
              </span>{" "}
              / {groups.length}
            </span>
          </div>
        </div>

        <PartGroupImageGrid companyId={companyId} scope="admin" />
      </div>
    </AdminLayout>
  );
}
