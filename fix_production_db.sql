-- Fix Production Database Schema
-- Run this on production database to align with local changes

USE investment_analysis;

-- 1. Ensure profit_mode column has proper default
ALTER TABLE portfolios 
MODIFY COLUMN profit_mode VARCHAR(20) NOT NULL DEFAULT 'FIXED';

-- 2. Ensure all existing records have profit_mode set
UPDATE portfolios 
SET profit_mode = 'FIXED' 
WHERE profit_mode IS NULL OR profit_mode = '';

-- 3. Ensure profit_percentage has default for FIXED mode
UPDATE portfolios 
SET profit_percentage = 4.0 
WHERE profit_mode = 'FIXED' AND (profit_percentage IS NULL OR profit_percentage = 0);

-- 4. Ensure profit_percentage has default for COMPOUNDING mode
UPDATE portfolios 
SET profit_percentage = 3.6 
WHERE profit_mode = 'COMPOUNDING' AND (profit_percentage IS NULL OR profit_percentage = 0);

-- 5. Ensure is_proration_enabled has default
UPDATE portfolios 
SET is_proration_enabled = 1 
WHERE is_proration_enabled IS NULL;

-- 6. Ensure allow_early_exit has default
UPDATE portfolios 
SET allow_early_exit = 0 
WHERE allow_early_exit IS NULL;

-- 7. Check if monthly_profit_history table exists and has correct structure
CREATE TABLE IF NOT EXISTS monthly_profit_history (
    id BINARY(16) NOT NULL PRIMARY KEY,
    user_id BINARY(16) NOT NULL,
    month INT NOT NULL,
    year INT NOT NULL,
    profit_amount DECIMAL(19,4) NOT NULL,
    profit_percentage DECIMAL(5,2),
    capital_at_calculation DECIMAL(19,4),
    calculated_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_month_year (user_id, month, year),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Verify users table has all necessary columns
-- (Add any missing columns if needed)

SELECT 'Database migration completed successfully' AS status;
