import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import config from './config.js';
import {
  findUserRepo,
  createUserRepo,
  registerCompanyWithPrimaryUserRepo,
  registerEmployeeUnderCompanyRepo
} from '../repositories/auth.repository.js';
import { addWelcomeEmailJob } from '../jobs/emailQueue.js';

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

        let user = await findUserRepo(email);

        // Parse optional registration state passed during OAuth initiation (e.g. company details or company_id)
        let stateData = null;
        if (req.query && req.query.state) {
          try {
            const decodedState = Buffer.from(req.query.state, 'base64').toString('utf-8');
            stateData = JSON.parse(decodedState);
          } catch (e) {
            console.warn('Failed to parse OAuth state data:', e.message);
          }
        }

        if (!user) {
          if (stateData && stateData.register_type === 'company' && stateData.company_name) {
            // Register new company with Google user as primary contact
            user = await registerCompanyWithPrimaryUserRepo({
              company: {
                company_name: stateData.company_name,
                gst_number: stateData.gst_number || null,
                email: email,
                phone: stateData.mobile || null,
                billing_address: stateData.billing_address || null,
                shipping_address: stateData.shipping_address || null,
              },
              user: {
                name,
                email,
                password_hash: '',
                mobile: stateData.mobile || null,
              },
            });
          } else if (stateData && stateData.register_type === 'employee' && stateData.company_id) {
            // Register as employee under existing company
            user = await registerEmployeeUnderCompanyRepo({
              company_id: Number(stateData.company_id),
              user: {
                name,
                email,
                password_hash: '',
                mobile: stateData.mobile || null,
              },
              role: 'customer',
            });
          } else {
            // Basic user creation
            user = await createUserRepo({
              name,
              email,
              password_hash: '',
              mobile: stateData?.mobile || null,
              role: 'customer',
              is_active: true,
            });
          }

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
