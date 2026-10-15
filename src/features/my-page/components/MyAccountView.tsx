"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { useBidStore } from "@/stores/bidStore";
import { useCurrentHouse } from "@/features/entry/hooks/useCurrentHouse";
import { useMyDealer } from "../hooks/useMyPageData";
import { InfoRow, MyPanel, SettingRow, ToggleSwitch } from "./MyPageParts";

/** `useAuctionAuth` 가 읽는 열쇠 · 켜져 있으면 응찰 전에 경매 비밀번호를 한 번 묻는다 */
const AUCTION_PASSWORD_KEY = "auctionPasswordEnabled";

const formatDate = (iso: string | null | undefined) =>
  iso ? format(parseISO(iso), "yyyy.M.d") : null;

/**
 * 계정 · 보안.
 *
 * 비밀번호는 여기서 못 바꾼다 — 중도매인 계정은 공판장 사무실이 만들고 관리한다
 * (모바일 `/profile/account` 도 같다). 바꿀 수 있는 것은 이 브라우저에만 남는 두 가지,
 * 경매 비밀번호 확인과 어두운 화면이다. 로그아웃은 머리 계정 메뉴에 있다.
 */
export function MyAccountView() {
  const { dealer, employee, user } = useMyDealer();
  const { dealerHouse } = useCurrentHouse();
  const isDarkMode = useBidStore((s) => s.isDarkMode);
  const setIsDarkMode = useBidStore((s) => s.setIsDarkMode);
  const [auctionPasswordOn, setAuctionPasswordOn] = useState(false);

  useEffect(() => {
    setAuctionPasswordOn(
      window.localStorage.getItem(AUCTION_PASSWORD_KEY) === "true",
    );
  }, []);

  const toggleAuctionPassword = (next: boolean) => {
    setAuctionPasswordOn(next);
    window.localStorage.setItem(AUCTION_PASSWORD_KEY, String(next));
  };

  return (
    <>
      <MyPanel title="중도매인 정보" bodyClassName="py-1">
        <dl className="divide-y divide-line-soft">
          <InfoRow label="거래인번호" value={dealer?.dealerNo} numeric />
          <InfoRow label="상호" value={dealer?.name} />
          <InfoRow label="대표자" value={dealer?.representativeName} />
          <InfoRow label="사업자등록번호" value={dealer?.businessNo} numeric />
          <InfoRow label="소속 공판장" value={dealerHouse?.fullName} />
          <InfoRow label="연락처" value={dealer?.phone} numeric />
          <InfoRow label="주소" value={dealer?.address} />
          <InfoRow
            label="가입일"
            value={formatDate(dealer?.createdAt)}
            numeric
          />
        </dl>
      </MyPanel>

      {employee ? (
        <MyPanel title="직원 정보" bodyClassName="py-1">
          <dl className="divide-y divide-line-soft">
            <InfoRow label="성함" value={employee.name} />
            <InfoRow label="직급" value={employee.position} />
            <InfoRow label="연락처" value={employee.phone} numeric />
            <InfoRow
              label="마지막 로그인"
              value={formatDate(employee.lastLoginAt)}
              numeric
            />
          </dl>
        </MyPanel>
      ) : null}

      <MyPanel
        title="로그인 · 보안"
        description="비밀번호는 공판장 사무실에서 바꿔 드립니다"
        bodyClassName="divide-y divide-line-soft"
      >
        <SettingRow
          label="로그인 아이디"
          control={
            <span className="text-[13px] font-semibold tabular-nums text-content">
              {user?.phone ?? dealer?.phone ?? "-"}
            </span>
          }
        />
        <SettingRow
          label="비밀번호 변경"
          description="본인 확인이 필요해 전화나 방문으로 처리합니다"
          control={
            <span className="text-[12.5px] text-content-faint">
              관리자에게 문의
            </span>
          }
        />
        <SettingRow
          label="경매 비밀번호 확인"
          description="켜면 응찰 전에 경매 비밀번호를 한 번 묻습니다 · 이 브라우저에만 적용"
          control={
            <ToggleSwitch
              label="경매 비밀번호 확인"
              checked={auctionPasswordOn}
              onChange={toggleAuctionPassword}
            />
          }
        />
        <SettingRow
          label="경매 비밀번호 변경"
          control={
            <span className="text-[12.5px] text-content-faint">
              관리자에게 문의
            </span>
          }
        />
      </MyPanel>

      <MyPanel title="화면" bodyClassName="divide-y divide-line-soft">
        <SettingRow
          label="어두운 화면"
          description="경매장 · 배송지시 · 경매내역 모두 함께 바뀝니다"
          control={
            <ToggleSwitch
              label="어두운 화면"
              checked={isDarkMode}
              onChange={setIsDarkMode}
            />
          }
        />
      </MyPanel>
    </>
  );
}
