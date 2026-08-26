const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const USE_MOCKS = import.meta.env.VITE_USE_JOB_MOCKS !== 'false';
const SAVED_JOBS_KEY = 'jobMatchingSavedJobs';
const APPLICATIONS_KEY = 'mockApplications';

const mockJobs = [
  {
    id: 'job-101',
    title: 'Frontend Engineer',
    company: 'Blue Nile Tech',
    companyOverview: 'Blue Nile Tech is a product-led software company building digital commerce and analytics tools for African businesses.',
    location: 'Addis Ababa',
    type: 'Full Time',
    experience: 'Mid Level',
    salary: 'ETB 55,000 - 75,000',
    postedAt: '2 days ago',
    description: 'We are looking for a Frontend Engineer to design elegant user experiences and ship production features for a fast-growing SaaS platform.',
    responsibilities: [
      'Build intuitive, responsive interfaces using React and TypeScript.',
      'Collaborate with designers and backend engineers to streamline product delivery.',
      'Improve accessibility, performance, and maintainability across the app.',
      'Mentor junior developers and review pull requests with a quality-first mindset.'
    ],
    requirements: [
      '3+ years of frontend development experience with React and JavaScript.',
      'Strong UI/UX judgment and an eye for detail.',
      'Working knowledge of REST APIs, CSS, and accessibility standards.',
      'Bachelor\'s degree in Computer Science or related field.'
    ],
    benefits: [
      'Health insurance and annual leave',
      'Remote-friendly hybrid schedule',
      'Learning allowance and mentorship' 
    ],
    skills: ['React', 'TypeScript', 'JavaScript', 'CSS', 'UI/UX'],
    matchBreakdown: {
      skills: 90,
      experience: 85,
      education: 80,
      overall: 87
    },
    missingSkills: ['Next.js']
  },
  {
    id: 'job-102',
    title: 'Senior Full Stack Developer',
    company: 'Mella Digital',
    companyOverview: 'Mella Digital helps startups and enterprises accelerate product delivery through modern digital products and data-driven systems.',
    location: 'Remote',
    type: 'Remote',
    experience: 'Senior',
    salary: 'ETB 80,000 - 110,000',
    postedAt: '4 days ago',
    description: 'Join our engineering team to build scalable web applications, APIs, and service integrations for regional clients.',
    responsibilities: [
      'Design and deliver customer-facing features across the stack.',
      'Lead the delivery of internal tools and APIs.',
      'Improve observability, caching, and deployment automation.',
      'Guide architecture discussions and refactoring projects.'
    ],
    requirements: [
      '5+ years of software engineering experience.',
      'Deep experience with Node.js, PostgreSQL, and React.',
      'Strong API design and testing practices.',
      'Excellent written and verbal communication skills.'
    ],
    benefits: [
      'Flexible work setup',
      'Performance-based bonus',
      'Annual trip and equipment support'
    ],
    skills: ['Node.js', 'React', 'PostgreSQL', 'API Design', 'Testing'],
    matchBreakdown: {
      skills: 92,
      experience: 88,
      education: 82,
      overall: 89
    },
    missingSkills: ['GraphQL']
  },
  {
    id: 'job-103',
    title: 'Product Designer',
    company: 'Fintech Hub',
    companyOverview: 'Fintech Hub is building inclusive digital financial products to simplify access to financial tools in Ethiopia and beyond.',
    location: 'Hawassa',
    type: 'Contract',
    experience: 'Mid Level',
    salary: 'ETB 50,000 - 70,000',
    postedAt: '1 day ago',
    description: 'We need a Product Designer who can turn complex product ideas into simple, delightful, and accessible digital experiences.',
    responsibilities: [
      'Translate requirements into wireframes, flows, and polished mockups.',
      'Collaborate closely with engineering and product stakeholders.',
      'Run user research and usability tests.',
      'Maintain design consistency across products.'
    ],
    requirements: [
      '2+ years of experience in product or UX design.',
      'Strong portfolio showing interface design work.',
      'Experience with Figma and design systems.',
      'Understanding of accessibility and user-centered research.'
    ],
    benefits: [
      'Contract extension opportunities',
      'Creative autonomy',
      'Collaborative team culture'
    ],
    skills: ['Figma', 'UX Design', 'Research', 'Design Systems', 'Accessibility'],
    matchBreakdown: {
      skills: 76,
      experience: 74,
      education: 78,
      overall: 76
    },
    missingSkills: ['Prototyping']
  },
  {
    id: 'job-104',
    title: 'Data Analyst',
    company: 'Ethio Telecom Labs',
    companyOverview: 'Ethio Telecom Labs focuses on data-informed operations and digital transformation across telecom and adjacent sectors.',
    location: 'Addis Ababa',
    type: 'Full Time',
    experience: 'Entry Level',
    salary: 'ETB 30,000 - 45,000',
    postedAt: '6 days ago',
    description: 'This role supports product and operations teams by turning raw data into clear, actionable insights and dashboards.',
    responsibilities: [
      'Collect, clean, and model data from multiple business sources.',
      'Create dashboard and analytical reports for stakeholder teams.',
      'Monitor KPIs and identify growth opportunities.',
      'Partner with teams to improve data quality and reporting workflows.'
    ],
    requirements: [
      'Bachelor\'s degree in statistics, economics, or a related field.',
      'Comfort with Excel, SQL, and dashboard tooling.',
      'Strong analytical thinking and communication skills.',
      'A proactive approach to learning and problem solving.'
    ],
    benefits: [
      'Training and certification sponsorship',
      'Career development roadmap',
      'Modern office environment'
    ],
    skills: ['SQL', 'Excel', 'Analytics', 'Dashboarding', 'Reporting'],
    matchBreakdown: {
      skills: 84,
      experience: 72,
      education: 88,
      overall: 81
    },
    missingSkills: ['Python']
  }
];

