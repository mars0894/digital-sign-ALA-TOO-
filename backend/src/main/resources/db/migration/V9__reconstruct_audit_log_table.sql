-- Drop legacy audit_logs table to resolve schema conflicts
DROP TABLE IF EXISTS audit_logs CASCADE;

-- Recreate audit_logs table with forensic-ready schema
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    username VARCHAR(255) NOT NULL,
    target_id VARCHAR(255),
    success BOOLEAN NOT NULL,
    details VARCHAR(1000),
    ip_address VARCHAR(45), -- Supports IPv6
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add index on username and timestamp for faster audit searching
CREATE INDEX idx_audit_username ON audit_logs(username);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
