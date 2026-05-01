-- Migration 001: initial schema

CREATE TABLE IF NOT EXISTS app_state (
  id          INTEGER PRIMARY KEY CHECK (id = 1),
  data_json   TEXT    NOT NULL,
  updated_at  TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS presets (
  id          TEXT    PRIMARY KEY,
  name        TEXT    NOT NULL,
  label       TEXT    NOT NULL,
  data_json   TEXT    NOT NULL
);
