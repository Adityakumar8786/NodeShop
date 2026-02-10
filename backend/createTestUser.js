import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import User from './models/User.js'; // No bcrypt import needed

const createTestUser = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    await User.deleteOne({ email: 'test@test.com' });
    console.log('🗑️ Deleted old test user');

    const testUser = new User({
      name: 'Test User',
      email: 'test@test.com',
      password: 'password123', // Plain text—model will hash it
      role: 'Customer',
      phone: '9999999999',
      address: {
        street: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        zipCode: '12345',
        country: 'India',
      },
    });

    await testUser.save(); // Model hook hashes here
    
    console.log('✅ Test user created successfully!');
    console.log('📧 Email: test@test.com');
    console.log('🔐 Password: password123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

createTestUser();

async function checkUser() {
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOne({ email: 'test@test.com' });
  console.log(user ? 'User found:' : 'User not found');
  if (user) console.log('Stored hash:', user.password); // Should be ~60 chars starting with $2b$10$...
  process.exit(0);
}

checkUser();