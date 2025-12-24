-- Phase 1 Cleanup: Standardization & Precision
-- Run this script to align the database with the new schema design

-- 1. Fix Money Precision (19, 2 -> 19, 4)
ALTER TABLE deposit_requests MODIFY COLUMN amount DECIMAL(19, 4);
ALTER TABLE withdrawal_requests MODIFY COLUMN amount DECIMAL(19, 4);
ALTER TABLE portfolios MODIFY COLUMN total_invested DECIMAL(19, 4);
ALTER TABLE portfolios MODIFY COLUMN total_value DECIMAL(19, 4);
ALTER TABLE portfolios MODIFY COLUMN cash_balance DECIMAL(19, 4);
ALTER TABLE portfolios MODIFY COLUMN available_profit DECIMAL(19, 4);
ALTER TABLE portfolios MODIFY COLUMN total_profit_earned DECIMAL(19, 4);

-- 2. Rename N_Id to n_id (Standard Snake Case)
-- Note: MySQL 8.0+ supports RENAME COLUMN. If older, use CHANGE syntax.
ALTER TABLE users RENAME COLUMN N_Id TO n_id;

-- 3. Drop Redundant Table
DROP TABLE IF EXISTS monthly_profit_summary;
