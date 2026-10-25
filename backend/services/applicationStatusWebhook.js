const axios = require('axios');

async function dispatchApplicationStatusWebhook(payload) {
  const webhookUrl = process.env.APPLICATION_STATUS_WEBHOOK_URL;
  if (!webhookUrl) return;

  const headers = process.env.APPLICATION_STATUS_WEBHOOK_SECRET
    ? { 'x-webhook-secret': process.env.APPLICATION_STATUS_WEBHOOK_SECRET }
    : {};
  try {
    await axios.post(webhookUrl, payload, { headers, timeout: 5000 });
  } catch (error) {
    console.error('Application status notification webhook failed:', error.response?.status || error.code || error.message);
  }
}

module.exports = { dispatchApplicationStatusWebhook };
