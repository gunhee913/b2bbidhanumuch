-- 부위 변경: 19개 → 20개 (갈비 제거, 치마/부채/업진/토시·제비 추가)
-- valid_part_no 체크 제약조건을 1-20으로 확장

ALTER TABLE cattle_parts DROP CONSTRAINT valid_part_no;
ALTER TABLE cattle_parts ADD CONSTRAINT valid_part_no CHECK (part_no >= 1 AND part_no <= 20);

COMMENT ON COLUMN cattle_parts.part_no IS '부위 순번 (1-20)';
