const matchModel = require('../models/matchModel');
const db = require('../connection');

async function applyToJob(req, res) {
  const { jobId, seekerSkills = [], requiredSkills = [], coverLetter } = req.body;
  if (!jobId) return res.status(400).json({ success: false, message: 'jobId is required.' });
  try {
    const score = matchModel.calculateMatchScore(seekerSkills, requiredSkills);
    const applicationId = await matchModel.createMatch({ jobId, jobSeekerId: req.user.id, score, coverLetter });
    try {
      await db.execute(`
        INSERT INTO user_activity_log
          (user_id, activity_type, description, details, related_job_id, ip_address, user_agent)
        VALUES (?, 'job-apply', ?, ?, ?, ?, ?)
      `, [req.user.id, `Applied for job #${jobId}`.slice(0, 255), JSON.stringify({ recordId: applicationId, applicationId, relatedJobId: Number(jobId), oldValues: null, newValues: { matchScore: score }, ipAddress: req.ip, userAgent: req.get('user-agent') }), jobId, req.ip, req.get('user-agent')]);
    } catch (auditError) {
      console.warn('Legacy application audit log skipped:', auditError.message);
    }
    return res.status(201).json({ success: true, applicationId, matchScore: score });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'You have already applied to this job.' });
    return res.status(500).json({ success: false, message: 'Unable to submit application.' });
  }
}

async function getMyMatches(req, res) {
  try {
    return res.json({ success: true, matches: await matchModel.findMatchesForSeeker(req.user.id) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load matches.' });
  }
}

module.exports = { applyToJob, getMyMatches };
