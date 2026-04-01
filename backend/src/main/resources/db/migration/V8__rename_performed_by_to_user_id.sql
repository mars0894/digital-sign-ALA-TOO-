-- Rename performed_by to user_id to match AuditLog entity JoinColumn
ALTER TABLE audit_logs
RENAME COLUMN performed_by TO user_id;
