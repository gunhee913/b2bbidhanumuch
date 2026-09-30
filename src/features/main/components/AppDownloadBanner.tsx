"use client";

import { GooglePlayIcon, AppleIcon } from "@/features/main/lib/storeIcons";

/**
 * 메인 페이지 하단 앱 다운로드 유도 배너.
 * 회색 배경 카드 + 카피/스토어 버튼 구성.
 */
export function AppDownloadBanner() {
  return (
    <section className="bg-surface pb-16">
      <div className="mx-auto max-w-[1360px] min-[1700px]:max-w-[1600px] px-8">
        <div className="flex min-h-[224px] items-center rounded-2xl bg-surface-accent px-10 py-10">
          <div className="flex w-full flex-col items-center justify-between gap-6 md:flex-row md:gap-10">
            <h3 className="text-xl font-bold text-content md:text-2xl">
              더 빠르고 편한 부분육 온라인경매 앱을 이용해보세요!
            </h3>

            <div className="flex flex-wrap gap-2">
              <StoreButton
                label="Google Play"
                href="#"
                icon={<GooglePlayIcon className="h-4 w-4" />}
              />
              <StoreButton
                label="App Store"
                href="#"
                icon={<AppleIcon className="h-4 w-4" />}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

interface StoreButtonProps {
  label: string;
  href: string;
  icon: React.ReactNode;
}

function StoreButton({ label, href, icon }: StoreButtonProps) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded-lg bg-inverse px-5 py-2.5 text-sm font-semibold text-inverse-content transition-colors hover:bg-inverse"
    >
      {icon}
      {label}
    </a>
  );
}
