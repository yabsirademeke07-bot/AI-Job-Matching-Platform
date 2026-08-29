const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const defaultProfile = {
  id: 'user-001',
  name: 'Amanuel D.',
  headline: 'Product Engineer / Full-Stack Builder',
  email: 'amanuel@example.com',
  phone: '+251 911 234 567',
  location: 'Addis Ababa, Ethiopia',
  availability: 'Open to roles',
  bio: 'I build polished digital products that connect user needs with scalable engineering.',
  avatarUrl: '',
  skills: {
    frontend: ['JavaScript', 'React', 'TypeScript', 'Tailwind CSS'],
    backend: ['Node.js', 'Python', 'MySQL', 'PostgreSQL'],
    ai: ['LLM Integration', 'Prompt Engineering', 'AI Agents'],
    soft: ['Communication', 'System Design', 'Product Thinking'],
  },
};

const defaultExperience = [
  {
    id: 'exp-1',
    company: 'Beti',
    role: 'Frontend Engineer',
    period: '2024 — Present',
    summary: 'Built responsive customer-facing flows and polished product experiences.',
  },
  {
    id: 'exp-2',
    company: 'Amanu Labs',
    role: 'Product Engineer',
    period: '2022 — 2024',
    summary: 'Delivered full-stack product features with strong engineering and product thinking.',
  },
];

const defaultProjects = [
  {
    id: 'proj-1',
    title: 'AI Hiring Copilot',
    description: 'An AI-powered hiring workflow dashboard for job matching and automation.',
    stack: ['React', 'Node.js', 'OpenAI'],
    demoUrl: 'https://example.com/demo',
    githubUrl: 'https://github.com/example/hiring-copilot',
  },
  {
    id: 'proj-2',
    title: 'SaaS Analytics Platform',
    description: 'A business intelligence dashboard built for internal operational reporting.',
    stack: ['React', 'PostgreSQL', 'Python'],
    demoUrl: 'https://example.com/analytics',
    githubUrl: 'https://github.com/example/analytics-dashboard',
  },
];

 const defaultRecommendedJobs = [
  { id: 'job-1', title: 'Senior Frontend Engineer', company: 'Beti Labs', matchScore: 96, location: 'Remote', salary: '$2,500 - $3,200 / mo' },
  { id: 'job-2', title: 'Full Stack Product Engineer', company: 'Amanu Digital', matchScore: 92, location: 'Hybrid', salary: '$2,200 - $2,900 / mo' },
  { id: 'job-3', title: 'React Developer', company: 'NexaWorks', matchScore: 88, location: 'On-site', salary: '$1,800 - $2,300 / mo' },
];

const defaultApplications = [
  { id: 'app-1', company: 'Beti', role: 'Frontend Engineer', status: 'Interview' },
  { id: 'app-2', company: 'Amanu Labs', role: 'Product Engineer', status: 'Shortlisted' },
  { id: 'app-3', company: 'NexaWorks', role: 'AI Product Engineer', status: 'Applied' },
];

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

async function request(endpoint, options = {}, fallback) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        Accept: 'application/json',
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(options.headers || {}),
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    return contentType.includes('application/json') ? await response.json() : await response.text();
  } catch (error) {
    if (typeof fallback === 'function') {
      return fallback();
    }
    if (fallback !== undefined) {
      return fallback;
    }
    throw error;
  }
}

export const seekerApi = {
  getProfile: async (userId) => request(`/seekers/${userId}`, {}, () => readStorage('seekerProfile', defaultProfile)),
  updateProfile: async (userId, data) => {
    const payload = { ...readStorage('seekerProfile', defaultProfile), ...data };
    localStorage.setItem('seekerProfile', JSON.stringify(payload));
    return request(`/seekers/${userId}`, { method: 'PUT', body: JSON.stringify(data) }, payload);
  },
  updateStatus: async (userId, status) => {
    const payload = { availability: status };
    const profile = { ...readStorage('seekerProfile', defaultProfile), ...payload };
    localStorage.setItem('seekerProfile', JSON.stringify(profile));
    return request(`/seekers/${userId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, payload);
  },

  getExperience: async (userId) => request(`/seekers/${userId}/experience`, {}, () => readStorage('seekerExperience', defaultExperience)),
  updateSkills: async (userId, skills) => {
    const profile = { ...readStorage('seekerProfile', defaultProfile), skills };
    localStorage.setItem('seekerProfile', JSON.stringify(profile));
    return request(`/seekers/${userId}/skills`, { method: 'PUT', body: JSON.stringify(skills) }, profile.skills);
  },

  getProjects: async (userId) => request(`/seekers/${userId}/projects`, {}, () => readStorage('seekerProjects', defaultProjects)),
  addProject: async (userId, projectData) => {
    const next = [...readStorage('seekerProjects', defaultProjects), { id: `proj-${Date.now()}`, ...projectData }];
    localStorage.setItem('seekerProjects', JSON.stringify(next));
    return request(`/seekers/${userId}/projects`, { method: 'POST', body: JSON.stringify(projectData) }, next);
  },

  getRecommendedJobs: async (userId) => request(`/seekers/${userId}/recommendations`, {}, () => readStorage('seekerRecommendedJobs', defaultRecommendedJobs)),
  saveCandidateProfile: async (profile) => {
    localStorage.setItem('candidateProfile', JSON.stringify(profile));
    return request('/candidate/profile', { method: 'POST', body: JSON.stringify(profile) }, profile);
  },
  getRecommendedJobsForCandidate: async () => request('/candidate/recommended-jobs', {}, () => readStorage('seekerRecommendedJobs', defaultRecommendedJobs)),
  quickApplyWithProfile: async (jobId) => request('/candidate/quick-apply', { method: 'POST', body: JSON.stringify({ jobId }) }, { jobId, appliedAt: new Date().toISOString() }),
  getApplications: async (userId) => request(`/seekers/${userId}/applications`, {}, () => readStorage('seekerApplications', defaultApplications)),
  applyForJob: async (jobId, applicationPayload) => request(`/jobs/${jobId}/apply`, { method: 'POST', body: JSON.stringify(applicationPayload) }, { jobId, ...applicationPayload, appliedAt: new Date().toISOString() }),
  getRecentApplications: async (userId) => request(`/seekers/${userId}/applications`, {}, () => readStorage('seekerApplications', defaultApplications)),
  getConversations: async () => request('/messages/conversations', {}, () => readStorage('seekerConversations', [])),
  sendMessage: async (contactPayload) => request('/messages/send', { method: 'POST', body: JSON.stringify(contactPayload) }, { ok: true, sentAt: new Date().toISOString(), payload: contactPayload }),
  getNotifications: async () => request('/notifications', {}, () => readStorage('seekerNotifications', [])),
  markAsRead: async (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }, { id, read: true }),
  runPromptTest: async (promptPayload) => request('/ai/prompt-studio/test', { method: 'POST', body: JSON.stringify(promptPayload) }, {
    ok: true,
    response: `Prompt tested successfully. Suggested improvement: tighten the response format and include a measurable success criterion.`,
    prompt: promptPayload,
  }),
};

export default seekerApi;
