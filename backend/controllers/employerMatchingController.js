const db = require('../connection');
const { createNotification } = require('../services/databaseNotificationService');
const { DEFAULT_WEIGHTS, getCandidateData, calculateCandidateMatch, validateWeights, parseJson } = require('../services/employerMatchingService');

const employerId = (req) => Number(req.user?.id || req.user?.userId || req.user?.user_id || req.user?.sub);
const validId = (value) => Number.isInteger(Number(value)) && Number(value) > 0;

async function getOwnedJob(jobId, ownerId) {
  const [rows] = await db.execute('SELECT * FROM jobs WHERE id = ? AND employer_id = ?', [jobId, ownerId]);
  return rows[0] || null;
}

async function getApplicationCandidates(jobId) {
  const [rows] = await db.execute(
        `SELECT a.id AS application_id, a.job_seeker_id AS candidate_id, a.status, a.resume_snapshot,
          a.ai_match_score, a.skills_match_score, a.experience_match_score, a.education_match_score,
          a.location_match_score, a.ai_match_summary, a.ai_strengths, a.ai_missing_skills, a.evaluated_at,
            u.full_name, u.email, u.avatar_url,
            jsp.headline, jsp.experience_level, jsp.education_level, jsp.location AS profile_location,
            jsp.city, jsp.skills AS profile_skills, jsp.education AS profile_education,
            jsp.preferred_work_mode, jsp.work_setup, jsp.parsed_json_payload,
            c.file_url, c.file_name, c.ai_extracted_data,
            ca.extracted_skills, ca.extracted_experience, ca.extracted_education, ca.extracted_certifications
     FROM applications a
     JOIN users u ON u.id = a.job_seeker_id
     LEFT JOIN job_seeker_profiles jsp ON jsp.user_id = u.id
     LEFT JOIN cvs c ON c.id = a.cv_id
     LEFT JOIN cv_analysis ca ON ca.cv_id = c.id
     WHERE a.job_id = ?
    ORDER BY a.ai_match_score DESC, a.applied_at DESC LIMIT 200`,
    [jobId]
  );
  return rows.map(getCandidateData);
}

async function getRecommendedCandidates(jobId) {
  const [rows] = await db.execute(
        `SELECT NULL AS application_id, u.id AS candidate_id, NULL AS status, NULL AS resume_snapshot,
          NULL AS ai_match_score, NULL AS skills_match_score, NULL AS experience_match_score,
          NULL AS education_match_score, NULL AS location_match_score, NULL AS ai_match_summary,
          NULL AS ai_strengths, NULL AS ai_missing_skills, NULL AS evaluated_at,
            u.full_name, u.email, u.avatar_url,
            jsp.headline, jsp.experience_level, jsp.education_level, jsp.location AS profile_location,
            jsp.city, jsp.skills AS profile_skills, jsp.education AS profile_education,
            jsp.preferred_work_mode, jsp.work_setup, jsp.parsed_json_payload,
            c.file_url, c.file_name, c.ai_extracted_data,
            ca.extracted_skills, ca.extracted_experience, ca.extracted_education, ca.extracted_certifications
     FROM users u
     JOIN job_seeker_profiles jsp ON jsp.user_id = u.id
     LEFT JOIN cvs c ON c.user_id = u.id AND c.is_primary = TRUE
     LEFT JOIN cv_analysis ca ON ca.cv_id = c.id
     WHERE u.role = 'job_seeker' AND jsp.is_open_to_opportunities = TRUE
       AND NOT EXISTS (SELECT 1 FROM applications a WHERE a.job_id = ? AND a.job_seeker_id = u.id)
     ORDER BY jsp.profile_completion_percentage DESC, u.created_at DESC LIMIT 20`,
    [jobId]
  );
  return rows.map(getCandidateData);
}

function fallbackEvaluation(candidate) {
  return {
    compatibility_score: candidate.matchScore,
    match_summary: candidate.matchSummary,
    strengths: candidate.strengths,
    missing_skills: candidate.missingSkills,
  };
}

async function evaluateWithGemini(candidate, job) {
  const { GoogleGenAI } = require('@google/genai');
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `Evaluate candidate fit for this job using only the supplied evidence. Do not infer missing facts. Return JSON with compatibility_score (integer 0-100), match_summary (1-2 concise sentences), strengths (exactly 3 short strings), and missing_skills (array of unmet requirements).\nJob: ${JSON.stringify({ title: job.title, description: String(job.description || '').slice(0, 4000), requiredSkills: parseJson(job.required_skills, job.required_skills), requiredEducation: job.required_education, experienceLevel: job.vacancy_level || job.experience_level, yearsRequired: job.years_of_experience_min, location: job.location, workMode: job.work_mode })}\nCandidate evidence: ${JSON.stringify({ title: candidate.currentTitle, skills: candidate.profile.skills, experience: candidate.profile.experience, education: candidate.profile.education, educationLevel: candidate.profile.educationLevel, certifications: candidate.profile.certifications, experienceYears: candidate.experienceYears, deterministicBreakdown: { skills: candidate.skillsScore, experience: candidate.experienceScore, education: candidate.educationScore, location: candidate.locationScore } })}`;
  const response = await client.models.generateContent({
    model: process.env.GEMINI_MATCHING_MODEL || 'gemini-2.5-flash',
    contents: prompt,
    config: { temperature: 0, responseMimeType: 'application/json' },
  });
  const content = typeof response.text === 'function' ? response.text() : response.text;
  const parsed = JSON.parse(String(content || '{}').replace(/^```(?:json)?\s*|\s*```$/g, ''));
  const score = Number(parsed.compatibility_score);
  if (!Number.isFinite(score)) throw new Error('Gemini response did not include a numeric compatibility score.');
  return {
    compatibility_score: Math.max(0, Math.min(100, Math.round(score))),
    match_summary: String(parsed.match_summary || candidate.matchSummary).slice(0, 1000),
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String).slice(0, 3) : candidate.strengths,
    missing_skills: Array.isArray(parsed.missing_skills) ? parsed.missing_skills.map(String).slice(0, 20) : candidate.missingSkills,
  };
}

exports.getJobs = async (req, res) => {
  try {
    const [jobs] = await db.execute(
      `SELECT j.id, j.title, j.status, j.location, j.work_mode,
              COUNT(a.id) AS applicants_count
       FROM jobs j LEFT JOIN applications a ON a.job_id = j.id
       WHERE j.employer_id = ? AND j.status IN ('published', 'active')
       GROUP BY j.id ORDER BY j.created_at DESC`,
      [employerId(req)]
    );
    return res.json({ success: true, jobs: jobs.map((job) => ({ ...job, applicantsCount: Number(job.applicants_count) })) });
  } catch (error) {
    console.error('Employer matching jobs error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load active jobs.' });
  }
};

exports.getCandidates = async (req, res) => {
  const jobId = Number(req.params.jobId);
  try {
    if (!validId(jobId)) return res.status(400).json({ success: false, message: 'A valid job id is required.' });
    const job = await getOwnedJob(jobId, employerId(req));
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });
    const candidates = await getApplicationCandidates(jobId);
    const recommendedCandidates = candidates.length < 3
      ? (await getRecommendedCandidates(jobId)).map((candidate) => calculateCandidateMatch(candidate, job, DEFAULT_WEIGHTS))
      : [];
    return res.json({ success: true, job: { id: job.id, title: job.title }, candidates, recommendedCandidates });
  } catch (error) {
    console.error('Employer matching candidates error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load matching candidates.' });
  }
};

exports.runMatching = async (req, res) => {
  const jobId = Number(req.params.jobId);
  let weights;
  try { weights = validateWeights(req.body?.weights || DEFAULT_WEIGHTS); }
  catch (error) { return res.status(400).json({ success: false, message: error.message }); }
  try {
    if (!validId(jobId)) return res.status(400).json({ success: false, message: 'A valid job id is required.' });
    const job = await getOwnedJob(jobId, employerId(req));
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });
    const candidates = (await getApplicationCandidates(jobId)).map((candidate) => calculateCandidateMatch(candidate, job, weights));
    const topCandidates = [...candidates].sort((first, second) => second.matchScore - first.matchScore).slice(0, 5);
    const evaluations = await Promise.all(topCandidates.map(async (candidate) => {
      if (!process.env.GEMINI_API_KEY) return [candidate, fallbackEvaluation(candidate)];
      try { return [candidate, await evaluateWithGemini(candidate, job)]; }
      catch (error) {
        console.warn(`Gemini matching evaluation failed for application ${candidate.applicationId}:`, error.message);
        return [candidate, fallbackEvaluation(candidate)];
      }
    }));
    const evaluationByApplication = new Map(evaluations.map(([candidate, evaluation]) => [candidate.applicationId, evaluation]));
    for (const candidate of candidates) {
      const evaluation = evaluationByApplication.get(candidate.applicationId) || fallbackEvaluation(candidate);
      const finalScore = evaluation.compatibility_score;
      await db.execute(
        `UPDATE applications SET ai_match_score = ?, skills_match_score = ?, experience_match_score = ?,
           education_match_score = ?, location_match_score = ?, work_mode_match_score = ?,
           ai_match_summary = ?, ai_strengths = ?, ai_missing_skills = ?, evaluated_at = NOW()
         WHERE id = ? AND job_id = ?`,
        [finalScore, candidate.skillsScore, candidate.experienceScore, candidate.educationScore,
          candidate.locationScore, candidate.locationScore, evaluation.match_summary,
          JSON.stringify(evaluation.strengths), JSON.stringify(evaluation.missing_skills), candidate.applicationId, jobId]
      );
      candidate.matchScore = finalScore;
      candidate.ai_score = finalScore;
      candidate.compatibility_score = finalScore;
      candidate.matchSummary = evaluation.match_summary;
      candidate.match_summary = evaluation.match_summary;
      candidate.strengths = evaluation.strengths;
      candidate.missingSkills = evaluation.missing_skills;
      candidate.missing_skills = evaluation.missing_skills;
      candidate.evaluatedAt = new Date().toISOString();
    }
    candidates.sort((first, second) => second.matchScore - first.matchScore);
    return res.json({ success: true, count: candidates.length, weights, geminiEnabled: Boolean(process.env.GEMINI_API_KEY), candidates });
  } catch (error) {
    console.error('Employer matching run error:', error);
    return res.status(500).json({ success: false, message: 'Failed to score candidates.' });
  }
};

exports.shortlist = async (req, res) => {
  const applicationId = Number(req.body?.applicationId || req.body?.application_id);
  try {
    if (!validId(applicationId)) return res.status(400).json({ success: false, message: 'A valid application id is required.' });
    const [applications] = await db.execute(
      `SELECT a.id, a.job_id AS jobId, a.job_seeker_id AS candidateId,
              u.full_name AS candidateName, j.title AS jobTitle
       FROM applications a JOIN jobs j ON j.id = a.job_id JOIN users u ON u.id = a.job_seeker_id
       WHERE a.id = ? AND j.employer_id = ?`,
      [applicationId, employerId(req)]
    );
    if (!applications.length) return res.status(404).json({ success: false, message: 'Application not found.' });
    await db.execute('UPDATE applications SET status = ? WHERE id = ?', ['shortlisted', applicationId]);
    const application = applications[0];
    await createNotification({
      userId: application.candidateId,
      type: 'SHORTLIST',
      title: 'Candidate Shortlisted',
      message: `You have been shortlisted for ${application.jobTitle}.`,
      referenceType: 'SHORTLIST',
      referenceId: application.jobId,
      jobId: application.jobId,
      applicationId,
      relatedUserId: employerId(req),
    });
    return res.json({ success: true, status: 'shortlisted' });
  } catch (error) {
    console.error('Employer candidate shortlist error:', error);
    return res.status(500).json({ success: false, message: 'Failed to shortlist candidate.' });
  }
};