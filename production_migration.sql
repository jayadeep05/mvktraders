-- =========================================================================
-- Production Database Migration Script
-- Generated for Booku / Investment Analytics Platform
-- Date: 2026-01-05
-- =========================================================================

-- 1. Update 'users' table with new Business ID and Mediator fields
-- -------------------------------------------------------------------------
-- Add Sequential ID for generating "SMxxxx" IDs
ALTER TABLE users ADD COLUMN n_id BIGINT NULL;
ALTER TABLE users ADD CONSTRAINT uk_users_n_id UNIQUE (n_id);

-- Add the public-facing Business ID (e.g., "SM0001", "MVK005")
ALTER TABLE users ADD COLUMN user_id VARCHAR(20) NULL;
ALTER TABLE users ADD CONSTRAINT uk_users_user_id UNIQUE (user_id);

-- Add Mediator Relationship (Self-referencing Foreign Key)
ALTER TABLE users ADD COLUMN mediator_id BINARY(16) NULL;
ALTER TABLE users ADD CONSTRAINT fk_users_mediator FOREIGN KEY (mediator_id) REFERENCES users(id);

-- Add Soft Deletion auditing fields
ALTER TABLE users ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN deleted_at DATETIME(6) NULL;
ALTER TABLE users ADD COLUMN deleted_by VARCHAR(255) NULL;


-- 2. Create 'payout_requests' table (New Feature)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payout_requests (
    id BINARY(16) NOT NULL,
    amount DECIMAL(19,4) NOT NULL,
    status VARCHAR(20) NOT NULL,
    note VARCHAR(1000),
    rejection_reason VARCHAR(500),
    processed_by VARCHAR(50),
    transaction_id_reference VARCHAR(100),
    created_at DATETIME(6),
    updated_at DATETIME(6),
    processed_at DATETIME(6),
    user_id BINARY(16) NOT NULL, -- Links to users.id (UUID)
    PRIMARY KEY (id),
    CONSTRAINT fk_payout_user FOREIGN KEY (user_id) REFERENCES users (id)
);


-- 3. Create 'delete_requests' table (New Feature)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS delete_requests (
    id BINARY(16) NOT NULL,
    entity_id BINARY(16) NOT NULL,   -- The ID of the Client/Mediator to delete
    entity_type VARCHAR(255) NOT NULL, -- 'CLIENT' or 'MEDIATOR'
    status VARCHAR(255) NOT NULL,
    reason VARCHAR(255),
    created_at DATETIME(6),
    updated_at DATETIME(6),
    requested_by BINARY(16),
    PRIMARY KEY (id),
    CONSTRAINT fk_delete_requester FOREIGN KEY (requested_by) REFERENCES users (id)
);


-- 4. Verify Transaction Request Tables (Critical)
-- -------------------------------------------------------------------------
-- WARNING: Ensure your existing data is compatible before running these.
-- These tables now map to the String 'user_id' (e.g. "SM0001") instead of the UUID 'id'.

-- Check if columns match expected types (VARCHAR for user_id)
-- If they are currently BINARY(16)/UUID, you may need to migrate data first.

-- ALTER TABLE deposit_requests MODIFY COLUMN user_id VARCHAR(20);
-- ALTER TABLE withdrawal_requests MODIFY COLUMN user_id VARCHAR(20);
