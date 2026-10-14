import type { LiveListing, LivePart } from "../api";
import type { NotePartSummary, NoteRow } from "../hooks/useAuctionNotes";

/**
 * 사이드 메뉴 관심·메모 목록 밑그림.
 *
 * 패널이 그리는 줄과 레일 배지가 세는 수가 **같은 곳에서 나와야** 해서 꺼냈다.
 * 양쪽이 따로 세면 배지는 3이라는데 열어 보면 한 줄만 있는 일이 생긴다 — 두 패널
 * 모두 「오늘 상장에 실제로 있는 것」 만 남기는 거름망을 거치는데, 그 거름망을 한쪽만
 * 두면 어긋난다. 한 번 어긋난 배지는 그 뒤로 아무도 안 믿는다.
 *
 * 거름망이 있는 까닭은 관심·메모가 딜러 단위로 쌓이기 때문이다. 담아 둔 뒤 상장이
 * 내려가면 눌러도 열 곳이 없는 줄이 된다.
 *
 * 차례는 둘 다 접수번호 순이다. 찍은 순서로 두면 같은 개체가 상장표에서는 위쪽,
 * 여기서는 아래쪽에 있어 두 목록을 번갈아 볼 때 눈이 자꾸 길을 잃는다.
 */

const byListingNo = (a: { listingNo: string }, b: { listingNo: string }) =>
  a.listingNo.localeCompare(b.listingNo);

export interface FavoritePartRow {
  listing: LiveListing;
  part: LivePart;
}

export interface FavoriteRows {
  /** 개체로 찍은 것 · 열쇠는 접수번호 */
  listings: LiveListing[];
  /** 부위로 찍은 것 · 열쇠는 부위 UUID */
  parts: FavoritePartRow[];
}

export function buildFavoriteRows(
  listings: LiveListing[],
  favoriteIds: ReadonlySet<string>,
): FavoriteRows {
  return {
    listings: listings
      .filter((l) => favoriteIds.has(l.listingNo))
      .sort(byListingNo),
    parts: listings
      .flatMap((listing) =>
        listing.parts
          .filter((part) => favoriteIds.has(part.id))
          .map((part) => ({ listing, part })),
      )
      .sort(
        (a, b) =>
          byListingNo(a.listing, b.listing) || a.part.partNo - b.part.partNo,
      ),
  };
}

export interface PartNoteRow extends FavoritePartRow {
  body: string;
  /** 메모가 담긴 날 · 지울 때 같은 열쇠로 보내야 한다 */
  activeDate: string;
}

/**
 * 오늘 상장의 부위에 붙은 메모만 · 메모장(`memo`)은 세지 않는다.
 *
 * 메모장은 어느 부위에도 안 붙는 한 칸이라 「남긴 말 몇 개」 에 끼면 목록에 없는
 * 하나가 숫자에만 더해진다. 받아 온 메모가 여러 날치여도 부위 UUID 는 한 상장일에만
 * 있으므로, 오늘 상장과 맞물리는 것이 곧 오늘 것이다.
 */
export function buildPartNoteRows(
  listings: LiveListing[],
  notes: NoteRow[],
): PartNoteRow[] {
  const noteOf = new Map(
    notes.filter((n) => n.targetType === "part").map((n) => [n.targetId, n]),
  );
  if (noteOf.size === 0) return [];

  return listings
    .flatMap((listing) =>
      listing.parts
        .filter((part) => noteOf.has(part.id))
        .map((part) => {
          const note = noteOf.get(part.id)!;
          return {
            listing,
            part,
            body: note.body,
            activeDate: note.activeDate,
          };
        }),
    )
    .sort(
      (a, b) =>
        byListingNo(a.listing, b.listing) || a.part.partNo - b.part.partNo,
    );
}

/**
 * 「전체」 목록 한 줄 · 오늘 상장에 있으면 `live`, 아니면 서버가 붙여 준 `summary` 로 그린다.
 *
 * 둘 다 없는 줄도 있다 — 부위가 지워졌거나(상장 취소) 방금 적어 아직 요약을 못 받은 것.
 * 그런 줄은 적은 말과 날짜만 보인다. 메모를 지우는 건 어느 경우든 된다.
 */
export interface NoteHistoryRow {
  key: string;
  activeDate: string;
  partId: string;
  body: string;
  live: FavoritePartRow | null;
  summary: NotePartSummary | null;
}

export interface NoteHistoryGroup {
  /** 상장일 `yyyy-MM-dd` */
  date: string;
  rows: NoteHistoryRow[];
}

const listingNoOf = (row: NoteHistoryRow) =>
  row.live?.listing.listingNo ?? row.summary?.listingNo ?? "";

const partNoOf = (row: NoteHistoryRow) =>
  row.live?.part.partNo ?? row.summary?.partNo ?? 0;

/**
 * 지금껏 남긴 부위 메모 전부를 날짜별로 · 최근 날이 위.
 *
 * 날 안에서는 접수번호·부위 차례다 — 적은 순서로 두면 같은 소의 두 부위가 떨어져 앉는다.
 * 오늘 것은 `buildPartNoteRows` 와 같은 줄이 되게 오늘 상장의 개체·부위를 그대로 물린다.
 */
export function buildNoteHistory(
  listings: LiveListing[],
  notes: NoteRow[],
): NoteHistoryGroup[] {
  const liveByPartId = new Map<string, FavoritePartRow>(
    listings.flatMap((listing) =>
      listing.parts.map((part) => [part.id, { listing, part }] as const),
    ),
  );

  const byDate = new Map<string, NoteHistoryRow[]>();
  for (const note of notes) {
    if (note.targetType !== "part" || !note.body) continue;
    const row: NoteHistoryRow = {
      key: `${note.activeDate}:${note.targetId}`,
      activeDate: note.activeDate,
      partId: note.targetId,
      body: note.body,
      live: liveByPartId.get(note.targetId) ?? null,
      summary: note.part ?? null,
    };
    const bucket = byDate.get(note.activeDate);
    if (bucket) bucket.push(row);
    else byDate.set(note.activeDate, [row]);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, rows]) => ({
      date,
      rows: rows.sort(
        (a, b) =>
          listingNoOf(a).localeCompare(listingNoOf(b)) ||
          partNoOf(a) - partNoOf(b),
      ),
    }));
}
