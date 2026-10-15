"use client";

import { useRouter } from "next/navigation";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { CheckCheck, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NotificationSettings } from "../api";
import {
  useMyDealer,
  useMyNotifications,
  useNotificationSettings,
} from "../hooks/useMyPageData";
import {
  MyPanel,
  MyPanelEmpty,
  PANEL_ACTION_CLASS,
  SettingRow,
  ToggleSwitch,
} from "./MyPageParts";

/** 알림 종류 · 모바일 `/settings` 와 같은 글귀 · 하루 흐름 순서(상장 → 시작 → 결과 → 돈) */
const SETTING_ITEMS: {
  key: keyof NotificationSettings;
  label: string;
  description: string;
}[] = [
  {
    key: "listingUpload",
    label: "상장 정보",
    description: "다음날 상장 정보가 올라오면 알립니다",
  },
  {
    key: "auctionStart",
    label: "경매 시작",
    description: "경매가 시작되면 알립니다",
  },
  {
    key: "auctionResult",
    label: "경매 결과",
    description: "경매 마감 후 낙찰 결과와 금액을 알립니다",
  },
  {
    key: "balance",
    label: "잔고 · 입금",
    description: "입출금이 처리되면 알립니다",
  },
];

/**
 * 알림 · 위는 무엇을 받을지, 아래는 받은 것.
 *
 * 스위치는 누르는 즉시 저장된다(저장 단추 없음). 알림함은 모바일 `/notifications` 와
 * 같은 자료라 한쪽에서 읽으면 다른 쪽도 읽은 것으로 바뀐다.
 */
export function MyNotifyView() {
  const router = useRouter();
  const { dealerId } = useMyDealer();
  const enabled = !!dealerId;
  const settings = useNotificationSettings(enabled);
  const inbox = useMyNotifications(enabled);
  const unreadCount = inbox.notifications.filter((n) => !n.isRead).length;

  const open = (id: string, link: string | null, isRead: boolean) => {
    if (!isRead) inbox.read(id);
    if (link) router.push(link);
  };

  return (
    <>
      <MyPanel
        title="알림 설정"
        description="끄면 그 종류의 알림이 오지 않습니다 · 바꾸는 즉시 저장"
        bodyClassName="divide-y divide-line-soft"
      >
        {SETTING_ITEMS.map((item) => (
          <SettingRow
            key={item.key}
            label={item.label}
            description={item.description}
            control={
              <ToggleSwitch
                label={`${item.label} 알림`}
                checked={settings.settings[item.key]}
                onChange={() => settings.toggle(item.key)}
                disabled={settings.isLoading}
              />
            }
          />
        ))}
      </MyPanel>

      <MyPanel
        title="알림함"
        description={
          unreadCount > 0 ? `안 읽은 알림 ${unreadCount}개` : "모두 읽었습니다"
        }
        action={
          <>
            <button
              type="button"
              className={PANEL_ACTION_CLASS}
              onClick={inbox.readAll}
              disabled={unreadCount === 0}
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden />
              모두 읽음
            </button>
            <button
              type="button"
              className={PANEL_ACTION_CLASS}
              onClick={() => {
                if (window.confirm("알림을 모두 지울까요?")) inbox.clear();
              }}
              disabled={inbox.notifications.length === 0}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              비우기
            </button>
          </>
        }
      >
        {inbox.isLoading ? (
          <div className="m-4 h-40 animate-pulse bg-surface-accent" />
        ) : inbox.notifications.length === 0 ? (
          <MyPanelEmpty text="받은 알림이 없습니다" />
        ) : (
          <ul className="divide-y divide-line-soft">
            {inbox.notifications.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => open(n.id, n.link, n.isRead)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-muted"
                >
                  <span
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      n.isRead ? "bg-transparent" : "bg-lost",
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span
                        className={cn(
                          "truncate text-[13px]",
                          n.isRead
                            ? "text-content-mid"
                            : "font-semibold text-content",
                        )}
                      >
                        {n.title}
                      </span>
                      <span className="shrink-0 text-[11.5px] tabular-nums text-content-faint">
                        {formatDistanceToNowStrict(parseISO(n.createdAt), {
                          addSuffix: true,
                          locale: ko,
                        })}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-[12.5px] text-content-faint">
                      {n.message}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </MyPanel>
    </>
  );
}
