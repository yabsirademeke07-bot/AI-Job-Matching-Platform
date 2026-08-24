const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('../connection');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        const googleId = profile.id;
        const fullName = profile.displayName || 'Google User';

        if (!email) {
          return done(new Error('No email found from Google account'), null);
        }

        // 1. Check if user exists by google_id or email
        const [rows] = await db.query(
          'SELECT * FROM users WHERE google_id = ? OR email = ?',
          [googleId, email]
        );
        let user = rows[0];

        if (!user) {
          // 2. New user registration
          const [result] = await db.query(
            'INSERT INTO users (full_name, email, google_id, role) VALUES (?, ?, ?, ?)',
            [fullName, email, googleId, 'pending']
          );
          user = { 
            id: result.insertId, 
            full_name: fullName, 
            email, 
            google_id: googleId, 
            role: 'pending'
          };
        } else if (!user.google_id) {
          // 3. Link Google ID
          await db.query(
            'UPDATE users SET google_id = ? WHERE id = ?', 
            [googleId, user.id]
          );
          user.google_id = googleId;
        }

        return done(null, user);
      } catch (error) {
        console.error('Passport Google Strategy Error:', error);
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    done(null, rows[0]);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;