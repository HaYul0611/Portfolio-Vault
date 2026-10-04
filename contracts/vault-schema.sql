-- =============================================
-- Portfolio-Vault — 패스키 인증 + 비공개 메모
-- Supabase SQL Editor에서 한 번에 실행
-- =============================================

-- 1. 사용자 (비밀번호 없음)
CREATE TABLE vault_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 패스키 공개키 저장
CREATE TABLE vault_credentials (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES vault_users(id) ON DELETE CASCADE,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  device_name TEXT NOT NULL DEFAULT '내 기기',
  transports TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 일회용 챌린지 (재사용 방지)
CREATE TABLE vault_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES vault_users(id) ON DELETE CASCADE,
  challenge TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('register', 'login')),
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '5 minutes')
);

-- 만료된 챌린지 자동 정리용 인덱스
CREATE INDEX idx_challenges_expires ON vault_challenges(expires_at);

-- 4. 비공개 메모
CREATE TABLE vault_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES vault_users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notes_updated
  BEFORE UPDATE ON vault_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- RLS 설정 — 서버(service_role)만 접근 허용
-- 프론트에서 직접 DB 접근 차단 (보안)
-- =============================================

ALTER TABLE vault_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_notes ENABLE ROW LEVEL SECURITY;

-- service_role만 접근 가능 (anon 차단)
CREATE POLICY "서버만 접근" ON vault_users FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "서버만 접근" ON vault_credentials FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "서버만 접근" ON vault_challenges FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "서버만 접근" ON vault_notes FOR ALL TO service_role USING (true) WITH CHECK (true);
