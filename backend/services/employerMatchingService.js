const DEFAULT_WEIGHTS = { skills: 40, experience: 30, education: 15, location: 15 };

const parseJson = (value, fallback = []) => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
};

const normalize = (value) => String(value || '').toLowerCase().replace(/nodejs/g, 'node.js').replace(/[^a-z0-9+#.]+/g, ' ').replace(/\s+/g, ' ').trim();

function flattenSkills(value) {
  const parsed = parseJson(value, value);
  if (Array.isArray(parsed)) return parsed.flatMap((item) => typeof item === 'string' ? [item] : [item?.skill_name, item?.name].filter(Boolean));
  if (parsed && typeof parsed === 'object') return Object.values(parsed).flatMap((items) => flattenSkills(items));
  return String(parsed || '').split(/[,;|]/).map((item) => item.trim()).filter(Boolean);
}

function list(value) {
  const parsed = parseJson(value, value);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') return Object.values(parsed).flat();
  return String(parsed || '').split(/[,;|]/).map((item) => item.trim()).filter(Boolean);
}

function getCandidateData(row) {
  const snapshot = parseJson(row.resume_snapshot, {});
  const parsedProfile = parseJson(row.parsed_json_payload, {});
  const cvData = parseJson(row.ai_extracted_data, {});
  const skills = [...new Set([
    ...flattenSkills(row.profile_skills),
    ...flattenSkills(row.extracted_skills),
    ...flattenSkills(snapshot.skills),
    ...flattenSkills(parsedProfile.skills),
    ...flattenSkills(cvData.skills),
  ].map((item) => String(item).trim()).filter(Boolean))];
  const experience = [
    ...list(row.extracted_experience),
    ...list(snapshot.experience),
    ...list(parsedProfile.experience),
    ...list(cvData.experience),
  ];
  const education = [
    ...list(row.profile_education),
    ...list(row.extracted_education),
    ...list(snapshot.education),
    ...list(parsedProfile.education),
    ...list(cvData.education),
  ];
  const certifications = [
    ...list(row.extracted_certifications),
    ...list(snapshot.certifications),
    ...list(parsedProfile.certifications),
    ...list(cvData.certifications),
  ];
  return {
    id: Number(row.candidate_id),
    applicationId: row.application_id ? Number(row.application_id) : null,
    name: row.full_name || 'Candidate',
    email: row.email,
    avatarUrl: row.avatar_url,
    currentTitle: row.headline || snapshot.headline || parsedProfile.headline || cvData.headline || 'Candidate',
    profile: {
      skills,
      experience,
      education,
      certifications,
      educationLevel: row.education_level || '',
      experienceLevel: row.experience_level || '',
      location: row.city || row.profile_location || '',
      preferredWorkMode: row.preferred_work_mode || row.work_setup || '',
    },
    cvUrl: row.file_url || row.cv_url || null,
    cvFileName: row.file_name || null,
    status: row.status || null,
    matchScore: Number(row.ai_match_score || 0),
    ai_score: Number(row.ai_match_score || 0),
    compatibility_score: Number(row.ai_match_score || 0),
    skillsScore: Number(row.skills_match_score || 0),
    experienceScore: Number(row.experience_match_score || 0),
    educationScore: Number(row.education_match_score || 0),
    locationScore: Number(row.location_match_score || 0),
    matchSummary: row.ai_match_summary || '',
    match_summary: row.ai_match_summary || '',
    strengths: parseJson(row.ai_strengths, []),
    missingSkills: parseJson(row.ai_missing_skills, []),
    missing_skills: parseJson(row.ai_missing_skills, []),
    evaluatedAt: row.evaluated_at || null,
    experienceYears: Math.round(durationYears(experience) * 10) / 10,
  };
}

function durationYears(experience) {
  let totalMonths = 0;
  let explicitYears = 0;
  for (const item of experience) {
    const text = typeof item === 'string' ? item : [item?.duration, item?.years_of_experience, item?.description].filter(Boolean).join(' ');
    const direct = Number(typeof item === 'object' ? item?.years_of_experience : NaN);
    if (Number.isFinite(direct) && direct > 0) explicitYears = Math.max(explicitYears, direct);
    const yearText = String(text || '').match(/(\d+(?:\.\d+)?)\s*\+?\s*years?/i);
    if (yearText) explicitYears = Math.max(explicitYears, Number(yearText[1]));
    const range = String(text || '').match(/(19\d{2}|20\d{2})\s*(?:-|to|–)\s*(present|current|20\d{2})/i);
    if (range) {
      const endYear = /present|current/i.test(range[2]) ? new Date().getFullYear() : Number(range[2]);
      totalMonths += Math.max(0, (endYear - Number(range[1])) * 12);
    }
  }
  return Math.min(50, Math.max(explicitYears, totalMonths / 12));
}

function degreeRank(value) {
  const text = normalize(value);
  if (/phd|doctorate|doctoral/.test(text)) return 6;
  if (/master|msc|mba|m\.s\./.test(text)) return 5;
  if (/bachelor|bsc|b\.s\.|undergraduate/.test(text)) return 4;
  if (/associate/.test(text)) return 3;
  if (/diploma|certificate/.test(text)) return 2;
  if (/high school|secondary/.test(text)) return 1;
  return 0;
}

function calculateCandidateMatch(candidate, job, weights = DEFAULT_WEIGHTS) {
  const requiredSkills = [...new Set(flattenSkills(job.required_skills).map(normalize).filter(Boolean))];
  const candidateSkills = candidate.profile.skills.map(normalize).filter(Boolean);
  const matchedSkills = requiredSkills.filter((required) => candidateSkills.some((skill) => skill === required || skill.includes(required) || required.includes(skill)));
  const skillsScore = requiredSkills.length ? (matchedSkills.length / requiredSkills.length) * 100 : 70;

  const years = durationYears(candidate.profile.experience);
  const requiredYears = Math.max(0, Number(job.years_of_experience_min || 0));
  const requestedLevel = normalize(job.vacancy_level || job.experience_level);
  const candidateLevel = normalize(candidate.profile.experienceLevel);
  const seniorityRank = (level) => level.includes('executive') ? 4 : level.includes('senior') ? 3 : level.includes('mid') ? 2 : level.includes('entry') || level.includes('junior') ? 1 : 0;
  const yearsScore = requiredYears ? Math.min(100, (years / requiredYears) * 100) : 80;
  const levelScore = requestedLevel && candidateLevel
    ? (seniorityRank(candidateLevel) >= seniorityRank(requestedLevel) ? 100 : 60)
    : 75;
  const experienceScore = Math.round((yearsScore * 0.7) + (levelScore * 0.3));

  const educationText = [candidate.profile.educationLevel, ...candidate.profile.education.map((item) => typeof item === 'string' ? item : [item?.degree, item?.field_of_study, item?.institution].filter(Boolean).join(' '))].join(' ');
  const requiredEducation = normalize(job.required_education || 'any');
  const requiredRank = degreeRank(requiredEducation);
  const candidateRank = degreeRank(educationText);
  let educationScore = !requiredEducation || requiredEducation.includes('any') ? 100 : requiredRank
    ? (candidateRank >= requiredRank ? 100 : Math.round((candidateRank / requiredRank) * 100))
    : normalize(educationText).includes(requiredEducation) ? 100 : 35;
  const jobText = normalize(`${job.title} ${job.description}`);
  if (/certificat|certified|license|licence/.test(jobText)) {
    const certificationText = normalize(candidate.profile.certifications.map((item) => typeof item === 'string' ? item : item?.name || item?.title || '').join(' '));
    educationScore = Math.round((educationScore * 0.75) + (certificationText ? 25 : 0));
  }

  const candidateLocation = normalize(candidate.profile.location);
  const requiredLocation = normalize(job.city || job.location || job.country);
  const candidateMode = normalize(candidate.profile.preferredWorkMode);
  const requiredMode = normalize(job.work_mode);
  const modeScore = !candidateMode || candidateMode.includes('any') || candidateMode === requiredMode ? 100
    : candidateMode.includes('hybrid') && requiredMode.includes('remote') ? 85
      : candidateMode.includes('remote') && requiredMode.includes('hybrid') ? 75 : 40;
  const locationScore = !candidateLocation || !requiredLocation ? 70
    : candidateLocation.includes(requiredLocation) || requiredLocation.includes(candidateLocation) ? 100
      : requiredMode.includes('remote') ? 85 : 35;
  const workLocationScore = Math.round((modeScore + locationScore) / 2);

  const score = Math.round((skillsScore * weights.skills + experienceScore * weights.experience + educationScore * weights.education + workLocationScore * weights.location) / 100);
  const missingSkills = requiredSkills.filter((skill) => !matchedSkills.includes(skill));
  const strengths = matchedSkills.slice(0, 3);
  if (years >= requiredYears && years > 0) strengths.push(`${years} years of relevant experience`);
  if (educationScore >= 80 && strengths.length < 3) strengths.push('Education meets the role requirements');
  return {
    ...candidate,
    matchScore: score,
    ai_score: score,
    compatibility_score: score,
    skillsScore: Math.round(skillsScore),
    experienceScore,
    educationScore,
    locationScore: workLocationScore,
    matchedSkills,
    missingSkills,
    experienceYears: Math.round(years * 10) / 10,
    strengths: strengths.slice(0, 3),
    missing_skills: missingSkills,
    matchSummary: `Deterministic match: ${matchedSkills.length} of ${requiredSkills.length} required skills matched; experience, education, and work location were also considered.`,
  };
}

function validateWeights(input = DEFAULT_WEIGHTS) {
  const weights = {};
  for (const key of Object.keys(DEFAULT_WEIGHTS)) {
    const value = Number(input[key] ?? DEFAULT_WEIGHTS[key]);
    if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error('Each matching weight must be between 0 and 100.');
    weights[key] = value;
  }
  if (Object.values(weights).reduce((sum, value) => sum + value, 0) !== 100) throw new Error('Matching weights must total 100%.');
  return weights;
}

module.exports = { DEFAULT_WEIGHTS, parseJson, getCandidateData, calculateCandidateMatch, validateWeights };