const normalizeJob = (job) => ({
  ...job,
  id: String(job.id),
  companyName: job.companyName || job.company || 'Company',
  company: job.companyName || job.company || 'Company',
  location: job.location || 'Remote',
  type: job.type || 'Full Time',
  experience: job.experience || 'Mid Level',
  salary: job.salary || 'Negotiable',
  skills: job.skills || job.tags || ['React', 'JavaScript'],
  responsibilities: job.responsibilities || [
    'Work closely with the team to deliver high-impact features.',
    'Support quality and delivery across the product lifecycle.'
  ],
  requirements: job.requirements || [
    'Strong communication and problem solving skills.',
    'Experience working in a fast-paced team environment.'
  ],
  benefits: job.benefits || ['Health coverage', 'Learning budget'],
  matchBreakdown: job.matchBreakdown || {
    skills: 80,
    experience: 80,
    education: 80,
    overall: 80
  },
  postedAt: job.postedAt || 'Recently posted'
});

function getSavedJobs() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVED_JOBS_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function getStoredApplications() {
  try {
    const raw = JSON.parse(localStorage.getItem(APPLICATIONS_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

async function request(path, options = {}, fallback) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers || {})
      },
      ...options
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
    if (USE_MOCKS && fallback) {
      return typeof fallback === 'function' ? fallback() : fallback;
    }
    throw error instanceof Error ? error : new Error('Job request failed');
  }
}

