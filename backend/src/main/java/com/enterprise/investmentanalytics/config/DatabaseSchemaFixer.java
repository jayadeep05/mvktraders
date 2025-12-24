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
            String sqlEnum = "ALTER TABLE transactions MODIFY COLUMN type ENUM('CREDIT', 'DEBIT', 'PROFIT', 'PAYOUT')";
            try {
                jdbcTemplate.execute(sqlEnum);
                System.out.println("[FIX] TransactionType ENUM updated.");
            } catch (Exception e) {
                // Usually means it's already correct or modified
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

            System.out.println("--- Database Schema Fixes Completed ---");
        } catch (Exception e) {
            System.err.println("Critical error during schema fix: " + e.getMessage());
        }
    }
}
