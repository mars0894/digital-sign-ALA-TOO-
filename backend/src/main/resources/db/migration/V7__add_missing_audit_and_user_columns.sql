-- Add missing columns to audit_logs
ALTER TABLE audit_logs 
ADD COLUMN user_email VARCHAR(255),
ADD COLUMN ip_address VARCHAR(45),
ADD COLUMN success BOOLEAN DEFAULT TRUE;

-- Add missing columns to users
ALTER TABLE users
ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN two_factor_secret VARCHAR(255);

