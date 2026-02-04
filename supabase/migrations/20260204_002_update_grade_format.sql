-- 기존 등급 데이터를 조합된 형식으로 업데이트
-- 예: grade='1++', marbling_score=9 → grade='1++A(9)'

-- 근내지방도가 있고, 아직 조합되지 않은 데이터만 업데이트
UPDATE cattle_listings 
SET grade = grade || 'A(' || marbling_score || ')'
WHERE marbling_score IS NOT NULL 
  AND grade NOT LIKE '%(%'  -- 이미 괄호가 있으면 스킵
  AND grade IN ('1++', '1+', '1', '2', '3');

-- 확인용 쿼리
-- SELECT id, listing_no, grade, marbling_score FROM cattle_listings;
