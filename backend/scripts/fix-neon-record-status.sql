-- Make manually inserted rows visible to APIs that filter active records.
UPDATE ms_user SET record_status = 'A' WHERE record_status IS NULL;
UPDATE ms_customer SET record_status = 'A' WHERE record_status IS NULL;
UPDATE ms_trip SET record_status = 'A' WHERE record_status IS NULL;
UPDATE ms_trip_plan SET record_status = 'A' WHERE record_status IS NULL;

ALTER TABLE ms_user ALTER COLUMN record_status SET DEFAULT 'A';
ALTER TABLE ms_customer ALTER COLUMN record_status SET DEFAULT 'A';
ALTER TABLE ms_trip ALTER COLUMN record_status SET DEFAULT 'A';
ALTER TABLE ms_trip_plan ALTER COLUMN record_status SET DEFAULT 'A';
