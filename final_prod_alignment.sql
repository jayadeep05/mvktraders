-- Final Production Database Alignment (2026-01-25)
-- Run this on Production to ensure 100% matching schema with Local

USE investment_analysis;

-- 1. FIX PORTFOLIOS TABLE (CRITICAL)
-- Ensure all new columns exist with proper defaults
ALTER TABLE portfolios 
    MODIFY COLUMN profit_mode VARCHAR(20) NOT NULL DEFAULT 'FIXED',
    ADD COLUMN IF NOT EXISTS profit_mode_effective_date DATE,
    ADD COLUMN IF NOT EXISTS is_proration_enabled BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS allow_early_exit BOOLEAN DEFAULT FALSE;

-- Ensure total_profit_earned column exists (Lifetime profit)
ALTER TABLE portfolios 
    ADD COLUMN IF NOT EXISTS total_profit_earned DECIMAL(19, 4) DEFAULT 0.0000;

-- Ensure available_profit has precision 19,4
ALTER TABLE portfolios 
    MODIFY COLUMN available_profit DECIMAL(19, 4) DEFAULT 0.0000;

-- 2. FIX USERS TABLE
ALTER TABLE users 
    MODIFY COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0;

-- 3. FIX MONTHLY_PROFIT_HISTORY TABLE
CREATE TABLE IF NOT EXISTS monthly_profit_history (
    id BINARY(16) NOT NULL PRIMARY KEY,
    user_id BINARY(16) NOT NULL,
    month INT NOT NULL,
    year INT NOT NULL,
    profit_amount DECIMAL(19, 4) NOT NULL,
    profit_percentage DECIMAL(5, 2),
    capital_at_calculation DECIMAL(19, 4),
    calculated_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_month_year (user_id, month, year),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. FIX TRANSACTIONS TABLE
ALTER TABLE transactions 
    MODIFY COLUMN type ENUM('CREDIT', 'DEBIT', 'PROFIT', 'PAYOUT', 'DEPOSIT', 'WITHDRAWAL'),
    ADD COLUMN IF NOT EXISTS message_content TEXT,
    ADD COLUMN IF NOT EXISTS screenshot_path VARCHAR(255);

-- 5. DATA CLEANUP & ALIGNMENT
-- Ensure existing compounding clients have the correct rate (3.6)
UPDATE portfolios SET profit_percentage = 3.6 
WHERE profit_mode = 'COMPOUNDING' AND (profit_percentage IS NULL OR profit_percentage = 0);

-- Ensure existing fixed clients have the correct rate (4.0)
UPDATE portfolios SET profit_percentage = 4.0 
WHERE profit_mode = 'FIXED' AND (profit_percentage IS NULL OR profit_percentage = 0);

-- Ensure all NULL profit_modes are set to FIXED
UPDATE portfolios SET profit_mode = 'FIXED' WHERE profit_mode IS NULL;
UPDATE portfolios SET is_proration_enabled = 1 WHERE is_proration_enabled IS NULL;
UPDATE portfolios SET allow_early_exit = 0 WHERE allow_early_exit IS NULL;

SELECT 'Production Database is now fully aligned with Local Schema' AS status;
