-- Run this in the Neon SQL Editor only for a fresh database.
-- Existing databases created by the Spring Boot backend already have compatible tables.

CREATE TABLE IF NOT EXISTS ms_user (
  user_id BIGSERIAL PRIMARY KEY,
  user_name VARCHAR(255),
  user_full_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(255),
  website VARCHAR(255),
  password_hash VARCHAR(100),
  last_latitude DOUBLE PRECISION,
  last_longitude DOUBLE PRECISION,
  last_location_updated_at TIMESTAMP,
  created_by VARCHAR(255),
  created_date TIMESTAMP,
  updated_by VARCHAR(255),
  updated_date TIMESTAMP,
  record_status CHAR(1)
);

CREATE TABLE IF NOT EXISTS ms_customer (
  customer_id SERIAL PRIMARY KEY,
  customer_code VARCHAR(255),
  customer_name VARCHAR(255),
  address VARCHAR(255),
  tel_no VARCHAR(255),
  created_by VARCHAR(255),
  created_date TIMESTAMP,
  updated_by VARCHAR(255),
  updated_date TIMESTAMP,
  record_status CHAR(1)
);

CREATE TABLE IF NOT EXISTS ms_trip (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255),
  destination VARCHAR(255),
  date_range VARCHAR(255),
  notes VARCHAR(2000),
  host_user_name VARCHAR(255),
  all_users BOOLEAN DEFAULT FALSE,
  created_by VARCHAR(255),
  created_date TIMESTAMP,
  updated_by VARCHAR(255),
  updated_date TIMESTAMP,
  record_status CHAR(1)
);

CREATE TABLE IF NOT EXISTS ms_trip_user (
  trip_id VARCHAR(255) NOT NULL REFERENCES ms_trip(id) ON DELETE CASCADE,
  user_name VARCHAR(255),
  sort_order INTEGER NOT NULL,
  PRIMARY KEY (trip_id, sort_order)
);

CREATE TABLE IF NOT EXISTS ms_trip_pending_user (
  trip_id VARCHAR(255) NOT NULL REFERENCES ms_trip(id) ON DELETE CASCADE,
  user_name VARCHAR(255),
  sort_order INTEGER NOT NULL,
  PRIMARY KEY (trip_id, sort_order)
);

CREATE TABLE IF NOT EXISTS ms_trip_plan (
  id VARCHAR(255) PRIMARY KEY,
  plan_day VARCHAR(255),
  plan_time VARCHAR(255),
  detail VARCHAR(2000),
  place VARCHAR(255),
  latitude VARCHAR(255),
  longitude VARCHAR(255),
  google_map_url VARCHAR(1000),
  completed BOOLEAN DEFAULT FALSE,
  trip_id VARCHAR(255) NOT NULL REFERENCES ms_trip(id) ON DELETE CASCADE,
  created_date TIMESTAMP,
  updated_date TIMESTAMP,
  record_status CHAR(1)
);

CREATE TABLE IF NOT EXISTS ms_notification (
  id VARCHAR(255) PRIMARY KEY,
  recipient_user_name VARCHAR(255),
  actor_user_name VARCHAR(255),
  trip_id VARCHAR(255),
  trip_name VARCHAR(255),
  type VARCHAR(255),
  message VARCHAR(255),
  read_flag BOOLEAN DEFAULT FALSE,
  created_date TIMESTAMP,
  record_status CHAR(1)
);

CREATE INDEX IF NOT EXISTS ms_user_active_search_idx ON ms_user (record_status, user_name);
CREATE INDEX IF NOT EXISTS ms_trip_active_search_idx ON ms_trip (record_status, created_date DESC);
CREATE INDEX IF NOT EXISTS ms_trip_plan_trip_idx ON ms_trip_plan (trip_id, record_status, created_date);
CREATE INDEX IF NOT EXISTS ms_notification_recipient_idx ON ms_notification (recipient_user_name, record_status, created_date DESC);
