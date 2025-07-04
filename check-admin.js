const mongoose = require('mongoose');
const User = require('./src/models/User');
const dotenv = require('dotenv');

dotenv.config();

async function checkAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/investors-system');
    console.log('✅ Connected to MongoDB');

    const admin = await User.findOne({ role: 'admin' });
    
    if (admin) {
      console.log('✅ Admin user found:');
      console.log('==========================================');
      console.log('Username:', admin.username);
      console.log('Full Name:', admin.fullName);
      console.log('Email:', admin.email);
      console.log('Role:', admin.role);
      console.log('Active:', admin.isActive);
      console.log('==========================================');
      console.log('Use this username with the password you set');
      console.log('(If you forgot the password, you can reset it)');
    } else {
      console.log('❌ No admin user found');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkAdmin(); 