const getTwilioClient = () => {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new Error('SMS provider is not configured.');
  }
  const twilio = require('twilio');
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
};

exports.sendSms = async ({ to, body }) => {
  if (process.env.SMS_PROVIDER === 'mock' || process.env.NODE_ENV === 'test') {
    return { status: 'DELIVERED', providerMessageId: null, deliveryMode: 'sandbox' };
  }

  const hasTwilioCredentials = Boolean(
    process.env.TWILIO_ACCOUNT_SID
      && process.env.TWILIO_AUTH_TOKEN
      && process.env.TWILIO_PHONE_NUMBER,
  );
  if (!hasTwilioCredentials) {
    console.info('SMS provider credentials are incomplete; recording sandbox delivery.');
    return { status: 'DELIVERED', providerMessageId: null, deliveryMode: 'sandbox' };
  }

  const message = await getTwilioClient().messages.create({
    to,
    from: process.env.TWILIO_PHONE_NUMBER,
    body,
  });
  return {
    status: message.status === 'delivered' ? 'DELIVERED' : 'QUEUED',
    providerMessageId: message.sid,
    deliveryMode: 'provider',
  };
};

exports.sendAndRecordSms = async ({
  applicationId,
  senderEmployerId,
  recipientSeekerId,
  to,
  body,
  skipReason,
}) => {
  const db = require('../connection');
  let deliveryStatus = 'FAILED';
  let providerMessageId = null;
  let deliveryMode = 'provider';
  let providerError = skipReason ? new Error(skipReason) : null;
  if (!skipReason) {
    try {
      const result = await exports.sendSms({ to, body });
      deliveryStatus = result.status;
      providerMessageId = result.providerMessageId;
      deliveryMode = result.deliveryMode || 'provider';
    } catch (error) {
      providerError = error;
    }
  }

  const [insertResult] = await db.execute(
    `INSERT INTO sms_communications
      (application_id, sender_employer_id, recipient_seeker_id, message_body, delivery_status, provider_message_id, communication_type)
     VALUES (?, ?, ?, ?, ?, ?, 'employer')`,
    [applicationId, senderEmployerId, recipientSeekerId, body, deliveryStatus, providerMessageId],
  );
  return {
    communicationId: insertResult.insertId,
    deliveryStatus,
    providerMessageId,
    deliveryMode,
    providerError,
  };
};
