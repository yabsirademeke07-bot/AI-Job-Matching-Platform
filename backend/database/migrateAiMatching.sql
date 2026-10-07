ALTER TABLE applications
  ADD COLUMN ai_match_summary TEXT NULL AFTER ai_recommendation,
  ADD COLUMN ai_strengths JSON NULL AFTER ai_match_summary,
  ADD COLUMN ai_missing_skills JSON NULL AFTER ai_strengths,
  ADD COLUMN evaluated_at DATETIME NULL AFTER ai_missing_skills,
  ADD INDEX idx_job_ai_match_score (job_id, ai_match_score DESC);