export async function searchJobs(queryParams = {}) {
  const query = (queryParams.q || '').trim();
  const type = (queryParams.type || '').trim();
  const experience = (queryParams.experience || '').trim();
  const location = (queryParams.location || '').trim();
  const salary = (queryParams.salary || '').trim();

  const params = new URLSearchParams({
    q: query,
    type,
    experience,
    location,
    salary
  });

  return request(`/jobs?${params.toString()}`, {}, () => {
    let filtered = [...mockJobs];

    if (query) {
      const term = query.toLowerCase();
      filtered = filtered.filter((job) => {
        const haystack = [
          job.title,
          job.company,
          job.location,
          ...(job.skills || []),
          ...(job.requirements || []),
          job.description
        ].join(' ').toLowerCase();
        return haystack.includes(term);
      });
    }

    if (type) {
      filtered = filtered.filter((job) => (job.type || '').toLowerCase() === type.toLowerCase());
    }

    if (experience) {
      filtered = filtered.filter((job) => (job.experience || '').toLowerCase() === experience.toLowerCase());
    }

    if (location) {
      filtered = filtered.filter((job) => (job.location || '').toLowerCase() === location.toLowerCase());
    }

    if (salary) {
      const salaryValue = Number(salary);
      filtered = filtered.filter((job) => {
        const amount = (job.salary || '').match(/\d+/g)?.join('');
        if (!amount) return true;
        return Number(amount) >= salaryValue;
      });
    }

    return filtered.map(normalizeJob);
  });
}

export async function getJobById(jobId) {
  const id = String(jobId);
  return request(`/jobs/${id}`, {}, () => {
    const job = mockJobs.find((item) => String(item.id) === id) || mockJobs[0];
    return normalizeJob({
      ...job,
      matchBreakdown: job.matchBreakdown || {
        skills: 87,
        experience: 84,
        education: 81,
        overall: 87
      }
    });
  });
}

export async function saveJob(jobId) {
  const id = String(jobId);
  const saved = getSavedJobs();
  const next = saved.includes(id) ? saved : [...saved, id];
  localStorage.setItem(SAVED_JOBS_KEY, JSON.stringify(next));

  return request(`/jobs/${id}/save`, {
    method: 'POST',
    body: JSON.stringify({ jobId: id })
  }, () => ({
    success: true,
    saved: true,
    jobId: id,
    savedJobs: next
  }));
}

export async function unsaveJob(jobId) {
  const id = String(jobId);
  const saved = getSavedJobs().filter((item) => String(item) !== id);
  localStorage.setItem(SAVED_JOBS_KEY, JSON.stringify(saved));

  return request(`/jobs/${id}/save`, {
    method: 'DELETE',
    body: JSON.stringify({ jobId: id })
  }, () => ({
    success: true,
    saved: false,
    jobId: id,
    savedJobs: saved
  }));
}

export async function applyForJob(jobId, payload = {}) {
  const id = String(jobId);
  const application = {
    id: `app-${Date.now()}`,
    jobId: id,
    resumeId: payload.resumeId || 'resume-demo',
    coverLetter: payload.coverLetter || '',
    job: payload.job || null,
    status: 'Submitted',
    createdAt: new Date().toISOString()
  };

  const current = getStoredApplications();
  const existing = current.find((item) => String(item.jobId) === id);
  if (existing) return { success: false, alreadyApplied: true, applicationId: existing.id, data: existing };
  localStorage.setItem(APPLICATIONS_KEY, JSON.stringify([application, ...current]));

  return {
    success: true,
    applicationId: application.id,
    message: 'Application submitted successfully!',
    data: application
  };
}

export function getApplicationById(applicationId) {
  return getStoredApplications().find((application) => String(application.id) === String(applicationId)) || null;
}

export async function withdrawApplication(applicationId) {
  const id = String(applicationId);
  const applications = getStoredApplications();
  const application = applications.find((item) => String(item.id) === id);
  const next = applications.map((item) => String(item.id) === id ? { ...item, status: 'Withdrawn', withdrawnAt: new Date().toISOString() } : item);
  localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(next));

  return request(`/applications/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ applicationId: id })
  }, () => ({ success: true, application: application ? { ...application, status: 'Withdrawn' } : null }));
}

export function getSavedJobsState() {
  return getSavedJobs();
}

export default {
  searchJobs,
  getJobById,
  saveJob,
  unsaveJob,
  applyForJob,
  getApplicationById,
  withdrawApplication,
  getSavedJobsState
};
