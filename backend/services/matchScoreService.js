const normalize = (value) => String(value || '')
  .toLowerCase()
  .replace(/nodejs/g, 'node.js')
  .replace(/[^a-z0-9+#.]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const roundPercent = (value) => Number(Math.max(0, Math.min(100, value)).toFixed(2));
const skillName = (skill) => typeof skill === 'string'
  ? skill
  : skill?.skill_name || skill?.name || skill?.skill || '';

function parseList(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === '') return [];
  if (typeof value === 'object') return Object.values(value).flatMap(parseList);
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : parseList(parsed);
  } catch {
    return String(value).split(/[,;|]/).map((item) => item.trim()).filter(Boolean);
  }
}

function getEducationRank(value) {
  const text = normalize(value);
  if (/\b(phd|doctorate|doctoral)\b/.test(text)) return 5;
  if (/\b(master|msc|mba|m s)\b/.test(text)) return 4;
  if (/\b(bachelor|bsc|b s|undergraduate)\b/.test(text)) return 3;
  if (/\b(associate|diploma|certificate|tvet)\b/.test(text)) return 2;
  if (/\b(high school|secondary)\b/.test(text)) return 1;
  return 0;
}

function getSeniorityRank(value) {
  const text = normalize(value);
  if (text.includes('executive')) return 4;
  if (text.includes('senior')) return 3;
  if (text.includes('mid') || text.includes('intermediate')) return 2;
  if (text.includes('entry') || text.includes('junior')) return 1;
  return 0;
}

function experienceYears(experience = []) {
  let maximumYears = 0;
  for (const item of parseList(experience)) {
    const directValue = typeof item === 'object'
      ? Number(item.years_of_experience ?? item.years ?? item.duration_years)
      : NaN;
    if (Number.isFinite(directValue) && directValue > 0) maximumYears = Math.max(maximumYears, directValue);

    const text = typeof item === 'string'
      ? item
      : [item?.duration, item?.description, item?.dates].filter(Boolean).join(' ');
    const yearsMatch = String(text).match(/(\d+(?:\.\d+)?)\s*\+?\s*years?/i);
    if (yearsMatch) maximumYears = Math.max(maximumYears, Number(yearsMatch[1]));

    const dateRange = String(text).match(/(19\d{2}|20\d{2})\s*(?:-|to|–)\s*(present|current|19\d{2}|20\d{2})/i);
    if (dateRange) {
      const endYear = /present|current/i.test(dateRange[2]) ? new Date().getFullYear() : Number(dateRange[2]);
      maximumYears = Math.max(maximumYears, Math.max(0, endYear - Number(dateRange[1])));
    }
  }
  return Math.min(50, maximumYears);
}

const domainRequirements = [
  {
    name: 'Pomology',
    evidence: /\bpomolog\w*\b|\bfruit (?:cultivation|production|crops?)\b/i,
    candidate: /\bpomolog\w*\b|\bfruit (?:cultivation|production)\b/i,
  },
  {
    name: 'Olericulture',
    evidence: /\bolericultur\w*\b|\bvegetable (?:cultivation|production|crops?)\b/i,
    candidate: /\bolericultur\w*\b|\bvegetable (?:cultivation|production)\b|\bcrop cultivation\b|\bcrop production\b/i,
  },
  {
    name: 'Floriculture',
    evidence: /\bfloricultur\w*\b|\bflower cultivation\b|\bornamental plants?\b/i,
    candidate: /\bfloricultur\w*\b|\bflower cultivation\b|\bornamental plants?\b/i,
  },
  {
    name: 'Landscape Horticulture',
    evidence: /\blandscape horticultur\w*\b|\blandscap(?:e|ing) (?:design|installation|maintenance)\b/i,
    candidate: /\blandscape horticultur\w*\b|\blandscap(?:e|ing) (?:design|installation|maintenance)\b/i,
  },
  {
    name: 'Arboriculture',
    evidence: /\barboricultur\w*\b|\btree (?:care|management)\b/i,
    candidate: /\barboricultur\w*\b|\btree (?:care|management)\b/i,
  },
  {
    name: 'Crop Cultivation',
    evidence: /\b(?:crop|plant|vegetable) (?:cultivation|production)\b|\bcultivat\w+.{0,50}\b(?:crop|plant|vegetable)\b/i,
    candidate: /\bcrop cultivation\b|\bcrop production\b|\bplant production\b|\bvegetable cultivation\b/i,
  },
  {
    name: 'Greenhouse Management',
    evidence: /\bgreenhouse\w*\b|\bprotected cultivation\b/i,
    candidate: /\bgreenhouse\w*\b|\bprotected cultivation\b/i,
  },
];

