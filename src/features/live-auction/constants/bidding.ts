/**
 * 오픈 최고가 경매 관련 공용 상수.
 *
 * MVP 정책: 모든 부위에 동일한 최소 증가폭(100원/kg) 적용.
 * 향후 부위/등급/최고가 구간별로 세분화하려면 이 값을 함수로 확장하고,
 * `place_bid` RPC 의 `p_min_increment` 파라미터에 계산값을 전달하면 된다.
 */
export const MIN_BID_INCREMENT = 100;
