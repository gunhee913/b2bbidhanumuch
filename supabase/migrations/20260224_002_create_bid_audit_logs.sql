CREATE TABLE bid_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bid_id UUID,
    auction_id UUID REFERENCES auctions(id) ON DELETE SET NULL,
    part_id UUID REFERENCES cattle_parts(id) ON DELETE SET NULL,
    dealer_id UUID REFERENCES dealers(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('update', 'delete', 'dealer_update', 'dealer_cancel')),
    old_bid_price INT,
    new_bid_price INT,
    old_bid_amount INT,
    new_bid_amount INT,
    performed_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bid_audit_logs_auction ON bid_audit_logs(auction_id);
CREATE INDEX idx_bid_audit_logs_part ON bid_audit_logs(part_id);
CREATE INDEX idx_bid_audit_logs_created ON bid_audit_logs(created_at);
