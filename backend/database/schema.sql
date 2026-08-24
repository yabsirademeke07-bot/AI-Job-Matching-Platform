CREATE DATABASE IF NOT EXISTS job_matching;
USE job_matching;

-- MySQL Strict Mode ገደቦችን ለማስወገድ
SET SQL_MODE = '';

-- ============================================================================
-- CORE AUTHENTICATION & USER MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password VARCHAR(255),
    role ENUM('admin', 'employer', 'job_seeker') NOT NULL DEFAULT 'job_seeker',
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    profile_picture_url VARCHAR(255),
    bio TEXT,
    preferred_language VARCHAR(20) DEFAULT 'en',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
);

-- Job Seeker Profiles
CREATE TABLE IF NOT EXISTS job_seeker_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    headline VARCHAR(150),
    bio TEXT,
    location VARCHAR(100),
    country VARCHAR(100),
    city VARCHAR(100),
    state_province VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    preferred_job_type ENUM('full-time', 'part-time', 'contract', 'freelance', 'internship') DEFAULT 'full-time',
    preferred_work_mode ENUM('on-site', 'remote', 'hybrid') DEFAULT 'hybrid',
    salary_expectation_min INT,
    salary_expectation_max INT,
    currency VARCHAR(5) DEFAULT 'USD',
    is_available BOOLEAN DEFAULT TRUE,
    profile_completion_percentage INT DEFAULT 0,
    is_open_to_opportunities BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_location (location),
    INDEX idx_availability (is_available)
);

-- Job Seeker Education
CREATE TABLE IF NOT EXISTS seeker_education (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    school_name VARCHAR(150) NOT NULL,
    degree VARCHAR(100) NOT NULL,
    field_of_study VARCHAR(100) NOT NULL,
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
);

-- Job Seeker Experience
CREATE TABLE IF NOT EXISTS seeker_experience (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    company_name VARCHAR(150) NOT NULL,
    job_title VARCHAR(100) NOT NULL,
    employment_type ENUM('full-time', 'part-time', 'contract', 'temporary', 'internship', 'freelance', 'self-employed') NOT NULL,
    location VARCHAR(100),
    start_date DATE NOT NULL,
    end_date DATE,
    is_current BOOLEAN DEFAULT FALSE,
    description TEXT,
    years_of_experience INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
);

-- Job Seeker Skills
CREATE TABLE IF NOT EXISTS seeker_skills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    skill_name VARCHAR(100) NOT NULL,
    skill_category VARCHAR(50),
    proficiency_level ENUM('beginner', 'intermediate', 'advanced', 'expert') DEFAULT 'intermediate',
    years_of_experience INT,
    is_endorsable BOOLEAN DEFAULT TRUE,
    endorsement_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_skill (user_id, skill_name),
    INDEX idx_skill_name (skill_name)
);

-- Job Seeker Languages
CREATE TABLE IF NOT EXISTS seeker_languages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    language_name VARCHAR(50) NOT NULL,
    proficiency ENUM('elementary', 'limited-working', 'professional-working', 'full-professional', 'native') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_language (user_id, language_name)
);

-- ============================================================================
-- CV MANAGEMENT & AI ANALYSIS
-- ============================================================================

CREATE TABLE IF NOT EXISTS cvs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(255) NOT NULL,
    file_size INT,
    mime_type VARCHAR(50),
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    parsed_text LONGTEXT,
    ai_analysis_score DECIMAL(5, 2),
    ai_extracted_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_is_primary (is_primary)
);

-- CV Analysis Results
CREATE TABLE IF NOT EXISTS cv_analysis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cv_id INT NOT NULL,
    extracted_skills JSON,
    extracted_experience JSON,
    extracted_education JSON,
    extracted_languages JSON,
    extracted_certifications JSON,
    cv_score DECIMAL(5, 2),
    readability_score DECIMAL(5, 2),
    keyword_match_score DECIMAL(5, 2),
    recommendations JSON,
    analysis_status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    analyzed_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cv_id) REFERENCES cvs(id) ON DELETE CASCADE,
    UNIQUE KEY unique_cv_analysis (cv_id)
);

-- ============================================================================
-- EMPLOYER & COMPANY MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employer_id INT NOT NULL UNIQUE,
    company_name VARCHAR(150) NOT NULL,
    company_registration_number VARCHAR(50) UNIQUE,
    industry VARCHAR(100),
    company_size ENUM('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+') DEFAULT '11-50',
    website VARCHAR(255),
    logo_url VARCHAR(255),
    description TEXT,
    location VARCHAR(100),
    country VARCHAR(100),
    city VARCHAR(100),
    state_province VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    employee_count INT,
    founded_year YEAR,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
    verified_at TIMESTAMP NULL DEFAULT NULL,
    social_media_urls JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employer_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_verified (is_verified)
);

-- Company Verification Requests
CREATE TABLE IF NOT EXISTS company_verification_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    verification_document_url VARCHAR(255),
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL DEFAULT NULL,
    reviewed_by INT,
    rejection_reason TEXT,
    FOREIGN KEY (company_id) REFERENCES company_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id),
    INDEX idx_status (status)
);

