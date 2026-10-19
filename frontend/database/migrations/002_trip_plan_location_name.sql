-- Run this once in the Neon SQL Editor for databases created before location names were saved.
ALTER TABLE ms_trip_plan
  ADD COLUMN IF NOT EXISTS location_name VARCHAR(500);
