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
            try { jdbcTemplate.execute("ALTER TABLE transactions MODIFY COLUMN type ENUM('CREDIT', 'DEBIT', 'PROFIT', 'PAYOUT', 'DEPOSIT', 'WITHDRAWAL')"); } catch (Exception e) {}
            try { jdbcTemplate.execute("ALTER TABLE users MODIFY COLUMN user_id VARCHAR(20) NULL"); } catch (Exception e) {}
            try { jdbcTemplate.execute("ALTER TABLE users MODIFY COLUMN status VARCHAR(50) NOT NULL"); } catch (Exception e) {}
            try { jdbcTemplate.execute("ALTER TABLE transactions DROP INDEX user_id_UNIQUE"); } catch (Exception e) {}
            try { jdbcTemplate.execute("CREATE INDEX idx_transactions_user_id ON transactions(user_id)"); } catch (Exception e) {}

            // NOTE: Request tables (withdrawal/payout/deposit) are now managed by Hibernate/DDL-Auto.
            // The previous DROP logic has been removed to allow tables to persist.
            
            System.out.println("--- DATABASE SCHEMA CHECKS COMPLETED ---");

        } catch (Exception e) {
            System.err.println("Schema Fixer Error: " + e.getMessage());
        }
    }
}
