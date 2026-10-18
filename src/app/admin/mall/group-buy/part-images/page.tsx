'use client';

import MallAdminLayout from '@/components/admin/MallAdminLayout';
import { PART_IMAGE_MAX_FILE_MB, PartGroupImageGrid, usePartGroupImageSets } from '@/features/part-group-images/components/PartGroupImageGrid';

/**
 * 부위 이미지 설정(직거래몰) · 1kg 구매 시세표·상세, 공동구매 카드의 부위 사진.
 * 부위 사진을 따로 올리지 않은 상품과 kg 수요 풀은 이 「전체 기본」 사진을 쓴다.
 */
export default function MallPartImagesPage() {
  const { groups, registeredCount } = usePartGroupImageSets(null);

  return (
    <MallAdminLayout>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">부위 이미지</h1>
            <p className="mt-1 text-xs text-gray-500">
              1kg 구매 목록·상세와 공동구매 카드에 보이는 부위 대표 사진입니다. 상장 때 부위 사진을 따로 올린 상품은 그 사진이 우선합니다.
              권장 비율 4:3 · {PART_IMAGE_MAX_FILE_MB}MB 이하.
            </p>
          </div>
          <span className="text-xs tabular-nums text-gray-500">
            등록 <span className="font-semibold text-gray-900">{registeredCount}</span> / {groups.length}
          </span>
        </div>

        <PartGroupImageGrid companyId={null} scope="admin" />
      </div>
    </MallAdminLayout>
  );
}
