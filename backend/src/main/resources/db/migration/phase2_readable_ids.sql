-- Phase 2 Migration: Readable IDs
-- This script migrates Foreign Keys from referencing the binary UUID (id) 
-- to referencing the readable String (user_id, e.g. "SM00001").
-- It also converts "processed_by" and "actor_user_id" from UUID to String.

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_SAFE_UPDATES = 0;

DROP PROCEDURE IF EXISTS DropFK;
DROP PROCEDURE IF EXISTS MigrateToReadableID;

DELIMITER //

CREATE PROCEDURE DropFK(IN tableName VARCHAR(64), IN columnName VARCHAR(64))
BEGIN
    DECLARE fkName VARCHAR(64);
    
    -- Find constraint name for the foreign key on this column
    SELECT constraint_name INTO fkName 
    FROM information_schema.key_column_usage 
    WHERE table_name = tableName 
      AND column_name = columnName 
      AND referenced_table_name IS NOT NULL 
      AND CONSTRAINT_SCHEMA = DATABASE()
    LIMIT 1;

    IF fkName IS NOT NULL THEN
        SET @query = CONCAT('ALTER TABLE ', tableName, ' DROP FOREIGN KEY ', fkName);
        PREPARE stmt FROM @query;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //

CREATE PROCEDURE MigrateToReadableID()
BEGIN

    -- 1. Transactions
    IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'user_id_new' AND table_schema = DATABASE()) THEN
        IF (SELECT DATA_TYPE FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'user_id' AND table_schema = DATABASE()) != 'varchar' THEN
            ALTER TABLE transactions ADD COLUMN user_id_new VARCHAR(10);
            
            -- Migrate Data
            UPDATE transactions t JOIN users u ON t.user_id = u.id SET t.user_id_new = u.user_id;
            
            -- Drop old FK and Column
            CALL DropFK('transactions', 'user_id');
            ALTER TABLE transactions DROP COLUMN user_id;
            
            -- Rename new column
            ALTER TABLE transactions CHANGE COLUMN user_id_new user_id VARCHAR(10) NOT NULL;
            
            -- Add new FK
            ALTER TABLE transactions ADD CONSTRAINT fk_transactions_user_id FOREIGN KEY (user_id) REFERENCES users(user_id);
        END IF;
    END IF;

    -- 2. Portfolios
    IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_name = 'portfolios' AND column_name = 'user_id_new' AND table_schema = DATABASE()) THEN
        IF (SELECT DATA_TYPE FROM information_schema.columns WHERE table_name = 'portfolios' AND column_name = 'user_id' AND table_schema = DATABASE()) != 'varchar' THEN
            ALTER TABLE portfolios ADD COLUMN user_id_new VARCHAR(10);
            
            UPDATE portfolios p JOIN users u ON p.user_id = u.id SET p.user_id_new = u.user_id;
            
            CALL DropFK('portfolios', 'user_id');
            ALTER TABLE portfolios DROP COLUMN user_id;
            
            ALTER TABLE portfolios CHANGE COLUMN user_id_new user_id VARCHAR(10) NOT NULL;
            
            -- Re-add Unique Constraint and FK
            ALTER TABLE portfolios ADD CONSTRAINT uq_portfolios_user_id UNIQUE (user_id);
            ALTER TABLE portfolios ADD CONSTRAINT fk_portfolios_user_id FOREIGN KEY (user_id) REFERENCES users(user_id);
        END IF;
    END IF;

    -- 3. Deposit Requests
    IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_name = 'deposit_requests' AND column_name = 'user_id_new' AND table_schema = DATABASE()) THEN
        IF (SELECT DATA_TYPE FROM information_schema.columns WHERE table_name = 'deposit_requests' AND column_name = 'user_id' AND table_schema = DATABASE()) != 'varchar' THEN
            ALTER TABLE deposit_requests ADD COLUMN user_id_new VARCHAR(10);
            
            UPDATE deposit_requests d JOIN users u ON d.user_id = u.id SET d.user_id_new = u.user_id;
            
            CALL DropFK('deposit_requests', 'user_id');
            ALTER TABLE deposit_requests DROP COLUMN user_id;
            
            ALTER TABLE deposit_requests CHANGE COLUMN user_id_new user_id VARCHAR(10) NOT NULL;
            ALTER TABLE deposit_requests ADD CONSTRAINT fk_deposit_user_id FOREIGN KEY (user_id) REFERENCES users(user_id);
        END IF;
    END IF;

    -- 3b. Deposit Requests (processed_by)
    IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_name = 'deposit_requests' AND column_name = 'processed_by_new' AND table_schema = DATABASE()) THEN
         -- Check if processed_by is currently binary
        IF (SELECT DATA_TYPE FROM information_schema.columns WHERE table_name = 'deposit_requests' AND column_name = 'processed_by' AND table_schema = DATABASE()) != 'varchar' THEN
            ALTER TABLE deposit_requests ADD COLUMN processed_by_new VARCHAR(10);
            
            UPDATE deposit_requests d LEFT JOIN users u ON d.processed_by = u.id SET d.processed_by_new = u.user_id;
            
            CALL DropFK('deposit_requests', 'processed_by');
            ALTER TABLE deposit_requests DROP COLUMN processed_by;
            
            ALTER TABLE deposit_requests CHANGE COLUMN processed_by_new processed_by VARCHAR(10);
            ALTER TABLE deposit_requests ADD CONSTRAINT fk_deposit_processed_by FOREIGN KEY (processed_by) REFERENCES users(user_id);
        END IF;
    END IF;

    -- 4. Withdrawal Requests
    IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_name = 'withdrawal_requests' AND column_name = 'user_id_new' AND table_schema = DATABASE()) THEN
        IF (SELECT DATA_TYPE FROM information_schema.columns WHERE table_name = 'withdrawal_requests' AND column_name = 'user_id' AND table_schema = DATABASE()) != 'varchar' THEN
            ALTER TABLE withdrawal_requests ADD COLUMN user_id_new VARCHAR(10);
            
            UPDATE withdrawal_requests w JOIN users u ON w.user_id = u.id SET w.user_id_new = u.user_id;
            
            CALL DropFK('withdrawal_requests', 'user_id');
            ALTER TABLE withdrawal_requests DROP COLUMN user_id;
            
            ALTER TABLE withdrawal_requests CHANGE COLUMN user_id_new user_id VARCHAR(10) NOT NULL;
            ALTER TABLE withdrawal_requests ADD CONSTRAINT fk_withdrawal_user_id FOREIGN KEY (user_id) REFERENCES users(user_id);
        END IF;
    END IF;

    -- 4b. Withdrawal Requests (processed_by)
    IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_name = 'withdrawal_requests' AND column_name = 'processed_by_new' AND table_schema = DATABASE()) THEN
         IF (SELECT DATA_TYPE FROM information_schema.columns WHERE table_name = 'withdrawal_requests' AND column_name = 'processed_by' AND table_schema = DATABASE()) != 'varchar' THEN
            ALTER TABLE withdrawal_requests ADD COLUMN processed_by_new VARCHAR(10);
            
            UPDATE withdrawal_requests w LEFT JOIN users u ON w.processed_by = u.id SET w.processed_by_new = u.user_id;
            
            CALL DropFK('withdrawal_requests', 'processed_by'); 
            ALTER TABLE withdrawal_requests DROP COLUMN processed_by;
            
            ALTER TABLE withdrawal_requests CHANGE COLUMN processed_by_new processed_by VARCHAR(10);
            ALTER TABLE withdrawal_requests ADD CONSTRAINT fk_withdrawal_processed_by FOREIGN KEY (processed_by) REFERENCES users(user_id);
        END IF;
    END IF;

    -- 5. Monthly Profit History
    IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_name = 'monthly_profit_history' AND column_name = 'user_id_new' AND table_schema = DATABASE()) THEN
        IF (SELECT DATA_TYPE FROM information_schema.columns WHERE table_name = 'monthly_profit_history' AND column_name = 'user_id' AND table_schema = DATABASE()) != 'varchar' THEN
            ALTER TABLE monthly_profit_history ADD COLUMN user_id_new VARCHAR(10);
            
            UPDATE monthly_profit_history m JOIN users u ON m.user_id = u.id SET m.user_id_new = u.user_id;
            
            CALL DropFK('monthly_profit_history', 'user_id');
            ALTER TABLE monthly_profit_history DROP COLUMN user_id;
            
            ALTER TABLE monthly_profit_history CHANGE COLUMN user_id_new user_id VARCHAR(10) NOT NULL;
            ALTER TABLE monthly_profit_history ADD CONSTRAINT fk_monthly_history_user_id FOREIGN KEY (user_id) REFERENCES users(user_id);
            
            -- Recreate constraints if needed
            ALTER TABLE monthly_profit_history ADD CONSTRAINT uq_history_user_month_year UNIQUE (user_id, month, year);
        END IF;
    END IF;

    -- 6. Audit Logs (actor_user_id)
    IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'actor_user_id_new' AND table_schema = DATABASE()) THEN
        IF (SELECT DATA_TYPE FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'actor_user_id' AND table_schema = DATABASE()) = 'binary' THEN
            ALTER TABLE audit_logs ADD COLUMN actor_user_id_new VARCHAR(10);
            
            UPDATE audit_logs a LEFT JOIN users u ON a.actor_user_id = u.id SET a.actor_user_id_new = u.user_id;
            
            CALL DropFK('audit_logs', 'actor_user_id');
            ALTER TABLE audit_logs DROP COLUMN actor_user_id;
            
            ALTER TABLE audit_logs CHANGE COLUMN actor_user_id_new actor_user_id VARCHAR(10);
            ALTER TABLE audit_logs ADD CONSTRAINT fk_audit_actor_user_id FOREIGN KEY (actor_user_id) REFERENCES users(user_id);
        END IF;
    END IF;

END //
DELIMITER ;

CALL MigrateToReadableID();

DROP PROCEDURE MigrateToReadableID;
DROP PROCEDURE DropFK;

SET FOREIGN_KEY_CHECKS = 1;
SET SQL_SAFE_UPDATES = 1;
