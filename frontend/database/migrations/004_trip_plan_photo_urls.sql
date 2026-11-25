-- Run after migration 003 to support up to three photo links per plan.
ALTER TABLE ms_trip_plan
  ADD COLUMN IF NOT EXISTS photo_urls JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE ms_trip_plan
SET photo_urls = jsonb_build_array(photo_url)
WHERE photo_url IS NOT NULL
  AND photo_url <> ''
  AND photo_urls = '[]'::jsonb;
