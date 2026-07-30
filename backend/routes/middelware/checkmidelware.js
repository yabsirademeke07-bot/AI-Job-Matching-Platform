const jwt = require('jsonwebtoken');

const protect = async (req, res, next) => {
  let token;

  // 1. Header ውስጥ Bearer Token መኖሩን ማረጋገጥ
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Token ማውጣት
      token = req.headers.authorization.split(' ')[1];

      // Token Verify ማድረግ
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');

      // User ID በ request object ላይ መጫን
      req.user = decoded;

      next(); // ወደ ቀጣዩ controller ይለፈዋል
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'ተጠቃሚው አልገባም (Unauthorized) - እባክዎ አስቀድመው ይግቡ!',
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token አልተገኘም! እባክዎ አስቀድመው ይግቡ እና Login ያድርጉ።',
    });
  }
};

module.exports = { protect };