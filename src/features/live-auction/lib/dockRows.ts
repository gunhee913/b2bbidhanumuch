import type { LiveListing, LivePart } from "../api";
import type { NoteRow } from "../hooks/useAuctionNotes";

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
}

/**
 * 부위에 붙은 메모만 · 메모장(`memo`)은 세지 않는다.
 *
 * 메모장은 어느 부위에도 안 붙는 한 칸이라 「남긴 말 몇 개」 에 끼면 목록에 없는
 * 하나가 숫자에만 더해진다.
 */
export function buildPartNoteRows(
  listings: LiveListing[],
  notes: NoteRow[],
): PartNoteRow[] {
  const bodyOf = new Map(
    notes
      .filter((n) => n.targetType === "part")
      .map((n) => [n.targetId, n.body]),
  );
  if (bodyOf.size === 0) return [];

  return listings
    .flatMap((listing) =>
      listing.parts
        .filter((part) => bodyOf.has(part.id))
        .map((part) => ({ listing, part, body: bodyOf.get(part.id)! })),
    )
    .sort(
      (a, b) =>
        byListingNo(a.listing, b.listing) || a.part.partNo - b.part.partNo,
    );
}
