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
            System.out.println("--- DATABASE SCHEMA FIXER: RUNNING ---");

            // Keep critical fixes for Users/Transactions
            try {
                jdbcTemplate.execute(
                        "ALTER TABLE transactions MODIFY COLUMN type ENUM('CREDIT', 'DEBIT', 'PROFIT', 'PAYOUT', 'DEPOSIT', 'WITHDRAWAL')");
            } catch (Exception e) {
            }
            try {
                jdbcTemplate.execute("ALTER TABLE users MODIFY COLUMN user_id VARCHAR(20) NULL");
            } catch (Exception e) {
            }
            try {
                jdbcTemplate.execute("ALTER TABLE users MODIFY COLUMN status VARCHAR(50) NOT NULL");
            } catch (Exception e) {
            }
            try {
                jdbcTemplate.execute("ALTER TABLE transactions DROP INDEX user_id_UNIQUE");
            } catch (Exception e) {
            }
            try {
                jdbcTemplate.execute("CREATE INDEX idx_transactions_user_id ON transactions(user_id)");
            } catch (Exception e) {
            }

            // Fix status column lengths to accommodate CANCELLED status (9 chars)
            try {
                jdbcTemplate.execute("ALTER TABLE deposit_requests MODIFY COLUMN status VARCHAR(20) NOT NULL");
            } catch (Exception e) {
            }
            try {
                jdbcTemplate.execute("ALTER TABLE withdrawal_requests MODIFY COLUMN status VARCHAR(20) NOT NULL");
            } catch (Exception e) {
            }
            try {
                jdbcTemplate.execute("ALTER TABLE payout_requests MODIFY COLUMN status VARCHAR(20) NOT NULL");
            } catch (Exception e) {
            }

            // NOTE: Request tables (withdrawal/payout/deposit) are now managed by
            // Hibernate/DDL-Auto.
            // The previous DROP logic has been removed to allow tables to persist.

            // FIX UUID BINARY(16) INCOMPATIBILITY
            // 1. Drop Constraint for Portfolios
            try {
                jdbcTemplate.execute("ALTER TABLE portfolios DROP FOREIGN KEY FK9xt36kgm9cxsf79r2me0d9f6u");
            } catch (Exception e) {
                System.out.println("FK9xt36kgm9cxsf79r2me0d9f6u drop failed (might not exist): " + e.getMessage());
            }

            // 2. Drop Constraint for Transactions
            try {
                jdbcTemplate.execute("ALTER TABLE transactions DROP FOREIGN KEY FKqwv7rmvc8va8rep7piikrojds");
            } catch (Exception e) {
                System.out.println("FKqwv7rmvc8va8rep7piikrojds drop failed (might not exist): " + e.getMessage());
            }

            // 3. Drop Constraint for Monthly Profit History
            try {
                jdbcTemplate.execute("ALTER TABLE monthly_profit_history DROP FOREIGN KEY FKnhe6u818qrp1q0iw27racb98j");
            } catch (Exception e) {
                System.out.println("FKnhe6u818qrp1q0iw27racb98j drop failed (might not exist): " + e.getMessage());
            }

            // 4. Drop Constraint for Deposit Requests
            try {
                jdbcTemplate.execute("ALTER TABLE deposit_requests DROP FOREIGN KEY fk_deposit_user");
            } catch (Exception e) {
                System.out.println("fk_deposit_user drop failed (might not exist): " + e.getMessage());
            }

            // 5. Modify Columns to BINARY(16)
            try {
                jdbcTemplate.execute("ALTER TABLE portfolios MODIFY COLUMN user_id BINARY(16) NOT NULL");
                System.out.println("Fixed portfolios.user_id to BINARY(16)");
            } catch (Exception e) {
                System.out.println("Failed to fix portfolios: " + e.getMessage());
            }

            try {
                jdbcTemplate.execute("ALTER TABLE transactions MODIFY COLUMN user_id BINARY(16) NOT NULL");
                System.out.println("Fixed transactions.user_id to BINARY(16)");
            } catch (Exception e) {
                System.out.println("Failed to fix transactions: " + e.getMessage());
            }

            try {
                jdbcTemplate.execute("ALTER TABLE monthly_profit_history MODIFY COLUMN user_id BINARY(16) NOT NULL");
                System.out.println("Fixed monthly_profit_history.user_id to BINARY(16)");
            } catch (Exception e) {
                System.out.println("Failed to fix monthly_profit_history: " + e.getMessage());
            }

            try {
                jdbcTemplate.execute("ALTER TABLE deposit_requests MODIFY COLUMN user_id BINARY(16) NOT NULL");
                System.out.println("Fixed deposit_requests.user_id to BINARY(16)");
            } catch (Exception e) {
                System.out.println("Failed to fix deposit_requests: " + e.getMessage());
            }

            System.out.println("--- DATABASE SCHEMA CHECKS COMPLETED ---");

        } catch (Exception e) {
            System.err.println("Schema Fixer Error: " + e.getMessage());
        }
    }
}
