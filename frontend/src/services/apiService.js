const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const defaultProfile = {
  id: 'user-001',
  name: 'Amanuel D.',
  headline: 'Product Engineer • full-stack builder • AI-ready problem solver',
  role: 'Product Engineer',
  email: 'amanuel@example.com',
  phone: '+251 911 234 567',
  location: 'Addis Ababa, Ethiopia',
  availability: 'Open to roles',
  availabilityStatus: 'Open to roles',
  bio: 'I build polished digital products that connect user needs with scalable engineering.',
  avatarUrl: '',
  skills: {
    frontend: ['JavaScript', 'React', 'TypeScript', 'Tailwind CSS'],
    backend: ['Node.js', 'Python', 'MySQL', 'PostgreSQL'],
    ai: ['Gemini API', 'LangChain', 'PyTorch', 'Prompt Engineering'],
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
    tech: ['React', 'TypeScript', 'Tailwind'],
    verified: true,
  },
  {
    id: 'exp-2',
    company: 'Amanu Labs',
    role: 'Product Engineer',
    period: '2022 — 2024',
    summary: 'Delivered full-stack product features with strong engineering and product thinking.',
    tech: ['Node.js', 'MySQL', 'React'],
    verified: true,
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

const defaultConversations = [
  {
    id: 'conversation-501',
    companyName: 'Blue Nile Tech',
    employerName: 'Hiring Team',
    jobTitle: 'Frontend Developer',
    lastMessage: 'We would like to discuss your application.',
    lastMessageTime: '10:30 AM',
    unreadCount: 2,
    messages: [
      { id: 'message-1', sender: 'employer', text: 'Hello, we reviewed your application.', time: '10:20 AM' },
      { id: 'message-2', sender: 'seeker', text: 'Thank you for the update.', time: '10:24 AM' },
      { id: 'message-3', sender: 'employer', text: 'We would like to discuss your application.', time: '10:30 AM' },
    ],
  },
  {
    id: 'conversation-502',
    companyName: 'ABC Company',
    employerName: 'Talent Team',
    jobTitle: 'Backend Developer',
    lastMessage: 'Thank you for your application.',
    lastMessageTime: 'Yesterday',
    unreadCount: 0,
    messages: [
      { id: 'message-4', sender: 'employer', text: 'Thank you for your application. Our team will be in touch soon.', time: 'Yesterday' },
    ],
  },
];

const defaultNotifications = [
  {
    id: 'notify-1',
    type: 'application',
    title: 'Application updated',
    message: 'Your application for Frontend Engineer at Beti is now in Interview stage.',
    read: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'notify-2',
    type: 'message',
    title: 'New message',
    message: 'Blue Nile Tech sent you a follow-up message.',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
];

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures in browser-restricted environments.
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
    if (contentType.includes('application/json')) {
      return await response.json();
    }

    return await response.text();
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

export async function getSeekerProfile(id = 'user-001') {
  return request(`/seekers/${id}`, {}, () => readStorage('seekerProfile', defaultProfile));
}

export async function updateSeekerProfile(id = 'user-001', data = {}) {
  const current = readStorage('seekerProfile', defaultProfile);
  const next = { ...current, ...data, id: id || current.id };
  writeStorage('seekerProfile', next);
  return request(`/seekers/${id}`, { method: 'PUT', body: JSON.stringify(data) }, next);
}

export async function updateSeekerStatus(status = 'Open to roles') {
  const current = readStorage('seekerProfile', defaultProfile);
  const next = {
    ...current,
    availability: status,
    availabilityStatus: status,
  };
  writeStorage('seekerProfile', next);
  return request('/seekers/status', { method: 'PATCH', body: JSON.stringify({ status }) }, next);
}

export async function getRecommendedJobs(skills = []) {
  const items = readStorage('seekerRecommendedJobs', defaultRecommendedJobs);
  return request('/seekers/recommendations', {}, items.filter((job) => {
    if (!skills.length) return true;
    const candidateSkills = skills.map((skill) => String(skill).toLowerCase());
    return candidateSkills.some((skill) => job.title.toLowerCase().includes(skill) || (job.company || '').toLowerCase().includes(skill));
  }));
}

export async function applyToJob(jobId, applicationData = {}) {
  const payload = {
    id: `app-${Date.now()}`,
    jobId,
    ...applicationData,
    status: 'Applied',
    appliedAt: new Date().toISOString(),
  };

  const applications = readStorage('seekerApplications', defaultApplications);
  const next = [payload, ...applications.filter((item) => String(item.jobId || item.id) !== String(jobId))];
  writeStorage('seekerApplications', next);

  return request(`/jobs/${jobId}/apply`, { method: 'POST', body: JSON.stringify(applicationData) }, payload);
}

export async function getRecentApplications(seekerId = 'user-001') {
  return request(`/seekers/${seekerId}/applications`, {}, readStorage('seekerApplications', defaultApplications));
}

export async function getConversations() {
  return request('/messages/conversations', {}, readStorage('seekerConversations', defaultConversations));
}

export async function sendMessage({ convId, senderRole = 'seeker', text }) {
  const payload = {
    convId,
    senderRole,
    text,
    sentAt: new Date().toISOString(),
  };

  const conversations = readStorage('seekerConversations', defaultConversations);
  const next = conversations.map((conversation) => {
    if (String(conversation.id) !== String(convId)) return conversation;
    return {
      ...conversation,
      lastMessage: text,
      lastMessageTime: 'Now',
      unreadCount: senderRole === 'employer' ? conversation.unreadCount : 0,
      messages: [...conversation.messages, { id: `message-${Date.now()}`, sender: senderRole, text, time: 'Now' }],
    };
  });

  writeStorage('seekerConversations', next);
  return request('/messages/send', { method: 'POST', body: JSON.stringify(payload) }, payload);
}

export async function getNotifications() {
  return request('/notifications', {}, readStorage('seekerNotifications', defaultNotifications));
}

export async function markAsRead(id) {
  const current = readStorage('seekerNotifications', defaultNotifications).map((item) =>
    String(item.id) === String(id) ? { ...item, read: true } : item,
  );
  writeStorage('seekerNotifications', current);
  return request(`/notifications/${id}/read`, { method: 'PATCH' }, current);
}

export async function getExperience(id = 'user-001') {
  return request(`/seekers/${id}/experience`, {}, readStorage('seekerExperience', defaultExperience));
}

export async function getProjects(id = 'user-001') {
  return request(`/seekers/${id}/projects`, {}, readStorage('seekerProjects', defaultProjects));
}

export const apiService = {
  getSeekerProfile,
  updateSeekerProfile,
  updateSeekerStatus,
  getRecommendedJobs,
  applyToJob,
  getRecentApplications,
  getConversations,
  sendMessage,
  getNotifications,
  markAsRead,
  getExperience,
  getProjects,
  getProfile: getSeekerProfile,
  updateProfile: updateSeekerProfile,
  getApplications: getRecentApplications,
};

export default apiService;
