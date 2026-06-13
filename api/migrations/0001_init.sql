-- Initial schema for the survey builder.
-- Relational model: users own surveys, surveys have ordered questions,
-- public respondents create responses, each holding one answer per question.

CREATE TABLE users (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);

CREATE TABLE surveys (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  primary_color TEXT NOT NULL DEFAULT '#6366f1',
  logo_url      TEXT NOT NULL DEFAULT '',
  -- 'draft' surveys are private; 'published' ones accept public responses.
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

CREATE INDEX idx_surveys_user ON surveys(user_id);

CREATE TABLE questions (
  id        TEXT PRIMARY KEY,
  survey_id TEXT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  type      TEXT NOT NULL CHECK (type IN ('short_text', 'long_text', 'multiple_choice', 'rating')),
  label     TEXT NOT NULL,
  required  INTEGER NOT NULL DEFAULT 0,
  -- 0-based ordering within a survey; the builder controls this on save.
  position  INTEGER NOT NULL,
  -- type-specific settings as JSON: { options: string[] } | { max: number }.
  config    TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_questions_survey ON questions(survey_id);

CREATE TABLE responses (
  id         TEXT PRIMARY KEY,
  survey_id  TEXT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_responses_survey ON responses(survey_id);

CREATE TABLE answers (
  id          TEXT PRIMARY KEY,
  response_id TEXT NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  -- Stored as text: free text, the chosen option, or the rating number.
  value       TEXT NOT NULL DEFAULT ''
);

CREATE INDEX idx_answers_response ON answers(response_id);
CREATE INDEX idx_answers_question ON answers(question_id);
