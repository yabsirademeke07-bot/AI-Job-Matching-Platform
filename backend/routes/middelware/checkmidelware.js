const jwt = require('jsonwebtoken');

// ከ authController.js ጋር ተመሳሳይ የሆነ Secret Key መጠቀም አለብን
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_here';

// 1. Authentication Check (Token መኖሩን እና ትክክለኛነቱን ማረጋገጫ)
const protect = async (req, res, next) => {
  let token;

  // Header ውስጥ Bearer Token መኖሩን ማረጋገጥ
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Token ማውጣት
      token = req.headers.authorization.split(' ')[1];

      // Token Verify ማድረግ
      const decoded = jwt.verify(token, JWT_SECRET);

      // User payload (userId, email, role) በ request object ላይ መጫን
      req.user = decoded;

      return next(); // ወደ ቀጣዩ controller ይለፈዋል
    } catch (error) {
      console.error('JWT Verification Error:', error.message);
      return res.status(401).json({
        success: false,
        message: 'ተጠቃሚው አልገባም (Token የተሳሳተ ወይም የጊዜ ገደቡ ያለፈበት ነው) - እባክዎ እንደገና Login ያድርጉ!',
      });
    }
  }

  // Token ከሌለ
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token አልተገኘም! እባክዎ አስቀድመው ይግቡ እና Login ያድርጉ።',
    });
  }
};

// 2. Role-Based Access Control (የተጠቃሚዎችን Role የመገደቢያ Middleware)
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        success: false,
        message: 'ይህንን አገልግሎት ለማግኘት የመግባት ፈቃድ የለዎትም።',
      });
    }

    // የተጠቃሚው ሮል ከተፈቀዱት ሮሎች ውስጥ ከሌለ
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `የእርስዎ ሚና (${req.user.role}) ይህንን ገጽ ወይም API የመጠቀም ፈቃድ የለውም።`,
      });
    }

    next();
  };
};

module.exports = { 
  protect, 
  authorize 
};