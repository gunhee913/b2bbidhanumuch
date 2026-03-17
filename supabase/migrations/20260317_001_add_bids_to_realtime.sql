-- bids 테이블을 supabase_realtime publication에 추가
-- (이미 추가되어 있을 수 있으므로 IF NOT EXISTS 패턴 사용)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'bids'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE bids;
  END IF;
END $$;
