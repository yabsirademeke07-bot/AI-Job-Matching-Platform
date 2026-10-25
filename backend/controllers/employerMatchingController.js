const db = require('../connection');
const { createNotification } = require('../services/databaseNotificationService');
const { DEFAULT_WEIGHTS, getCandidateData, calculateCandidateMatch, validateWeights, parseJson } = require('../services/employerMatchingService');
const { notifyCandidateStatusUpdate } = require('../services/telegramNotifier');

const employerId = (req) => Number(req.user?.id || req.user?.userId || req.user?.user_id || req.user?.sub);
const validId = (value) => Number.isInteger(Number(value)) && Number(value) > 0;

async function getOwnedJob(jobId, ownerId) {
  const [rows] = await db.execute('SELECT * FROM jobs WHERE id = ? AND employer_id = ?', [jobId, ownerId]);
  return rows[0] || null;
}

async function getApplicationCandidates(jobId) {
  const [rows] = await db.execute(
        `SELECT a.id AS application_id, a.job_seeker_id AS candidate_id, a.status, a.resume_snapshot,
          a.applied_at, a.ai_match_score, a.skills_match_score, a.experience_match_score, a.title_match_score,
          a.domain_match_score, a.education_match_score, a.soft_skills_match_score,
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
  const prompt = `Evaluate candidate fit for this job using only the supplied evidence. Do not infer missing facts. Return JSON with compatibility_score (integer 0-100), match_summary (1-2 concise sentences), strengths (exactly 3 short strings), and missing_skills (array of unmet requirements).\nJob: ${JSON.stringify({ title: job.title, description: String(job.description || '').slice(0, 4000), requiredSkills: parseJson(job.required_skills, job.required_skills), requiredEducation: job.education_qualification, experienceLevel: job.experience_level, location: job.location, workMode: job.work_mode })}\nCandidate evidence: ${JSON.stringify({ title: candidate.currentTitle, skills: candidate.profile.skills, experience: candidate.profile.experience, education: candidate.profile.education, educationLevel: candidate.profile.educationLevel, certifications: candidate.profile.certifications, experienceYears: candidate.experienceYears, deterministicBreakdown: { skills: candidate.skillsScore, experience: candidate.experienceScore, education: candidate.educationScore, location: candidate.locationScore } })}`;
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
            `SELECT j.id, j.title, j.status, j.approval_status, j.location, j.work_mode,
              j.sector AS category, j.sub_sectors AS sub_category, j.vacancies,
              COUNT(a.id) AS applicants_count
       FROM jobs j LEFT JOIN applications a ON a.job_id = j.id
       WHERE j.employer_id = ?
       GROUP BY j.id ORDER BY j.created_at DESC`,
      [employerId(req)]
    );
    return res.json({ success: true, jobs: jobs.map((job) => ({
      ...job,
      department: job.category || job.department || 'General',
      vacancyCount: Number(job.vacancies || 1),
      applicantsCount: Number(job.applicants_count),
    })) });
  } catch (error) {
    console.error('Employer matching jobs error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load employer jobs.' });
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
      const finalScore = candidate.matchScore;
      await db.execute(
        `UPDATE applications SET ai_match_score = ?, skills_match_score = ?, experience_match_score = ?,
           title_match_score = ?, education_match_score = ?, location_match_score = ?, work_mode_match_score = ?,
           ai_match_summary = ?, ai_strengths = ?, ai_missing_skills = ?, evaluated_at = NOW()
         WHERE id = ? AND job_id = ?`,
        [finalScore, candidate.skillsScore, candidate.experienceScore, candidate.titleScore, candidate.educationScore,
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

exports.rankCandidates = async (req, res) => {
  const jobId = Number(req.params.jobId);
  const topCount = Number(req.body?.topCount);
  const minScore = Number(req.body?.minScore ?? 60);
  if (!validId(jobId)) return res.status(400).json({ success: false, message: 'A valid job id is required.' });
  if (!Number.isInteger(topCount) || topCount < 1 || topCount > 200) {
    return res.status(400).json({ success: false, message: 'topCount must be a whole number from 1 to 200.' });
  }
  if (!Number.isFinite(minScore) || minScore < 0 || minScore > 100) {
    return res.status(400).json({ success: false, message: 'minScore must be a number from 0 to 100.' });
  }

  try {
    const job = await getOwnedJob(jobId, employerId(req));
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });
    const weights = { ...DEFAULT_WEIGHTS };
    const scoredCandidates = (await getApplicationCandidates(jobId))
      .map((candidate) => {
        const match = calculateCandidateMatch(candidate, job, weights);
        const score = Number((
          match.skillsScore * 0.45
          + match.experienceScore * 0.35
          + match.educationScore * 0.20
        ).toFixed(2));
        return {
          ...match,
          matchScore: score,
          ai_score: score,
          compatibility_score: score,
          matchSummary: [
            `${match.matchedSkills.length} of ${match.matchedSkills.length + match.missingSkills.length} required skills align with the role.`,
            `${match.experienceYears} years of experience and the candidate's education were compared with the job requirements.`,
          ].join(' '),
        };
      })
      .sort((first, second) => second.matchScore - first.matchScore || Number(second.applicationId) - Number(first.applicationId));
    const eligibleCandidates = scoredCandidates.filter((candidate) => candidate.matchScore >= minScore);
    const selectedCandidates = eligibleCandidates.slice(0, topCount);
    const evaluations = await Promise.all(selectedCandidates.slice(0, 5).map(async (candidate) => {
      if (!process.env.GEMINI_API_KEY) return [candidate, fallbackEvaluation(candidate), false];
      try {
        return [candidate, await evaluateWithGemini(candidate, job), true];
      } catch (error) {
        console.warn(`Gemini matching evaluation failed for application ${candidate.applicationId}:`, error.message);
        return [candidate, fallbackEvaluation(candidate), false];
      }
    }));
    const evaluationByApplication = new Map(
      evaluations.map(([candidate, evaluation]) => [candidate.applicationId, evaluation]),
    );

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      for (const candidate of scoredCandidates) {
        const evaluation = evaluationByApplication.get(candidate.applicationId) || fallbackEvaluation(candidate);
        const summary = String(evaluation.match_summary || candidate.matchSummary).slice(0, 1000);
        const strengths = Array.isArray(evaluation.strengths) ? evaluation.strengths : candidate.strengths;
        const missingSkills = Array.isArray(evaluation.missing_skills) ? evaluation.missing_skills : candidate.missingSkills;
        await connection.execute(
          `UPDATE applications SET ai_match_score = ?, skills_match_score = ?, experience_match_score = ?,
             title_match_score = ?, education_match_score = ?, location_match_score = ?, work_mode_match_score = ?,
             ai_match_summary = ?, ai_strengths = ?, ai_missing_skills = ?, evaluated_at = NOW()
           WHERE id = ? AND job_id = ?`,
          [candidate.matchScore, candidate.skillsScore, candidate.experienceScore, candidate.titleScore,
            candidate.educationScore, candidate.locationScore, candidate.locationScore, summary, JSON.stringify(strengths),
            JSON.stringify(missingSkills), candidate.applicationId, jobId],
        );
        candidate.matchSummary = summary;
        candidate.strengths = strengths;
        candidate.missingSkills = missingSkills;
        candidate.evaluatedAt = new Date().toISOString();
      }
      await connection.commit();
    } catch (error) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Employer AI candidate ranking rollback error:', rollbackError);
      }
      throw error;
    } finally {
      connection.release();
    }

    return res.json({
      success: true,
      job: { id: job.id, title: job.title },
      topCount,
      minScore,
      totalApplicants: scoredCandidates.length,
      eligibleCount: eligibleCandidates.length,
      geminiEnabled: Boolean(process.env.GEMINI_API_KEY),
      aiEvaluatedCount: evaluations.filter(([, , aiGenerated]) => aiGenerated).length,
      candidates: selectedCandidates,
    });
  } catch (error) {
    console.error('Employer AI candidate ranking error:', error);
    return res.status(500).json({ success: false, message: 'Failed to rank candidates.' });
  }
};

exports.bulkUpdateApplicationStatus = async (req, res) => {
  const rawIds = req.body?.applicationIds;
  const requestedStatus = String(req.body?.status || '').trim().toLowerCase();
  const status = requestedStatus === 'interview_scheduled' ? 'interview-scheduled' : requestedStatus;
  if (!Array.isArray(rawIds) || rawIds.length < 1 || rawIds.length > 200) {
    return res.status(400).json({ success: false, message: 'Provide between 1 and 200 application ids.' });
  }
  const applicationIds = [...new Set(rawIds.map(Number))];
  if (applicationIds.some((id) => !validId(id))) {
    return res.status(400).json({ success: false, message: 'Every application id must be a positive integer.' });
  }
  if (!['shortlisted', 'interview-scheduled'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Status must be shortlisted or interview_scheduled.' });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const placeholders = applicationIds.map(() => '?').join(', ');
    const [ownedApplications] = await connection.execute(
      `SELECT a.id, a.status, a.job_seeker_id AS candidateId, u.full_name AS candidateName,
              j.title AS jobTitle, j.company_name AS companyName
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN users u ON u.id = a.job_seeker_id
       WHERE a.id IN (${placeholders}) AND j.employer_id = ?
       FOR UPDATE`,
      [...applicationIds, employerId(req)],
    );
    if (ownedApplications.length !== applicationIds.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'One or more applications were not found for this employer.' });
    }

    await connection.execute(
      `UPDATE applications SET status = ? WHERE id IN (${placeholders})`,
      [status, ...applicationIds],
    );
    const timelineRows = ownedApplications
      .filter((application) => application.status !== status)
      .map((application) => [application.id, status === 'shortlisted' ? 'Shortlisted' : 'Interview', `Application status updated to ${status} by the employer.`]);
    if (timelineRows.length) {
      const timelinePlaceholders = timelineRows.map(() => '(?, ?, ?)').join(', ');
      await connection.execute(
        `INSERT INTO application_timeline_events (application_id, stage_name, status_note) VALUES ${timelinePlaceholders}`,
        timelineRows.flat(),
      );
    }
    await connection.commit();
    const changedApplications = ownedApplications.filter(
      (application) => String(application.status).toLowerCase() !== status,
    );
    const telegramNotifications = { sentCount: 0, failedCount: 0, skippedCount: 0 };
    for (const application of changedApplications) {
      try {
        const telegramResult = await notifyCandidateStatusUpdate(application.candidateId, {
          applicationId: Number(application.id),
          candidateName: application.candidateName,
          jobTitle: application.jobTitle,
          company: application.companyName,
          newStatus: status === 'shortlisted' ? 'Shortlisted' : 'Interview',
        });
        if (telegramResult?.delivered) telegramNotifications.sentCount += 1;
        else telegramNotifications.skippedCount += 1;
      } catch (telegramError) {
        telegramNotifications.failedCount += 1;
        console.error(`Telegram bulk status alert failed for application ${application.id}:`, telegramError.message);
      }
    }
    return res.json({
      success: true,
      status,
      updatedCount: applicationIds.length,
      applicationIds,
      telegramSent: changedApplications.length > 0
        && telegramNotifications.sentCount === changedApplications.length,
      telegramNotifications,
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Employer bulk application status rollback error:', rollbackError);
      }
    }
    console.error('Employer bulk application status update error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update application statuses.' });
  } finally {
    connection?.release();
  }
};

