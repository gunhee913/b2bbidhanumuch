-- 중도매인 거래 내역 테이블
CREATE TABLE IF NOT EXISTS dealer_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdraw')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  balance NUMERIC NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  created_by VARCHAR(100) DEFAULT '',
  cancelled_at TIMESTAMPTZ,
  cancelled_by VARCHAR(100),
  cancel_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_dealer_transactions_dealer_id ON dealer_transactions(dealer_id);
CREATE INDEX idx_dealer_transactions_created_at ON dealer_transactions(created_at);
CREATE INDEX idx_dealer_transactions_status ON dealer_transactions(status);

-- 중도매인 거래 수정 이력 테이블
CREATE TABLE IF NOT EXISTS dealer_transaction_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES dealer_transactions(id) ON DELETE CASCADE,
  previous_amount NUMERIC NOT NULL,
  new_amount NUMERIC NOT NULL,
  edited_by VARCHAR(100) DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_dealer_transaction_edits_tx ON dealer_transaction_edits(transaction_id);
