-- Update the tickets table status field to include 'resolved' status
ALTER TABLE tickets
DROP CONSTRAINT IF EXISTS tickets_status_check;

ALTER TABLE tickets
ADD CONSTRAINT tickets_status_check
CHECK (status IN ('new', 'assigned', 'in-progress', 'resolved', 'open')); 