import api from './api';

export const SEEKER_ENDPOINTS = {
    profile: '/seeker/profile',
    stats: '/seeker/stats',
    recommendations: '/seeker/recommendations',
    skillGaps: '/seeker/skill-gaps',
};

const mockDashboardData = {
    profile: {
        id: 'demo-seeker',
        name: 'Job Seeker',
        email: '',
        role: 'job_seeker',
        headline: 'Build your profile to get personalized recommendations',
        avatarUrl: '',
        profileCompletion: 0,
        cvScore: 0,
    },
    stats: { matches: 0, applications: 0, interviews: 0, savedJobs: 0 },
    recommendations: [],
    skillGaps: { userSkills: [], missingSkills: [] },
};

const useMockFallback = import.meta.env.VITE_USE_SEEKER_MOCKS !== 'false';

const getData = (response) => response?.data?.data ?? response?.data ?? {};

export const normalizeUser = (profile = {}, sessionUser = {}) => {
    const source = { ...sessionUser, ...profile };
    return {
        id: source.id ?? source._id ?? '',
        name: source.name ?? source.full_name ?? source.fullName ?? source.email ?? 'Job Seeker',
        email: source.email ?? '',
        role: source.role ?? 'job_seeker',
        headline: source.headline ?? source.title ?? '',
        avatarUrl: source.avatarUrl ?? source.avatar_url ?? '',
        profileCompletion: Number(source.profileCompletion ?? source.profile_completion ?? 0),
        cvScore: Number(source.cvScore ?? source.cv_score ?? 0),
    };
};

export const seekerService = {
    async getProfile() {
        const response = await api.get(SEEKER_ENDPOINTS.profile);
        return getData(response);
    },
    async getStats() {
        const response = await api.get(SEEKER_ENDPOINTS.stats);
        return getData(response);
    },
    async getRecommendations() {
        const response = await api.get(SEEKER_ENDPOINTS.recommendations);
        return getData(response);
    },
    async getSkillGaps() {
        const response = await api.get(SEEKER_ENDPOINTS.skillGaps);
        return getData(response);
    },
    async getDashboard() {
        const [profile, stats, recommendations, skillGaps] = await Promise.all([
            this.getProfile(),
            this.getStats(),
            this.getRecommendations(),
            this.getSkillGaps(),
        ]);
        return { profile, stats, recommendations, skillGaps };
    },
};

export const getMockDashboardData = (sessionUser = {}) => ({
    ...mockDashboardData,
    profile: normalizeUser(mockDashboardData.profile, sessionUser),
});

export const shouldUseSeekerMockFallback = () => useMockFallback;
