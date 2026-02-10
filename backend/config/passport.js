import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        console.log('🔍 Passport: Looking for user:', email); // DEBUG
        
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
          console.log('❌ Passport: User not found'); // DEBUG
          return done(null, false, { message: 'Invalid email or password' });
        }

        console.log('✅ Passport: User found:', user.email); // DEBUG
        console.log('🔐 Passport: Comparing passwords...'); // DEBUG
        
        const isMatch = await bcrypt.compare(password, user.password);
        
        console.log('🔐 Passport: Password match:', isMatch); // DEBUG
        
        if (!isMatch) {
          console.log('❌ Passport: Invalid password'); // DEBUG
          return done(null, false, { message: 'Invalid email or password' });
        }

        console.log('✅ Passport: Authentication successful'); // DEBUG
        return done(null, user);
      } catch (error) {
        console.error('❌ Passport error:', error); // DEBUG
        return done(error);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});