import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import config from './config.js';
import { findUserRepo } from '../repositories/auth.repository.js';

passport.use(
  new GoogleStrategy(
    {
      clientID: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
      callbackURL: '/api/auth/google/callback',
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase();
        const name = profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim() || 'Google User';
        const profilePhoto = profile.photos?.[0]?.value || null;

        if (!email) {
          return done(new Error('No email found in Google profile'), null);
        }

        // Check if user with this email already exists in database
        const existingUser = await findUserRepo(email);

        if (existingUser) {
          // Existing user -> Log in immediately regardless of where the button was clicked
          return done(null, {
            isNew: false,
            user: existingUser,
          });
        }

        // New user -> Do not create partial record yet; pass Google profile for onboarding
        return done(null, {
          isNew: true,
          googleProfile: {
            name,
            email,
            avatar: profilePhoto,
          },
        });
      } catch (error) {
        console.error('Error during Google OAuth authentication:', error);
        return done(error, null);
      }
    }
  )
);

export default passport;
