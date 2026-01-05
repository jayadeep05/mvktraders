package com.enterprise.investmentanalytics.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseSchemaFixer implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    public DatabaseSchemaFixer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) throws Exception {
        try {
            System.out.println("--- Starting Database Schema Fixes ---");

            // 1. TransactionType ENUM update
            String sqlEnum = "ALTER TABLE transactions MODIFY COLUMN type ENUM('CREDIT', 'DEBIT', 'PROFIT', 'PAYOUT', 'DEPOSIT', 'WITHDRAWAL')";
            try {
                jdbcTemplate.execute(sqlEnum);
                System.out.println("[FIX] TransactionType ENUM updated.");
            } catch (Exception e) {
                // Usually means it's already correct or modified
            }

            // 1.5. Fix withdrawal_requests.processed_by length (too short at 10)
            String sqlProcessedBy = "ALTER TABLE withdrawal_requests MODIFY COLUMN processed_by VARCHAR(50)";
            try {
                jdbcTemplate.execute(sqlProcessedBy);
                System.out.println("[FIX] withdrawal_requests.processed_by length increased.");
            } catch (Exception e) {
                // Ignore
            }

            // 1.6. Fix withdrawal_requests.payment_mode length
            String sqlPaymentMode = "ALTER TABLE withdrawal_requests MODIFY COLUMN payment_mode VARCHAR(50)";
            try {
                jdbcTemplate.execute(sqlPaymentMode);
                System.out.println("[FIX] withdrawal_requests.payment_mode length set to 50.");
            } catch (Exception e) {
                // Ignore
            }

            // 2. Remove UNIQUE constraint on transactions.user_id
            String sqlDropIndex = "ALTER TABLE transactions DROP INDEX user_id_UNIQUE";
            try {
                jdbcTemplate.execute(sqlDropIndex);
                System.out.println("[FIX] Removed user_id_UNIQUE constraint from transactions.");
            } catch (Exception e) {
                // Index might not exist, ignore
            }

            // 3. Ensure index exists for user_id on transactions
            String sqlAddIndex = "CREATE INDEX idx_transactions_user_id ON transactions(user_id)";
            try {
                jdbcTemplate.execute(sqlAddIndex);
                System.out.println("[FIX] Created idx_transactions_user_id.");
            } catch (Exception e) {
                // Index might already exist, ignore
            }

            // 4. Ensure users.user_id is nullable for initial application-side generation
            String sqlMakeNullable = "ALTER TABLE users MODIFY COLUMN user_id VARCHAR(20) NULL";
            try {
                jdbcTemplate.execute(sqlMakeNullable);
                System.out.println("[FIX] users.user_id set to NULLABLE.");
            } catch (Exception e) {
                // Column might be different or already nullable
            }

            // 4.1. Ensure users.status supports PENDING_APPROVAL (often truncated if ENUM
            // or short VARCHAR)
            String sqlFixStatus = "ALTER TABLE users MODIFY COLUMN status VARCHAR(50) NOT NULL";
            try {
                jdbcTemplate.execute(sqlFixStatus);
                System.out.println("[FIX] users.status modified to VARCHAR(50).");
            } catch (Exception e) {
                System.err.println("[ERROR] Failed to modify users.status: " + e.getMessage());
            }

            // 5. Create/Fix payout_requests table
            // First drop if exists to ensure clean schema
            String sqlDropPayoutRequests = "DROP TABLE IF EXISTS payout_requests";
            try {
                jdbcTemplate.execute(sqlDropPayoutRequests);
                System.out.println("[FIX] Dropped existing payout_requests table.");
            } catch (Exception e) {
                // Table might not exist
            }

            String sqlCreatePayoutRequests = """
                        CREATE TABLE payout_requests (
                            id BINARY(16) PRIMARY KEY,
                            user_id BINARY(16) NOT NULL,
                            amount DECIMAL(19,4) NOT NULL,
                            note VARCHAR(1000),
                            status VARCHAR(20) NOT NULL,
                            rejection_reason VARCHAR(500),
                            processed_by VARCHAR(50),
                            transaction_id_reference VARCHAR(100),
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                            processed_at TIMESTAMP NULL,
                            FOREIGN KEY (user_id) REFERENCES users(id)
                        )
                    """;
            try {
                jdbcTemplate.execute(sqlCreatePayoutRequests);
                System.out.println("[FIX] payout_requests table created with correct schema.");
            } catch (Exception e) {
                System.err.println("[ERROR] Failed to create payout_requests table: " + e.getMessage());
            }

            // 6. Fix deposit_requests table - NOTE: Manual fix required
            // The deposit_requests table has incorrect column types (VARCHAR instead of
            // BINARY(16))
            // This requires manual intervention to avoid data loss
            System.out.println("[WARN] deposit_requests table may have incorrect schema.");
            System.out.println("[WARN] If deposit operations fail, manually run:");
            System.out.println("[WARN] ALTER TABLE deposit_requests MODIFY COLUMN id BINARY(16);");
            System.out.println("[WARN] ALTER TABLE deposit_requests MODIFY COLUMN user_id BINARY(16);");

            System.out.println("--- Database Schema Fixes Completed ---");
        } catch (Exception e) {
            System.err.println("Critical error during schema fix: " + e.getMessage());
        }
    }
}
