require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../src/models/User');
const { mongoUri } = require('../src/config/env');

async function seedAdmin() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_PHONE } = process.env;
  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD must be set in .env');
  }
  if (ADMIN_PASSWORD.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters');
  }

  await mongoose.connect(mongoUri);
  const email = ADMIN_EMAIL.trim().toLowerCase();
  let user = await User.findOne({ email }).select('+password');

  if (user) {
    user.name = ADMIN_NAME;
    user.role = 'Admin';
    user.isActive = true;
    if (ADMIN_PHONE) user.phone = ADMIN_PHONE;
    user.password = ADMIN_PASSWORD;
    await user.save();
    console.log(`Admin account updated: ${email}`);
  } else {
    await User.create({
      name: ADMIN_NAME,
      email,
      password: ADMIN_PASSWORD,
      role: 'Admin',
      phone: ADMIN_PHONE
    });
    console.log(`Admin account created: ${email}`);
  }
}

seedAdmin()
  .catch((error) => {
    console.error(`Admin migration failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });