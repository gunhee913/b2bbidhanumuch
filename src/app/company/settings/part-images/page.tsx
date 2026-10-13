"use client";

import { useSession } from "next-auth/react";
import CompanyLayout from "@/components/company/CompanyLayout";
import {
  PartGroupImageGrid,
  usePartGroupImageSets,
} from "@/features/part-group-images/components/PartGroupImageGrid";

/**
 * 부위 대표이미지 설정(업체) · 제 업체 한 벌만.
 *
 * 상장등록 때 부위 사진을 안 올린 부위는 여기 등록한 사진이 대신 나간다. 등록하지
 * 않은 부위는 경매장이 정한 전체 기본이 흐리게 보인다 — 「지금 이게 나간다」 는 뜻.
 * 저장은 세션의 업체로만 들어가므로 다른 업체 것은 보이지도 고쳐지지도 않는다.
 */
export default function CompanyPartImagesPage() {
  const { data: session, status } = useSession();
  const companyId = session?.company?.id ?? null;
  const { groups, registeredCount } = usePartGroupImageSets(companyId);

  return (
    <CompanyLayout>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              부위 대표이미지 설정
            </h1>
          </div>
          {companyId ? (
            <span className="text-xs tabular-nums text-gray-500">
              {session?.company?.name ?? "우리 업체"} 등록{" "}
              <span className="font-semibold text-gray-900">
                {registeredCount}
              </span>{" "}
              / {groups.length}
            </span>
          ) : null}
        </div>

        {status === "loading" ? (
          <div className="rounded border border-gray-200 bg-white px-4 py-12 text-center text-xs text-gray-400">
            불러오는 중...
          </div>
        ) : companyId ? (
          <PartGroupImageGrid companyId={companyId} scope="company" />
        ) : (
          <div className="rounded border border-gray-200 bg-white px-4 py-12 text-center text-xs text-gray-400">
            업체 계정으로 로그인해야 설정할 수 있습니다.
          </div>
        )}
      </div>
    </CompanyLayout>
  );
}