exports.shortlist = async (req, res) => {
  const applicationId = Number(req.body?.applicationId || req.body?.application_id);
  try {
    if (!validId(applicationId)) return res.status(400).json({ success: false, message: 'A valid application id is required.' });
    const [applications] = await db.execute(
      `SELECT a.id, a.status, a.job_id AS jobId, a.job_seeker_id AS candidateId,
              u.full_name AS candidateName,
              j.title AS jobTitle, j.company_name AS companyName
       FROM applications a JOIN jobs j ON j.id = a.job_id JOIN users u ON u.id = a.job_seeker_id
       WHERE a.id = ? AND j.employer_id = ?`,
      [applicationId, employerId(req)]
    );
    if (!applications.length) return res.status(404).json({ success: false, message: 'Application not found.' });
    await db.execute('UPDATE applications SET status = ? WHERE id = ?', ['shortlisted', applicationId]);
    const application = applications[0];
    if (String(application.status || '').toLowerCase() !== 'shortlisted') {
      await db.execute(
        `INSERT INTO application_timeline_events (application_id, stage_name, status_note)
         VALUES (?, 'Shortlisted', 'Application shortlisted by the employer.')`,
        [applicationId],
      );
    }
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
    let telegramNotification = { sent: false, message: 'No application status change was sent to Telegram.' };
    if (String(application.status || '').toLowerCase() !== 'shortlisted') {
      try {
        const telegramResult = await notifyCandidateStatusUpdate(application.candidateId, {
          applicationId: Number(applicationId),
          candidateName: application.candidateName,
          jobTitle: application.jobTitle,
          company: application.companyName,
          newStatus: 'Shortlisted',
        });
        telegramNotification = {
          sent: Boolean(telegramResult?.delivered),
          message: telegramResult?.delivered
            ? telegramResult?.fallback
              ? 'Candidate shortlisted; notification sent to the configured admin chat.'
              : 'Status update sent on Telegram.'
            : 'Telegram status update was not delivered.',
        };
      } catch (telegramError) {
        console.error('Telegram shortlist alert failed:', telegramError.message);
        telegramNotification = { sent: false, message: 'Candidate shortlisted, but the Telegram alert could not be delivered.' };
      }
    }
    return res.json({ success: true, status: 'shortlisted', telegramSent: telegramNotification.sent, telegramNotification });
  } catch (error) {
    console.error('Employer candidate shortlist error:', error);
    return res.status(500).json({ success: false, message: 'Failed to shortlist candidate.' });
  }
};