-- ============================================================================
-- JOB MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employer_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    slug VARCHAR(200) UNIQUE,
    description LONGTEXT NOT NULL,
    category VARCHAR(100),
    job_type ENUM('full-time', 'part-time', 'contract', 'temporary', 'internship', 'freelance', 'self-employed') NOT NULL,
    experience_level ENUM('entry-level', 'mid-level', 'senior-level', 'executive') DEFAULT 'mid-level',
    location VARCHAR(100),
    country VARCHAR(100),
    city VARCHAR(100),
    state_province VARCHAR(100),
    work_mode ENUM('on-site', 'remote', 'hybrid') DEFAULT 'hybrid',
    salary_min INT,
    salary_max INT,
    currency VARCHAR(5) DEFAULT 'USD',
    salary_period ENUM('hourly', 'monthly', 'yearly') DEFAULT 'yearly',
    is_salary_negotiable BOOLEAN DEFAULT TRUE,
    benefits TEXT,
    required_education ENUM('high-school', 'associate', 'bachelor', 'master', 'phd', 'any') DEFAULT 'bachelor',
    years_of_experience_min INT DEFAULT 0,
    years_of_experience_max INT DEFAULT 20,
    application_deadline DATE,
    is_urgent BOOLEAN DEFAULT FALSE,
    status ENUM('draft', 'published', 'closed', 'filled', 'archived') DEFAULT 'draft',
    is_featured BOOLEAN DEFAULT FALSE,
    featured_until DATETIME,
    view_count INT DEFAULT 0,
    application_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    published_at TIMESTAMP NULL DEFAULT NULL,
    closed_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (employer_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_country_city (country, city),
    INDEX idx_salary (salary_min, salary_max),
    FULLTEXT INDEX ft_title_desc (title, description)
);

-- Job Required Skills
CREATE TABLE IF NOT EXISTS job_required_skills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id INT NOT NULL,
    skill_name VARCHAR(100) NOT NULL,
    proficiency_level ENUM('beginner', 'intermediate', 'advanced', 'expert') DEFAULT 'intermediate',
    is_must_have BOOLEAN DEFAULT FALSE,
    skill_weight INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    UNIQUE KEY unique_job_skill (job_id, skill_name)
);

-- Job Required Languages
CREATE TABLE IF NOT EXISTS job_required_languages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id INT NOT NULL,
    language_name VARCHAR(50) NOT NULL,
    proficiency ENUM('elementary', 'limited-working', 'professional-working', 'full-professional', 'native') NOT NULL,
    is_must_have BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    UNIQUE KEY unique_job_language (job_id, language_name)
);

-- ============================================================================
-- APPLICATIONS & MATCHING
-- ============================================================================

CREATE TABLE IF NOT EXISTS applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id INT NOT NULL,
    job_seeker_id INT NOT NULL,
    cv_id INT,
    status ENUM('applied', 'under-review', 'shortlisted', 'rejected', 'interview-scheduled', 'offered', 'hired', 'withdrawn') DEFAULT 'applied',
    application_status_flow JSON,
    ai_match_score DECIMAL(5, 2),
    skills_match_score DECIMAL(5, 2),
    experience_match_score DECIMAL(5, 2),
    education_match_score DECIMAL(5, 2),
    location_match_score DECIMAL(5, 2),
    salary_match_score DECIMAL(5, 2),
    work_mode_match_score DECIMAL(5, 2),
    language_match_score DECIMAL(5, 2),
    job_type_match_score DECIMAL(5, 2),
    employer_notes TEXT,
    seeker_cover_letter TEXT,
    ai_recommendation TEXT,
    rank_position INT,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (job_seeker_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (cv_id) REFERENCES cvs(id),
    INDEX idx_job_id (job_id),
    INDEX idx_seeker_id (job_seeker_id),
    INDEX idx_status (status),
    INDEX idx_ai_score (ai_match_score)
);

-- Skill Gaps
CREATE TABLE IF NOT EXISTS skill_gaps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    missing_skill VARCHAR(100) NOT NULL,
    skill_importance ENUM('critical', 'high', 'medium', 'low') DEFAULT 'medium',
    recommended_learning_resources JSON,
    estimated_learning_time_hours INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    INDEX idx_app_id (application_id)
);

-- Saved/Bookmarked Jobs
CREATE TABLE IF NOT EXISTS saved_jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    job_id INT NOT NULL,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    note TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_job (user_id, job_id),
    INDEX idx_user_id (user_id)
);

-- ============================================================================
-- INTERVIEW MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS interviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL UNIQUE,
    interview_type ENUM('phone', 'video', 'in-person', 'coding-test') DEFAULT 'video',
    scheduled_at DATETIME NOT NULL,
    duration_minutes INT DEFAULT 60,
    interview_url VARCHAR(255),
    interview_status ENUM('scheduled', 'in-progress', 'completed', 'rescheduled', 'cancelled') DEFAULT 'scheduled',
    interviewer_id INT,
    notes TEXT,
    interviewer_feedback TEXT,
    interview_score DECIMAL(5, 2),
    completed_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    FOREIGN KEY (interviewer_id) REFERENCES users(id),
    INDEX idx_status (interview_status)
);

