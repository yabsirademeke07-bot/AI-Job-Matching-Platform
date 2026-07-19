CREATE DATABASE IF NOT EXISTS job_matching;

USE job_matching;
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'employer', 'job_seeker') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);