const asList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === "string") return item.trim();
      return String(item?.skill_name || item?.name || item?.title || "").trim();
    }).filter(Boolean);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return asList(parsed);
    } catch {
      return value.split(/[,;|]/).map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
};

const normalizeText = (value) => String(value || "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim()
  .split(/\s+/)
  .filter(Boolean)
  .map((word) => ({
    designer: "design",
    designers: "design",
    graphics: "graphic",
  }[word] || (word.length > 4 && word.endsWith("s") ? word.slice(0, -1) : word)))
  .join(" ");

const isSkillMatch = (candidateSkill, requiredSkill) => {
  const candidate = normalizeText(candidateSkill);
  const required = normalizeText(requiredSkill);
  if (!candidate || !required) return false;
  if (candidate === required || candidate.includes(required) || required.includes(candidate)) return true;
  const candidateWords = new Set(candidate.split(" "));
  const requiredWords = required.split(" ");
  const sharedWords = requiredWords.filter((word) => candidateWords.has(word)).length;
  return sharedWords > 0 && sharedWords / Math.max(candidateWords.size, requiredWords.length) >= 0.5;
};

const getExperienceYears = (candidate) => {
  const explicitYears = Number(
    candidate?.experienceYears
    ?? candidate?.experience_years
    ?? candidate?.yearsOfExperience
    ?? candidate?.years_of_experience,
  );
  if (Number.isFinite(explicitYears) && explicitYears >= 0) return explicitYears;

  const experience = Array.isArray(candidate?.experience) ? candidate.experience : [];
  const dateRanges = experience.map((item) => {
    const start = Date.parse(item?.startDate || item?.start_date || "");
    const end = Date.parse(item?.endDate || item?.end_date || "") || Date.now();
    return Number.isFinite(start) && end >= start ? (end - start) / (365.25 * 24 * 60 * 60 * 1000) : 0;
  });
  return dateRanges.reduce((total, years) => total + years, 0);
};

const educationRank = (value) => {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  if (/phd|doctorate/.test(normalized)) return 5;
  if (/master|postgraduate/.test(normalized)) return 4;
  if (/bachelor|degree|bsc|ba/.test(normalized)) return 3;
  if (/diploma|associate|tvet|certificate/.test(normalized)) return 2;
  if (/high school|secondary/.test(normalized)) return 1;
  return 0;
};

const getJobSkills = (job) => asList(
  job?.requiredSkills
  ?? job?.required_skills
  ?? job?.additional_required_skills
  ?? job?.skills,
);

const getJobDescription = (job) => [
  job?.title,
  job?.category,
  job?.sector,
  job?.department,
  job?.description,
].filter(Boolean).join(" ");

export function calculateJobMatch(job = {}, currentUser = {}) {
  const candidateSkills = asList(currentUser.skills);
  const requiredSkills = getJobSkills(job);
  const jobText = normalizeText(getJobDescription(job));
  const matchedSkills = candidateSkills.filter((skill) => (
    requiredSkills.length
      ? requiredSkills.some((required) => isSkillMatch(skill, required))
      : isSkillMatch(skill, jobText)
  ));

  const components = [];
  if (candidateSkills.length && requiredSkills.length) {
    components.push({
      score: (matchedSkills.length / requiredSkills.length) * 100,
      weight: 70,
    });
  } else if (candidateSkills.length && jobText) {
    const relevant = matchedSkills.length / candidateSkills.length;
    components.push({ score: relevant * 100, weight: 70 });
  } else if (jobText) {
    const candidateRole = normalizeText([
      currentUser.headline,
      currentUser.preferredJob,
      currentUser.desiredPosition,
      currentUser.jobCategory,
    ].filter(Boolean).join(" "));
    if (candidateRole) {
      const candidateWords = new Set(candidateRole.split(" "));
      const jobWords = jobText.split(" ");
      const sharedWords = jobWords.filter((word) => candidateWords.has(word)).length;
      components.push({
        score: Math.min(100, (sharedWords / Math.max(candidateWords.size, 1)) * 100),
        weight: 70,
      });
    }
  }

  const candidateExperience = getExperienceYears(currentUser);
  const requiredExperience = Number(
    job?.min_experience
    ?? job?.minExperience
    ?? job?.years_of_experience_min
    ?? job?.experienceYears,
  );
  if (Number.isFinite(requiredExperience) && requiredExperience > 0) {
    components.push({
      score: candidateExperience >= requiredExperience
        ? 100
        : (candidateExperience / requiredExperience) * 100,
      weight: 15,
    });
  } else if (candidateExperience > 0) {
    components.push({ score: 100, weight: 15 });
  }

  const candidateEducation = educationRank(
    currentUser.educationLevel
    || currentUser.education_level
    || currentUser.education?.[0]?.degree
    || currentUser.education?.[0]?.level,
  );
  const requiredEducation = educationRank(
    job?.required_education
    || job?.requiredEducation
    || job?.education_level
    || job?.qualifications,
  );
  if (candidateEducation !== null && requiredEducation !== null) {
    components.push({
      score: candidateEducation >= requiredEducation
        ? 100
        : (candidateEducation / Math.max(requiredEducation, 1)) * 100,
      weight: 15,
    });
  }

  const totalWeight = components.reduce((total, item) => total + item.weight, 0);
  const score = totalWeight
    ? Math.round(components.reduce((total, item) => total + item.score * item.weight, 0) / totalWeight)
    : 0;

  return { score: Math.max(0, Math.min(100, score)), matchedSkills };
}

export function calculateMatchScore(seekerSkills = [], requiredSkills = []) {
  if (!requiredSkills.length) return 70;
  if (!seekerSkills.length) return 30;

  const matched = seekerSkills.filter((skill) =>
    requiredSkills.some((required) => isSkillMatch(skill, required)),
  );
  return Math.min(Math.max(Math.round((matched.length / requiredSkills.length) * 100), 40), 98);
}
