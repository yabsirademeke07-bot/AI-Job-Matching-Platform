const db = require('../connection');

const notificationTypes = new Set([
  'APPLICATION',
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

const createNotification = async ({ userId, type = 'SYSTEM', title, message, referenceType = null, referenceId = null, jobId = null, applicationId = null, relatedUserId = null }) => {
  if (!userId || !title || !message) return null;
  const normalizedType = notificationTypes.has(type) ? type : 'SYSTEM';
  const [result] = await db.execute(
    `INSERT INTO notifications
      (user_id, type, title, message, reference_type, reference_id, related_job_id, related_application_id, related_user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
    [userId, normalizedType, title, message, referenceType, referenceId || null, jobId || null, applicationId || null, relatedUserId || null]
  );
  return result.insertId;
};

module.exports = { createNotification };