function directSkillMatch(candidate, requirement) {
  const candidateText = normalize(candidate);
  const requirementText = normalize(requirement);
  if (!candidateText || !requirementText) return false;
  if (candidateText === requirementText || candidateText.includes(requirementText) || requirementText.includes(candidateText)) return true;
  const requirementDomain = domainRequirements.find((domain) => domain.name.toLowerCase() === requirementText);
  if (requirementDomain && requirementDomain.candidate.test(candidate)) return true;
  const candidateDomain = domainRequirements.find((domain) => domain.name.toLowerCase() === candidateText);
  if (candidateDomain && candidateDomain.candidate.test(requirement)) return true;
  if (/crop cultivation|crop production/i.test(candidateText) && /olericulture|vegetable/i.test(requirementText)) return true;
  return false;
}

function evaluateSkills(seeker, job) {
  const candidateSkills = [...new Set(parseList(seeker.skills).map(skillName).map((value) => String(value).trim()).filter(Boolean))];
  const jobText = [job.title, job.description, job.sector, job.category].filter(Boolean).join(' ');
  const explicitRequirements = [...new Set(parseList(job.requiredSkills || job.required_skills || job.tags).map(skillName).map((value) => String(value).trim()).filter(Boolean))];
  const requirements = explicitRequirements.length
    ? explicitRequirements
    : domainRequirements.filter((item) => item.evidence.test(jobText)).map((item) => item.name);

  if (requirements.length) {
    const matchedSkills = requirements.filter((requirement) => candidateSkills.some((candidate) => directSkillMatch(candidate, requirement)));
    const missingSkills = requirements.filter((requirement) => !matchedSkills.includes(requirement));
    return {
      score: roundPercent(matchedSkills.length / requirements.length * 100),
      matchedSkills,
      missingSkills,
      evidence: { candidateSkills, requirements },
    };
  }

  const evidencedSkills = candidateSkills.filter((skill) => {
    const domain = domainRequirements.find((item) => item.candidate.test(skill));
    return domain ? domain.evidence.test(jobText) : normalize(jobText).includes(normalize(skill));
  });
  return {
    score: candidateSkills.length ? roundPercent(evidencedSkills.length / candidateSkills.length * 100) : 0,
    matchedSkills: evidencedSkills,
    missingSkills: candidateSkills.filter((skill) => !evidencedSkills.includes(skill)),
    evidence: { candidateSkills, requirements: [] },
  };
}

function evaluateExperience(seeker, job) {
  const experienceRecords = [
    ...parseList(seeker.experience),
    ...parseList(seeker.cv?.experience),
    ...parseList(seeker.profile?.experience),
  ];
  const candidateYears = Math.max(Number(seeker.yearsOfExperience) || 0, experienceYears(experienceRecords));
  const candidateLevel = seeker.profile?.experience_level
    || seeker.profile?.experienceLevel
    || seeker.experienceLevel
    || seeker.cv?.experience_level
    || '';
  const requiredYears = Math.max(0, Number(job.min_experience ?? job.years_of_experience_min ?? 0) || 0);
  const requiredLevel = job.experience_level || '';
  const metrics = [];

  if (requiredYears > 0) {
    metrics.push(candidateYears > 0 ? Math.min(100, candidateYears / requiredYears * 100) : 0);
  }
  if (requiredLevel) {
    const candidateRank = getSeniorityRank(candidateLevel);
    const requiredRank = getSeniorityRank(requiredLevel);
    metrics.push(candidateRank && requiredRank
      ? Math.min(100, candidateRank / requiredRank * 100)
      : 0);
  }

  return {
    score: metrics.length ? roundPercent(metrics.reduce((sum, value) => sum + value, 0) / metrics.length) : 100,
    evidence: {
      candidateYears: roundPercent(candidateYears),
      candidateLevel: String(candidateLevel || ''),
      requiredYears,
      requiredLevel: String(requiredLevel || ''),
    },
  };
}

