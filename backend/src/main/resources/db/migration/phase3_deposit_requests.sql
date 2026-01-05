-- Create deposit_requests table
CREATE TABLE IF NOT EXISTS deposit_requests (
    id BINARY(16) PRIMARY KEY,
    user_id BINARY(16) NOT NULL,
    amount DECIMAL(19,4) NOT NULL,
    proof_image_path VARCHAR(500),
    user_note TEXT,
    admin_note TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