-- Interview Questions
CREATE TABLE IF NOT EXISTS interview_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    interview_id INT NOT NULL,
    question_text TEXT NOT NULL,
    question_type ENUM('open-ended', 'technical', 'behavioral', 'coding') DEFAULT 'open-ended',
    ai_prepared BOOLEAN DEFAULT FALSE,
    question_order INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE
);

-- Interview Answers & AI Evaluation
CREATE TABLE IF NOT EXISTS interview_answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    interview_question_id INT NOT NULL,
    answer_text TEXT,
    answer_video_url VARCHAR(255),
    ai_evaluation_score DECIMAL(5, 2),
    ai_feedback TEXT,
    interviewer_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (interview_question_id) REFERENCES interview_questions(id) ON DELETE CASCADE
);

-- ============================================================================
-- MESSAGING & COMMUNICATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id INT,
    employer_id INT NOT NULL,
    job_seeker_id INT NOT NULL,
    subject VARCHAR(255),
    status ENUM('active', 'archived', 'closed') DEFAULT 'active',
    last_message_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL,
    FOREIGN KEY (employer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (job_seeker_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_participants (employer_id, job_seeker_id),
    INDEX idx_status (status)
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    sender_id INT NOT NULL,
    message_text TEXT NOT NULL,
    attachment_url VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_is_read (is_read)
);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('job-match', 'application-status', 'shortlisted', 'interview-scheduled', 'new-message', 'ai-recommendation', 'job-alert', 'company-update') DEFAULT 'job-match',
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    related_job_id INT,
    related_application_id INT,
    related_user_id INT,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL DEFAULT NULL,
    action_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (related_job_id) REFERENCES jobs(id) ON DELETE SET NULL,
    FOREIGN KEY (related_application_id) REFERENCES applications(id) ON DELETE SET NULL,
    FOREIGN KEY (related_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_unread (user_id, is_read),
    INDEX idx_type (type)
);

-- Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    email_job_matches BOOLEAN DEFAULT TRUE,
    email_application_updates BOOLEAN DEFAULT TRUE,
    email_messages BOOLEAN DEFAULT TRUE,
    email_interviews BOOLEAN DEFAULT TRUE,
    email_ai_recommendations BOOLEAN DEFAULT TRUE,
    push_notifications_enabled BOOLEAN DEFAULT TRUE,
    daily_digest BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================================
-- ADMIN & SYSTEM MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_actions_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    action_type ENUM('user-blocked', 'user-unblocked', 'job-removed', 'company-verified', 'company-rejected', 'report-reviewed', 'content-moderated') NOT NULL,
    target_user_id INT,
    target_job_id INT,
    target_company_id INT,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (target_job_id) REFERENCES jobs(id) ON DELETE SET NULL,
    INDEX idx_created_at (created_at)
);

-- Reports
CREATE TABLE IF NOT EXISTS reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reporter_id INT NOT NULL,
    reported_user_id INT,
    reported_job_id INT,
    report_type ENUM('inappropriate-content', 'spam', 'fraud', 'offensive-language', 'other') NOT NULL,
    description TEXT NOT NULL,
    status ENUM('pending', 'under-review', 'resolved', 'dismissed') DEFAULT 'pending',
    resolution_notes TEXT,
    resolved_by INT,
    resolved_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (reported_job_id) REFERENCES jobs(id) ON DELETE SET NULL,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status)
);

-- Blocked Users
CREATE TABLE IF NOT EXISTS blocked_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    blocked_by_id INT NOT NULL,
    blocked_user_id INT NOT NULL,
    reason TEXT,
    blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unblocked_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (blocked_by_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (blocked_user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_block (blocked_by_id, blocked_user_id),
    INDEX idx_blocked_user_id (blocked_user_id)
);

-- System Settings
CREATE TABLE IF NOT EXISTS system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================================
-- ACTIVITY & ANALYTICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    activity_type ENUM('login', 'profile-update', 'job-view', 'job-apply', 'profile-view', 'message-sent', 'cv-upload') NOT NULL,
    related_job_id INT,
    related_user_id INT,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (related_job_id) REFERENCES jobs(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
);

-- Job Analytics
CREATE TABLE IF NOT EXISTS job_analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id INT NOT NULL UNIQUE,
    total_views INT DEFAULT 0,
    total_applications INT DEFAULT 0,
    total_shortlisted INT DEFAULT 0,
    total_interviews INT DEFAULT 0,
    average_match_score DECIMAL(5, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- OTP Storage
CREATE TABLE IF NOT EXISTS otps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    otp_code VARCHAR(10) NOT NULL,
    purpose ENUM('registration', 'password-reset', 'email-verification') DEFAULT 'registration',
    is_used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email_expires (email, expires_at)
);

COMMIT;