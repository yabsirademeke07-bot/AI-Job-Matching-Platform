const normalize = (value) => String(value || '').toLowerCase().replace(/nodejs/g, 'node.js').replace(/[^a-z0-9+#.]+/g, ' ').replace(/\s+/g, ' ').trim();
const tokens = (value) => normalize(value).split(' ').filter((token) => token.length > 2);
const skillName = (skill) => typeof skill === 'string' ? skill : skill?.skill_name || skill?.name || '';
const parseSkills = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try { return JSON.parse(value); } catch { return String(value).split(/[,;|]/); }
};

function educationScore(seeker, job) {
  const candidate = normalize([
    seeker.profile?.education_level,
    seeker.profile?.education,
    ...(seeker.education || []).map((item) => [item.degree, item.field_of_study, item.school_name, item.institution].join(' ')),
    seeker.cv?.education,
  ].join(' '));
  const required = normalize(job.required_education || job.education || 'any');
  if (!required || required.includes('any') || required.includes('not required')) return 1;
  const levels = ['high school', 'certificate', 'diploma', 'associate', 'bachelor', 'master', 'phd'];
  const requiredIndex = levels.findIndex((level) => required.includes(level));
  const candidateIndex = levels.reduce((best, level, index) => candidate.includes(level) ? Math.max(best, index) : best, -1);
  if (requiredIndex < 0) return candidate.includes(required) ? 1 : 0.25;
  return candidateIndex >= requiredIndex ? 1 : Math.max(0, candidateIndex + 1) / (requiredIndex + 1);
}

function experienceScore(seeker, job) {
  const candidate = normalize([
    seeker.profile?.experience_level,
    ...(seeker.experience || []).map((item) => [item.role, item.job_title, item.duration, item.years_of_experience].join(' ')),
    seeker.cv?.experience,
  ].join(' '));
  const required = normalize(job.experience_level || '');
  const requiredYears = Number(job.years_of_experience_min || (required.match(/\d+/) || [0])[0]);
  const candidateYears = Number((candidate.match(/\d+(?:\.\d+)?/) || [0])[0]);
  if (requiredYears > 0) return candidateYears >= requiredYears ? 1 : Math.max(0, candidateYears / requiredYears);
  if (!required || required.includes('any')) return 1;
  if (required.includes('entry')) return candidate.includes('entry') || candidate.includes('junior') || candidateYears > 0 ? 1 : 0.5;
  if (required.includes('junior')) return candidate.includes('junior') || candidate.includes('intermediate') || candidate.includes('senior') ? 1 : 0.5;
  if (required.includes('mid')) return candidate.includes('mid') || candidate.includes('intermediate') || candidate.includes('senior') ? 1 : 0.5;
  if (required.includes('senior') || required.includes('executive')) return candidate.includes('senior') || candidate.includes('expert') || candidate.includes('executive') ? 1 : 0.5;
  return 0.5;
}

function titleSectorScore(seeker, job) {
  const candidateTerms = new Set(tokens([
    seeker.profile?.headline,
    seeker.profile?.job_category,
    seeker.profile?.preferred_job,
    seeker.cv?.headline,
    seeker.cv?.professional_title,
    ...(seeker.experience || []).map((item) => item.role || item.job_title),
  ].join(' ')));
  const jobTerms = [...tokens(job.title), ...tokens(job.sector), ...tokens(job.category)];
  if (!jobTerms.length) return 0.5;
  const matches = jobTerms.filter((term) => candidateTerms.has(term) || [...candidateTerms].some((candidate) => candidate.includes(term) || term.includes(candidate)));
  return matches.length / jobTerms.length;
}

function locationScore(seeker, job) {
  const candidateLocation = normalize(seeker.profile?.city || seeker.profile?.location || seeker.cv?.location);
  const jobLocation = normalize(job.location || job.city || job.country);
  const mode = normalize(seeker.profile?.preferred_work_mode || seeker.profile?.work_setup || seeker.profile?.preferredWorkSetup);
  const jobMode = normalize(job.work_mode || job.workplace);
  if (jobMode.includes('remote') || jobLocation.includes('remote')) return mode.includes('remote') || mode.includes('any') || mode.includes('flexible') ? 1 : 0.8;
  if (mode.includes('remote') && !jobMode.includes('remote')) return 0.4;
  if (!candidateLocation || !jobLocation) return 0.6;
  return candidateLocation.includes(jobLocation) || jobLocation.includes(candidateLocation) ? 1 : 0.35;
}

function calculateMatchScore(seeker = {}, job = {}) {
  const candidateSkills = new Set((seeker.skills || []).map(skillName).map(normalize).filter(Boolean));
  const requiredSkills = parseSkills(job.requiredSkills || job.required_skills || job.tags).map(skillName).map(normalize).filter(Boolean);
  const uniqueRequiredSkills = [...new Set(requiredSkills)];
  const matchedSkills = uniqueRequiredSkills.filter((skill) => candidateSkills.has(skill) || [...candidateSkills].some((candidate) => candidate.includes(skill) || skill.includes(candidate)));
  const skills = uniqueRequiredSkills.length ? matchedSkills.length / uniqueRequiredSkills.length : 0.5;
  const sectorTitle = titleSectorScore(seeker, job);
  const experience = experienceScore(seeker, job);
  const education = educationScore(seeker, job);
  const experienceEducation = Math.max(experience, education);
  const location = locationScore(seeker, job);
  const score = Math.max(20, Math.min(98, Math.round((skills * 0.45 + sectorTitle * 0.25 + experienceEducation * 0.2 + location * 0.1) * 100)));
  return {
    score,
    matchedSkills,
    breakdown: {
      skills: Math.round(skills * 100),
      sectorTitle: Math.round(sectorTitle * 100),
      experience: Math.round(experience * 100),
      education: Math.round(education * 100),
      experienceEducation: Math.round(experienceEducation * 100),
      location: Math.round(location * 100),
      overall: score,
    },
  };
}

module.exports = { calculateMatchScore };
