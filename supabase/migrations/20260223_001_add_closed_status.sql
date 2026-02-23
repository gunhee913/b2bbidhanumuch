-- cattle_listings 테이블의 status CHECK 제약조건에 'closed' 추가
-- 기존: ('pending', 'approved', 'auction', 'completed', 'cancelled')
-- 변경: ('pending', 'approved', 'auction', 'completed', 'closed', 'cancelled')

ALTER TABLE cattle_listings DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE cattle_listings ADD CONSTRAINT valid_status 
  CHECK (status IN ('pending', 'approved', 'auction', 'completed', 'closed', 'cancelled'));
