ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS domain_match_score DECIMAL(5, 2) NULL,
  ADD COLUMN IF NOT EXISTS soft_skills_match_score DECIMAL(5, 2) NULL;
