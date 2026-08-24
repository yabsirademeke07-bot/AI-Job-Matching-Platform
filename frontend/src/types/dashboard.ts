export interface UserProfile {
  id: string;
  name: string;
  email: string;
  headline: string;
  avatarUrl?: string;
  profileCompletion: number;
  cvReviewScore: number;
}

export interface ApplicationStats {
  total: number;
  pending: number;
  shortlisted: number;
  interviewScheduled: number;
  hired: number;
}

export interface JobMatch {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  matchScore: number;
  reasons: string[];
  tags: string[];
}

export type ApplicationStatus = 'Pending' | 'Shortlisted' | 'Interview Scheduled' | 'Hired' | 'Rejected';

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  appliedDate: string;
  status: ApplicationStatus;
  location?: string;
}

export type InterviewFormat = 'Video' | 'In-person';

export interface UpcomingInterview {
  id: string;
  jobTitle: string;
  company: string;
  date: string;
  time: string;
  format: InterviewFormat;
  interviewerName: string;
  interviewerRole: string;
  meetingUrl?: string;
  employerNotes?: string;
}

export interface RecommendedJob {
  id: string;
  title: string;
  company: string;
  salary: string;
  location: string;
  tags: string[];
  postedAt: string;
}

export interface DashboardSummary {
  profile: UserProfile;
  stats: ApplicationStats;
}
