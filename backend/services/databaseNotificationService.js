const db = require('../connection');

const notificationTypes = new Set([
  'APPLICATION',
  'NEW_APPLICATION',
  'NEW_JOB_ALERT',
  'STATUS_CHANGE',
  'SHORTLIST',
  'INTERVIEW',
  'MESSAGE',
  'AI_MATCH',
  'JOB_STATUS',
  'VERIFICATION',
  'INVITATION',
  'HIRING',
  'SYSTEM',
]);

const createNotification = async ({ executor = db, userId, type = 'SYSTEM', title, message, referenceType = null, referenceId = null, jobId = null, applicationId = null, relatedUserId = null, actionUrl = null }) => {
  if (!userId || !title || !message) return null;
  const normalizedType = notificationTypes.has(type) ? type : 'SYSTEM';
  const [result] = await executor.execute(
    `INSERT INTO notifications
      (user_id, type, title, message, reference_type, reference_id, related_job_id, related_application_id, related_user_id, action_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
    [userId, normalizedType, title, message, referenceType, referenceId || null, jobId || null, applicationId || null, relatedUserId || null, actionUrl]
  );
  return result.insertId;
};

const notifySeekersAboutJob = async ({ employerId, jobId, title, companyName, location }) => {
  const [seekers] = await db.execute(
    `SELECT id
     FROM users
     WHERE LOWER(role) IN ('job_seeker', 'seeker', 'jobseeker', 'user', 'employee')
       AND is_active = TRUE
       AND is_verified = TRUE
       AND id <> ?`,
    [employerId],
  );
  if (!seekers.length) return 0;

  const message = `${companyName || 'An employer'} has posted a new opening for ${title}${location ? ` in ${location}` : ''}.`;
  const values = seekers.map(({ id }) => [
    id,
    'NEW_JOB_ALERT',
    `New Job Alert: ${title}`,
    message,
    'JOB',
    jobId,
    jobId,
    `/jobs/${jobId}`,
  ]);

  const batchSize = 500;
  for (let offset = 0; offset < values.length; offset += batchSize) {
    const batch = values.slice(offset, offset + batchSize);
    const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    await db.execute(
      `INSERT INTO notifications
        (user_id, type, title, message, reference_type, reference_id, related_job_id, action_url)
       VALUES ${placeholders}`,
      batch.flat(),
    );
  }

  return values.length;
};

module.exports = { createNotification, notifySeekersAboutJob };
