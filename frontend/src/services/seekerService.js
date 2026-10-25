import api from './api';

const getData = (response) => response?.data?.data ?? response?.data ?? {};

export const normalizeUser = (profile = {}, sessionUser = {}) => {
    const source = { ...sessionUser, ...profile };
    return {
        id: source.id ?? source.user_id ?? source._id ?? '',
        name: source.name ?? source.full_name ?? source.fullName ?? source.email ?? '',
        email: source.email ?? '',
        role: source.role ?? '',
        headline: source.headline ?? source.title ?? '',
        avatarUrl: source.avatarUrl ?? source.avatar_url ?? '',
        profileCompletion: Number(source.profileCompletion ?? source.completionPercentage ?? source.profile_completion ?? 0),
        cvScore: Number(source.cvScore ?? source.cv_score ?? 0),
    };
};

export const seekerService = {
    async getProfile() {
        const response = await api.get('/seeker/profile/full');
        return getData(response).profile || {};
    },
    async getApplications() {
        const response = await api.get('/seeker/applications');
        return Array.isArray(getData(response).applications) ? getData(response).applications : [];
    },
    async getRecommendations() {
        const response = await api.get('/seeker/matched-jobs', { params: { all: 'true' } });
        return Array.isArray(getData(response).jobs) ? getData(response).jobs : [];
    },
    async getDashboard() {
        const [profile, applications, recommendations] = await Promise.all([
            this.getProfile(),
            this.getApplications(),
            this.getRecommendations(),
        ]);
        return {
            profile,
            stats: {
                applications: applications.length,
                matches: recommendations.length,
                interviews: applications.filter((application) => String(application.interview_status || '').toLowerCase() === 'scheduled').length,
            },
            applications,
            recommendations,
            skillGaps: { userSkills: [], missingSkills: [] },
        };
    },
};
