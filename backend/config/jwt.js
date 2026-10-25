function getJwtSecret() {
  const secret = String(process.env.JWT_SECRET || '');
  if (Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters.');
  }
  return secret;
}

module.exports = { getJwtSecret };
