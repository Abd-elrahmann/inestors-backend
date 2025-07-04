const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./src/models/User');
const dotenv = require('dotenv');

dotenv.config();

async function resetAdminPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/investors-system');
    console.log('✅ Connected to MongoDB');

    // Find admin user
    const admin = await User.findOne({ role: 'admin' });
    
    if (!admin) {
      console.log('❌ No admin user found');
      return;
    }

    // New password
    const newPassword = 'admin123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password directly using findByIdAndUpdate to avoid validation
    await User.findByIdAndUpdate(admin._id, {
      password: hashedPassword,
      updatedAt: new Date()
    }, { runValidators: false });

    console.log('✅ Admin password updated successfully!');
    console.log('==========================================');
    console.log('Username:', admin.username);
    console.log('New Password: admin123');
    console.log('Full Name:', admin.fullName);
    console.log('Email:', admin.email);
    console.log('==========================================');
    console.log('🚀 You can now login with these credentials!');

  } catch (error) {
    console.error('❌ Error updating password:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
}

resetAdminPassword(); 