-- Run this once in the Neon SQL Editor for databases created before plan photo links were saved.
ALTER TABLE ms_trip_plan
  ADD COLUMN IF NOT EXISTS photo_url VARCHAR(1000);
