-- Fix status column lengths to accommodate CANCELLED status
ALTER TABLE deposit_requests MODIFY COLUMN status VARCHAR(20) NOT NULL;
ALTER TABLE withdrawal_requests MODIFY COLUMN status VARCHAR(20) NOT NULL;
ALTER TABLE payout_requests MODIFY COLUMN status VARCHAR(20) NOT NULL;
