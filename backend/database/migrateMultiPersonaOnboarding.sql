ALTER TABLE users
    ADD COLUMN IF NOT EXISTS seeker_onboarded BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS employer_onboarded BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS last_active_role ENUM('seeker', 'employer', 'admin') DEFAULT 'seeker';

UPDATE users u
SET seeker_onboarded = TRUE
WHERE u.is_profile_complete = TRUE
   OR u.onboarding_step_completed = 'completed'
   OR EXISTS (
    SELECT 1
    FROM job_seeker_profiles jsp
    WHERE jsp.user_id = u.id
      AND (
          jsp.is_profile_complete = TRUE
          OR jsp.profile_completed = TRUE
          OR jsp.profile_completion_percentage >= 100
          OR jsp.onboarding_step_completed = 'completed'
      )
) OR EXISTS (
    SELECT 1
    FROM cvs c
    JOIN job_seeker_profiles jsp ON jsp.user_id = c.user_id
    WHERE c.user_id = u.id
      AND c.is_active = TRUE
      AND COALESCE(NULLIF(TRIM(jsp.headline), ''), '') <> ''
      AND COALESCE(NULLIF(TRIM(jsp.bio), ''), '') <> ''
      AND COALESCE(NULLIF(TRIM(jsp.location), ''), '') <> ''
      AND COALESCE(NULLIF(TRIM(jsp.city), ''), '') <> ''
);

UPDATE users u
SET employer_onboarded = TRUE
WHERE EXISTS (
    SELECT 1
    FROM company_profiles cp
    WHERE cp.employer_id = u.id
      AND cp.onboarding_completed = TRUE
) OR EXISTS (
    SELECT 1
    FROM employers e
    WHERE (e.user_id = u.id OR e.userId = u.id)
      AND COALESCE(NULLIF(TRIM(e.company_name), ''), '') <> ''
      AND COALESCE(NULLIF(TRIM(e.industry), ''), '') <> ''
      AND COALESCE(NULLIF(TRIM(e.headquarters_location), ''), '') <> ''
) OR EXISTS (
    SELECT 1
    FROM household_employers he
    WHERE he.user_id = u.id
      AND COALESCE(NULLIF(TRIM(he.household_name), ''), '') <> ''
      AND COALESCE(NULLIF(TRIM(he.residence_location), ''), '') <> ''
);

UPDATE users
SET last_active_role = CASE
    WHEN role IN ('admin', 'super_admin') THEN 'admin'
    WHEN role = 'employer' THEN 'employer'
    WHEN last_active_role IS NULL THEN 'seeker'
    ELSE last_active_role
END
WHERE last_active_role IS NULL OR role IN ('admin', 'super_admin', 'employer');
