-- 분할 수 4 도입
--   등심            → 상단 · 중상단 · 중하단 · 하단
--   안심 · 채끝 · 부채 → (좌)상단 · (좌)하단 · (우)상단 · (우)하단
-- 라벨은 코드(lib/slots.ts)가 slot_count + 부위명으로 정한다. 여기서는 기본값과 진행 중 상품의 분할 수만 바꾼다.

-- 1. 부위 기본값
update public.group_buy_part_defaults
set slot_count = 4
where part_group in ('등심', '안심', '채끝', '부채');

-- 2. 아직 모집 전·모집 중인 상품 · 구좌가 하나도 팔리지 않은 것만 (팔린 구좌 번호의 위치가 바뀌면 안 된다)
with target as (
  select p.id, coalesce(cp.weight, 0)::numeric as weight, p.price_per_kg
  from public.group_buy_products p
  left join public.cattle_parts cp on cp.id = p.part_id
  where p.part_group in ('등심', '안심', '채끝', '부채')
    and p.status in ('draft', 'recruiting')
    and not exists (select 1 from public.group_buy_order_slots s where s.product_id = p.id)
)
update public.group_buy_products p
set slot_count  = 4,
    slot_weight = round(t.weight / 4, 3),
    slot_price  = case when p.price_per_kg is null then null
                       else ceil(p.price_per_kg * round(t.weight / 4, 3) / 10) * 10 end,
    updated_at  = now()
from target t
where p.id = t.id;
