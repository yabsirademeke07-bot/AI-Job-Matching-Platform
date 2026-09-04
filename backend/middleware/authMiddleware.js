const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return res.status(401).json({ success: false, message: 'Authentication required.' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

module.exports = authMiddleware;
