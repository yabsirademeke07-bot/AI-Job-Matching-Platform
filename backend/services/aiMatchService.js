const { GoogleGenAI } = require('@google/genai');
const { notifyAdminEvent } = require('./telegramNotifier');

const WEIGHTS = {
  skills: 0.4,
  experience: 0.25,
  domain: 0.15,
  education: 0.1,
  softSkills: 0.1,
};
const SOFT_SKILLS = [
  'communication',
  'leadership',
  'teamwork',
  'problem solving',
  'time management',
  'adaptability',
  'collaboration',
  'critical thinking',
  'project management',
  'organization',
];
const STOP_WORDS = new Set([
  'and', 'are', 'for', 'from', 'have', 'job', 'role', 'the', 'this', 'with',
  'work', 'years', 'your', 'required', 'responsibilities', 'experience',
  'candidate', 'skills', 'education', 'degree',
]);

function clampScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) throw new Error('AI match score must be numeric.');
  return Math.round(Math.max(0, Math.min(100, score)) * 100) / 100;
}

function textOf(value) {
  if (Array.isArray(value)) return value.map(textOf).filter(Boolean).join(' ');
  if (value && typeof value === 'object') {
    return Object.values(value).map(textOf).filter(Boolean).join(' ');
  }
  return String(value || '');
}

function keywords(value) {
  return new Set(
    textOf(value).toLowerCase().match(/[a-z][a-z+#.]{2,}/g)?.filter((word) => !STOP_WORDS.has(word)) || [],
  );
}

function overlapScore(candidateEvidence, jobEvidence) {
  const requirements = keywords(jobEvidence);
  if (!requirements.size) return 100;
  const candidate = keywords(candidateEvidence);
  return (requirements.size
    ? [...requirements].filter((word) => candidate.has(word)).length / requirements.size * 100
    : 100);
}

function calculateOverallScore(scores) {
  return Math.round(Object.entries(WEIGHTS)
    .reduce((total, [key, weight]) => total + scores[key] * weight, 0) * 100) / 100;
}

function buildEvidenceEvaluation({ cvText, candidate, job, localMatch }) {
  const candidateProfile = {
    skills: candidate.skills,
    experience: candidate.experience,
    education: candidate.education,
    title: candidate.headline || candidate.experienceLevel,
    cvText,
  };
  const jobProfile = {
    title: job.title,
    category: job.category || job.sector,
    description: job.description,
  };
  const scores = {
    skills: clampScore(localMatch.skillsMatchScore),
    experience: clampScore(localMatch.experienceMatchScore),
    domain: clampScore(overlapScore(candidateProfile, jobProfile)),
    education: clampScore(localMatch.educationMatchScore),
    softSkills: clampScore(overlapScore(
      SOFT_SKILLS.filter((skill) => new RegExp(skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(textOf(candidateProfile))),
      SOFT_SKILLS.filter((skill) => new RegExp(skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(textOf(jobProfile))),
    )),
  };
  const strengths = [
    `${scores.skills}% hard-skill coverage`,
    `${scores.experience}% experience alignment`,
    `${scores.domain}% domain alignment`,
  ].filter((_, index) => [scores.skills, scores.experience, scores.domain][index] >= 60);
  const gaps = [
    ...(localMatch.missingSkills || []).map((skill) => `Required skill not evidenced: ${skill}`),
    ...(scores.experience < 60 ? ['Experience requirements are not fully evidenced.'] : []),
    ...(scores.education < 60 ? ['Required education is not evidenced.'] : []),
    ...(scores.softSkills < 60 ? ['Relevant soft skills are not clearly evidenced.'] : []),
  ];

  return {
    ...scores,
    overallScore: calculateOverallScore(scores),
    strengths: strengths.slice(0, 8),
    gaps: gaps.slice(0, 12),
    provider: 'evidence-based',
  };
}

async function evaluateWithGemini({ cvText, candidate, job, fallback }) {
  if (!process.env.GEMINI_API_KEY) return fallback;

  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `Assess this CV against this job using only the supplied evidence. Never infer missing qualifications. Return JSON with dimensions containing numeric 0-100 scores for skills, experience, domain, education, softSkills; strengths (array of concise evidence-based strings); and gaps (array of missing or weak requirements). Do not return an overall score; the server applies fixed weights: skills 40%, experience 25%, domain 15%, education 10%, softSkills 10%.
Job: ${JSON.stringify({ title: job.title, category: job.category || job.sector, description: String(job.description || '').slice(0, 7000), requiredSkills: job.requiredSkills || [] })}
Candidate profile: ${JSON.stringify(candidate)}
CV text: ${String(cvText || '').slice(0, 14000)}`;
  const response = await client.models.generateContent({
    model: process.env.GEMINI_MATCHING_MODEL || 'gemini-2.5-flash',
    contents: prompt,
    config: { temperature: 0, responseMimeType: 'application/json' },
  });
  const raw = typeof response.text === 'function' ? response.text() : response.text;
  const parsed = JSON.parse(String(raw || '{}').replace(/^```(?:json)?\s*|\s*```$/g, ''));
  const dimensions = parsed.dimensions || {};
  const scores = Object.fromEntries(Object.keys(WEIGHTS).map((key) => [key, clampScore(dimensions[key])]));
  if (!Array.isArray(parsed.strengths) || !Array.isArray(parsed.gaps)) {
    throw new Error('Gemini response must include strengths and gaps arrays.');
  }
  return {
    ...scores,
    overallScore: calculateOverallScore(scores),
    strengths: parsed.strengths.map(String).slice(0, 8),
    gaps: parsed.gaps.map(String).slice(0, 12),
    provider: 'gemini',
  };
}

async function evaluateCvJobMatch({ cvText, candidate, job, localMatch, useGemini = true }) {
  const fallback = buildEvidenceEvaluation({ cvText, candidate, job, localMatch });
  if (!useGemini) return fallback;
  if (!process.env.GEMINI_API_KEY) {
    return { ...fallback, warning: 'Gemini API key is not configured.' };
  }

  try {
    const candidateName = String(candidate.fullName || '').trim();
    const anonymizedCv = String(cvText || '')
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
      .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, '[phone]')
      .replace(candidateName ? new RegExp(candidateName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi') : /$^/, '[candidate]');
    return await evaluateWithGemini({
      cvText: anonymizedCv,
      candidate: {
        headline: candidate.headline,
        skills: candidate.skills,
        experience: candidate.experience,
        education: candidate.education,
        educationLevel: candidate.educationLevel,
        experienceLevel: candidate.experienceLevel,
      },
      job,
      fallback,
    });
  } catch (error) {
    console.error('Gemini CV-job evaluation failed; using evidence-based score:', error.message);
    if (Number(error.status || error.statusCode) === 429 || /RESOURCE_EXHAUSTED|quota/i.test(String(error.message || ''))) {
      notifyAdminEvent('ADMIN_CRITICAL_SYSTEM_ERROR', {
        eventKey: `gemini-quota:${new Date().toISOString().slice(0, 10)}`,
        errorMessage: 'Gemini API quota exhausted',
        timestamp: new Date().toISOString(),
      }).catch((notificationError) => {
        console.error('Telegram Gemini quota alert failed:', notificationError.message);
      });
    }
    return { ...fallback, provider: 'evidence-based-fallback', warning: 'Gemini evaluation failed.' };
  }
}

module.exports = { evaluateCvJobMatch, WEIGHTS };
