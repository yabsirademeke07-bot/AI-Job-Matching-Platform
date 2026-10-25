const db = require('../connection');
const smsService = require('../services/smsService');
const { createNotification } = require('../services/databaseNotificationService');

const isValidId = (value) => /^\d+$/.test(String(value || ''));
const toCommunication = (row) => ({
  id: row.id,
  applicationId: row.application_id,
  senderEmployerId: row.sender_employer_id,
  recipientSeekerId: row.recipient_seeker_id,
  messageBody: row.message_body,
  sentAt: row.sent_at,
  deliveryStatus: row.delivery_status,
  communicationType: row.communication_type,
  parentCommunicationId: row.parent_communication_id,
  jobTitle: row.job_title,
  companyName: row.company_name,
});

exports.dispatchEmployerSms = async (req, res) => {
  const applicationId = req.params.applicationId;
  const body = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  const template = typeof req.body?.template === 'string' ? req.body.template : 'status';
  const interviewAt = req.body?.interviewAt;
  const meetingType = typeof req.body?.meetingType === 'string' ? req.body.meetingType : '';
  const meetingLocation = typeof req.body?.meetingLocation === 'string' ? req.body.meetingLocation.trim() : '';
  if (!isValidId(applicationId) || body.length < 5 || body.length > 160) {
    return res.status(400).json({ success: false, message: 'A valid application and a message of 5–160 characters are required.' });
  }
  if (!['interview', 'documents', 'status'].includes(template)) {
    return res.status(400).json({ success: false, message: 'Choose a valid SMS template.' });
  }
  if (template === 'interview') {
    const dateTimeMatch = typeof interviewAt === 'string'
      ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.exec(interviewAt)
      : null;
    const interviewTimestamp = typeof interviewAt === 'string' ? Date.parse(interviewAt) : NaN;
    const [, yearValue, monthValue, dayValue, hourValue, minuteValue, secondValue] = dateTimeMatch || [];
    const [year, month, day, hour, minute, second] = [yearValue, monthValue, dayValue, hourValue, minuteValue, secondValue].map(Number);
    const validCalendarDate = Boolean(dateTimeMatch)
      && Number.isInteger(year)
      && Number.isInteger(month)
      && Number.isInteger(day)
      && Number.isInteger(hour)
      && hour <= 23
      && Number.isInteger(minute)
      && minute <= 59
      && Number.isInteger(second)
      && second <= 59
      && (() => {
        const date = new Date(Date.UTC(year, month - 1, day));
        return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
      })();
    if (!Number.isFinite(interviewTimestamp) || !validCalendarDate || interviewTimestamp <= Date.now()) {
      return res.status(400).json({ success: false, field: 'interviewAt', message: 'Please select a valid future date and time.' });
    }
    if (!['in_person', 'online'].includes(meetingType) || !meetingLocation || meetingLocation.length > 2000) {
      return res.status(400).json({ success: false, field: 'meetingLocation', message: 'Provide a valid office location or meeting link.' });
    }
    if (meetingType === 'online') {
      try {
        const meetingUrl = new URL(meetingLocation);
        if (!['http:', 'https:'].includes(meetingUrl.protocol)) throw new Error('Invalid meeting URL protocol.');
      } catch {
        return res.status(400).json({ success: false, field: 'meetingLocation', message: 'Provide a valid meeting link.' });
      }
    }
  }

  try {
    const [rows] = await db.execute(
      `SELECT a.id, a.job_id, a.job_seeker_id, a.status, u.phone,
              j.title AS job_title, j.company_name,
              COALESCE(p.sms_alerts_enabled, TRUE) AS sms_alerts_enabled
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN users u ON u.id = a.job_seeker_id
       LEFT JOIN sms_notification_preferences p ON p.user_id = a.job_seeker_id
       WHERE a.id = ? AND j.employer_id = ?`,
      [applicationId, req.user.id],
    );
    const application = rows[0];
    if (!application) return res.status(404).json({ success: false, message: 'Application not found.' });
    if (String(application.status || '').toLowerCase() !== 'shortlisted') {
      return res.status(409).json({ success: false, message: 'SMS invitations are available for shortlisted applicants.' });
    }
    if (!application.sms_alerts_enabled) {
      return res.status(403).json({ success: false, message: 'The candidate has turned off SMS communications.' });
    }
    if (!application.phone) {
      return res.status(409).json({ success: false, message: 'The candidate has no phone number on their account.' });
    }
    const phone = String(application.phone).replace(/[()\s-]/g, '');
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
      return res.status(409).json({ success: false, message: 'The candidate phone number must use international E.164 format.' });
    }

    const result = await smsService.sendAndRecordSms({
      applicationId,
      senderEmployerId: req.user.id,
      recipientSeekerId: application.job_seeker_id,
      to: phone,
      body,
    });
    if (result.providerError) {
      console.error('SMS dispatch failed:', result.providerError.message);
      return res.status(502).json({
        success: false,
        message: 'SMS could not be delivered. Check the SMS provider configuration.',
        communicationId: result.communicationId,
        deliveryStatus: result.deliveryStatus,
      });
    }
    let notificationCreated = true;
    try {
      const interviewLabel = template === 'interview'
        ? ` on ${new Date(interviewAt).toLocaleString()} (${meetingType === 'online' ? 'Online' : 'In-Person'}: ${meetingLocation})`
        : '';
      await createNotification({
        userId: application.job_seeker_id,
        type: template === 'interview' ? 'INTERVIEW' : 'MESSAGE',
        title: template === 'interview' ? 'Interview invitation' : 'Message from an employer',
        message: template === 'interview'
          ? `You have an interview invitation for ${application.job_title}${interviewLabel}.`
          : `You have a new message about your ${application.job_title} application.`,
        referenceType: 'APPLICATION',
        referenceId: application.id,
        jobId: application.job_id,
        applicationId: application.id,
        relatedUserId: req.user.id,
        actionUrl: '/my-applications',
      });
    } catch (notificationError) {
      notificationCreated = false;
      console.error('Candidate SMS notification could not be saved:', notificationError.message);
    }
    return res.status(201).json({
      success: true,
      notificationCreated,
      communication: {
        id: result.communicationId,
        deliveryStatus: result.deliveryStatus,
        providerMessageId: result.providerMessageId,
        deliveryMode: result.deliveryMode,
      },
    });
  } catch (error) {
    console.error('Employer SMS dispatch failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to dispatch SMS.' });
  }
};

