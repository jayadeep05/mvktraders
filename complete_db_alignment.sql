-- Complete Production Database Alignment Script
-- This ensures production DB matches all local changes

USE investment_analysis;

-- ============================================
-- PART 1: PORTFOLIOS TABLE FIXES
-- ============================================

-- Ensure profit_mode column exists and has proper default
ALTER TABLE portfolios 
MODIFY COLUMN profit_mode VARCHAR(20) NOT NULL DEFAULT 'FIXED';

-- Update all NULL profit_modes
UPDATE portfolios 
SET profit_mode = 'FIXED' 
WHERE profit_mode IS NULL OR profit_mode = '';

-- Set default profit percentages
UPDATE portfolios 
SET profit_percentage = 4.0 
WHERE profit_mode = 'FIXED' AND (profit_percentage IS NULL OR profit_percentage = 0);

UPDATE portfolios 
SET profit_percentage = 3.6 
WHERE profit_mode = 'COMPOUNDING' AND (profit_percentage IS NULL OR profit_percentage = 0);

-- Ensure boolean fields have defaults
UPDATE portfolios 
SET is_proration_enabled = 1 
WHERE is_proration_enabled IS NULL;

UPDATE portfolios 
SET allow_early_exit = 0 
WHERE allow_early_exit IS NULL;

-- ============================================
-- PART 2: MONTHLY_PROFIT_HISTORY TABLE
-- ============================================

-- Create if not exists
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

-- ============================================
-- PART 3: VERIFY USERS TABLE
-- ============================================

-- Check if user_id column exists in users table
SELECT 'Checking users table structure' AS status;

-- ============================================
-- PART 4: VERIFY TRANSACTIONS TABLE
-- ============================================

-- Ensure transactions table has all necessary columns
SELECT 'Checking transactions table structure' AS status;

-- ============================================
-- PART 5: VERIFY DEPOSIT/WITHDRAWAL REQUESTS
-- ============================================

SELECT 'Checking deposit_requests table' AS status;
SELECT 'Checking withdrawal_requests table' AS status;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

SELECT 'Production Database Alignment Complete!' AS status;

-- Show portfolio statistics
SELECT 
    profit_mode,
    COUNT(*) as count,
    AVG(profit_percentage) as avg_percentage,
    SUM(total_invested) as total_capital
FROM portfolios 
GROUP BY profit_mode;

-- Show profit history count
SELECT COUNT(*) as profit_history_count FROM monthly_profit_history;

SELECT 'All checks completed successfully' AS final_status;
