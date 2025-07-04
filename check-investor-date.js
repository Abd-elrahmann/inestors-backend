require('dotenv').config();
const mongoose = require('mongoose');
const Investor = require('./src/models/Investor');
const connectDB = require('./src/config/db');

async function checkInvestorDate() {
  try {
    // Connect to database
    await connectDB();
    console.log('Connected to MongoDB...');

    // Find Ahmed's record
    const investor = await Investor.findOne({ fullName: 'Abdelrahman' });
    
    if (!investor) {
      console.log('❌ لم يتم العثور على المساهم');
      return;
    }

    console.log('Investor details:');
    console.log('Name:', investor.fullName);
    console.log('Start Date:', investor.startDate);
    console.log('Start Date (formatted):', new Date(investor.startDate).toLocaleString());
    
    investor.startDate = new Date('2025-06-26');
    await investor.save();
    console.log(`📅 تم تحديث تاريخ الانضمام إلى: ${investor.startDate}`);
    
    mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ خطأ:', err);
    mongoose.disconnect();
    process.exit(1);
  }
}

checkInvestorDate(); 