exports.getEmployerSms = async (req, res) => {
  if (!isValidId(req.params.applicationId)) {
    return res.status(400).json({ success: false, message: 'A valid application id is required.' });
  }
  try {
    const [rows] = await db.execute(
      `SELECT c.*, j.title AS job_title, COALESCE(NULLIF(j.company_name, ''), employer.full_name) AS company_name
       FROM sms_communications c
       JOIN applications a ON a.id = c.application_id
       JOIN jobs j ON j.id = a.job_id
       JOIN users employer ON employer.id = c.sender_employer_id
       WHERE c.application_id = ? AND j.employer_id = ?
       ORDER BY c.sent_at DESC LIMIT 100`,
      [req.params.applicationId, req.user.id],
    );
    return res.json({ success: true, communications: rows.map(toCommunication) });
  } catch (error) {
    console.error('Employer SMS history load failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load SMS history.' });
  }
};

exports.getSeekerSms = async (req, res) => {
  try {
    await db.execute(
      `INSERT IGNORE INTO sms_notification_preferences (user_id, sms_alerts_enabled)
       VALUES (?, TRUE)`,
      [req.user.id],
    );
    const [[preferenceRows], [userRows], [communicationRows]] = await Promise.all([
      db.execute('SELECT sms_alerts_enabled FROM sms_notification_preferences WHERE user_id = ?', [req.user.id]),
      db.execute('SELECT phone FROM users WHERE id = ?', [req.user.id]),
      db.execute(
        `SELECT c.*, j.title AS job_title, COALESCE(NULLIF(j.company_name, ''), employer.full_name) AS company_name
         FROM sms_communications c
         JOIN applications a ON a.id = c.application_id
         JOIN jobs j ON j.id = a.job_id
         JOIN users employer ON employer.id = c.sender_employer_id
         WHERE c.recipient_seeker_id = ?
         ORDER BY c.sent_at DESC LIMIT 100`,
        [req.user.id],
      ),
    ]);
    return res.json({
      success: true,
      preference: { enabled: Boolean(preferenceRows[0]?.sms_alerts_enabled ?? true) },
      phone: userRows[0]?.phone || null,
      phoneVerified: false,
      communications: communicationRows.map(toCommunication),
    });
  } catch (error) {
    console.error('Seeker SMS history load failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load SMS communications.' });
  }
};

exports.updateSeekerSmsPreference = async (req, res) => {
  if (typeof req.body?.enabled !== 'boolean') {
    return res.status(400).json({ success: false, message: 'An enabled boolean is required.' });
  }
  try {
    await db.execute(
      `INSERT INTO sms_notification_preferences (user_id, sms_alerts_enabled)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE sms_alerts_enabled = VALUES(sms_alerts_enabled)`,
      [req.user.id, req.body.enabled],
    );
    return res.json({ success: true, enabled: req.body.enabled });
  } catch (error) {
    console.error('Seeker SMS preference update failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to update SMS preference.' });
  }
};

exports.replyToSms = async (req, res) => {
  const response = req.body?.response;
  if (!['confirm_attendance', 'request_reschedule'].includes(response)) {
    return res.status(400).json({ success: false, message: 'Choose a supported interview response.' });
  }
  if (!isValidId(req.params.communicationId)) {
    return res.status(400).json({ success: false, message: 'A valid communication id is required.' });
  }
  const replyText = response === 'confirm_attendance'
    ? 'Candidate confirmed interview attendance.'
    : 'Candidate requested to reschedule the interview.';
  try {
    const [rows] = await db.execute(
      `SELECT c.id, c.application_id, c.sender_employer_id, c.recipient_seeker_id
       FROM sms_communications c
       WHERE c.id = ? AND c.recipient_seeker_id = ? AND c.communication_type = 'employer'
         AND NOT EXISTS (
           SELECT 1 FROM sms_communications reply
           WHERE reply.parent_communication_id = c.id AND reply.communication_type = 'seeker_reply'
         )`,
      [req.params.communicationId, req.user.id],
    );
    const original = rows[0];
    if (!original) return res.status(404).json({ success: false, message: 'SMS communication not found.' });
    const [result] = await db.execute(
      `INSERT INTO sms_communications
        (application_id, sender_employer_id, recipient_seeker_id, message_body, delivery_status, communication_type, parent_communication_id)
       VALUES (?, ?, ?, ?, 'RECEIVED', 'seeker_reply', ?)`,
      [original.application_id, original.sender_employer_id, req.user.id, replyText, original.id],
    );
    return res.status(201).json({ success: true, communicationId: result.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'You have already responded to this interview invitation.' });
    }
    console.error('Seeker SMS response failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to save your interview response.' });
  }
};
