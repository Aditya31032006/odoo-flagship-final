import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import config from './config.js';
import { findUserRepo, createUserRepo } from '../repositories/auth.repository.js';
import { addWelcomeEmailJob } from '../jobs/emailQueue.js';

passport.use(
  new GoogleStrategy(
    {
      clientID: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
      callbackURL: '/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase();
        const name = profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim() || 'Google User';
        const profilePhoto = profile.photos?.[0]?.value || null;

        if (!email) {
          return done(new Error('No email found in Google profile'), null);
        }

        let user = await findUserRepo(email);

        if (!user) {
          // Create new user without password for OAuth
          user = await createUserRepo({
            name,
            email,
            password: null,
            profile_photo_base64: profilePhoto,
          });

          // Enqueue welcome email asynchronously
          try {
            await addWelcomeEmailJob({ name: user.name, email: user.email });
          } catch (queueErr) {
            console.error('Failed to enqueue welcome email for Google user:', queueErr.message);
          }
        }

        return done(null, user);
      } catch (error) {
        console.error('Error during Google OAuth authentication:', error);
        return done(error, null);
      }
    }
  )
);

export default passport;
