/** PostgREST 한 번에 돌려주는 줄 수 상한 · 넘는 만큼은 말없이 잘린다 */
const PAGE_SIZE = 1000;

/** 안전장치 · 이보다 많이 받아야 하는 질의는 집계를 DB 로 내려야 한다는 신호다 */
const MAX_ROWS = 60_000;

interface PageResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

/**
 * 상한에 걸리지 않게 끝까지 받아 온다.
 *
 * PostgREST 는 한 번에 1000줄만 주고 **더 있다는 말을 하지 않는다**. 며칠치를 묶는
 * 질의는 그 아래라 멀쩡히 돌다가, 기간이 길어지는 순간 조용히 앞 1000줄만 집계한다 —
 * 틀린 값이 아니라 **그럴듯하게 틀린 값**이 나오므로 눈으로는 못 잡는다.
 *
 * 실제로 두 해치 시세 시계열이 그렇게 막혀 있었다. 6160줄 중 앞 1000줄(스무 날치)만
 * 받아 와 마지막 자료가 반 년 전으로 찍혔고, 차트는 「자료가 오래됐다」 고 판단해
 * 표본 그래프로 떨어져 있었다. 받아 오는 쪽은 아무 오류도 보지 못했다.
 *
 * 쓰는 쪽은 `from`·`to` 를 `.range()` 에 그대로 넘기면 된다. 마지막 쪽이 한 쪽을 다
 * 못 채우면 거기서 멈춘다.
 */
export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize: number = PAGE_SIZE,
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; from < MAX_ROWS; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}
