-- 공지사항 테이블 생성
CREATE TABLE IF NOT EXISTS notices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT '일반',
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  target VARCHAR(20) NOT NULL DEFAULT 'all',
  author_id UUID REFERENCES admins(id),
  author_name VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE notices IS '공지사항';
COMMENT ON COLUMN notices.title IS '제목';
COMMENT ON COLUMN notices.content IS '본문 (HTML)';
COMMENT ON COLUMN notices.category IS '분류 (일반/경매일정/휴무/시스템)';
COMMENT ON COLUMN notices.is_pinned IS '상단 고정 여부';
COMMENT ON COLUMN notices.is_published IS '공개 여부';
COMMENT ON COLUMN notices.target IS '대상 (all/dealer/company)';
COMMENT ON COLUMN notices.author_id IS '작성자 ID';
COMMENT ON COLUMN notices.author_name IS '작성자명';

CREATE INDEX idx_notices_published ON notices (is_published, created_at DESC);
CREATE INDEX idx_notices_pinned ON notices (is_pinned, created_at DESC);
