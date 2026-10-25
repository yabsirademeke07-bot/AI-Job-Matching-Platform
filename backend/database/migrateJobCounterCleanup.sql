ALTER TABLE jobs
    DROP COLUMN IF EXISTS views_count,
    DROP COLUMN IF EXISTS vacancy_level;