function evaluateEducation(seeker, job) {
  const candidateEducation = [
    seeker.profile?.education_level,
    seeker.profile?.educationLevel,
    seeker.educationLevel,
    ...parseList(seeker.education),
    ...parseList(seeker.profile?.education),
    ...parseList(seeker.cv?.education),
  ].map((item) => typeof item === 'string'
    ? item
    : [item?.degree, item?.field_of_study, item?.school_name, item?.institution].filter(Boolean).join(' ')).filter(Boolean).join(' ');
  const requiredEducation = String(job.required_education || job.requiredEducation || '');
  const requiredRank = getEducationRank(requiredEducation);
  const candidateRank = getEducationRank(candidateEducation);
  let score;

  if (!requiredEducation || /\b(any|not required|none)\b/i.test(requiredEducation)) {
    score = 100;
  } else if (requiredRank) {
    score = candidateRank ? Math.min(100, candidateRank / requiredRank * 100) : 0;
  } else {
    score = normalize(candidateEducation).includes(normalize(requiredEducation)) ? 100 : 0;
  }

  return {
    score: roundPercent(score),
    evidence: { candidateEducation, requiredEducation },
  };
}

function evaluateTitle(seeker, job) {
  const ignoredTerms = new Set(['a', 'an', 'and', 'for', 'in', 'of', 'the', 'to', 'with']);
  const terms = (value) => [...new Set(
    normalize(value).split(' ').filter((term) => term.length > 1 && !ignoredTerms.has(term)),
  )];
  const jobTerms = terms(job.title);
  const candidateTitles = [
    seeker.title,
    seeker.headline,
    seeker.profile?.headline,
    ...parseList(seeker.experience).map((item) =>
      typeof item === 'string'
        ? ''
        : [item?.title, item?.position, item?.job_title, item?.role].filter(Boolean).join(' ')),
  ].filter(Boolean).join(' ');
  const candidateTerms = new Set(terms(candidateTitles));
  const matchedTerms = jobTerms.filter((term) => candidateTerms.has(term));
  return {
    score: jobTerms.length ? roundPercent(matchedTerms.length / jobTerms.length * 100) : 100,
    evidence: {
      candidateTitle: String(candidateTitles || ''),
      jobTitle: String(job.title || ''),
      matchedTerms,
      requiredTerms: jobTerms,
    },
  };
}

function calculateMatchScore(seeker = {}, job = {}) {
  const skills = evaluateSkills(seeker, job);
  const experience = evaluateExperience(seeker, job);
  const title = evaluateTitle(seeker, job);
  const education = evaluateEducation(seeker, job);
  const skillsMatchScore = skills.score;
  const experienceMatchScore = experience.score;
  const titleMatchScore = title.score;
  const educationMatchScore = education.score;
  const overallScore = roundPercent(
    skillsMatchScore * 0.45
    + experienceMatchScore * 0.3
    + titleMatchScore * 0.15
    + educationMatchScore * 0.1
  );

  return {
    score: overallScore,
    overallScore,
    skillsMatchScore,
    experienceMatchScore,
    titleMatchScore,
    educationMatchScore,
    matchedSkills: skills.matchedSkills,
    missingSkills: skills.missingSkills,
    breakdown: {
      skills: skillsMatchScore,
      experience: experienceMatchScore,
      title: titleMatchScore,
      education: educationMatchScore,
      overall: overallScore,
    },
    evidence: {
      skills: skills.evidence,
      experience: experience.evidence,
      title: title.evidence,
      education: education.evidence,
      weights: { skills: 45, experience: 30, title: 15, education: 10 },
    },
  };
}

module.exports = { calculateMatchScore };
