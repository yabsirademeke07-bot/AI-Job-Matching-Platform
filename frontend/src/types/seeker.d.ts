export type UserRole = 'job_seeker' | 'seeker' | 'jobseeker' | 'user' | 'employer' | 'admin' | string;

export interface User {
    id: string | number;
    name: string;
    email: string;
    role: UserRole;
    headline: string;
    avatarUrl: string;
    profileCompletion: number;
    cvScore: number;
}

export interface SeekerStats {
    matches: number;
    applications: number;
    interviews: number;
    savedJobs: number;
    applicationsList?: Array<Record<string, unknown>>;
}

export interface SkillGaps {
    userSkills: string[];
    missingSkills: Array<{ name: string; demand?: string; impact?: string }>;
}
